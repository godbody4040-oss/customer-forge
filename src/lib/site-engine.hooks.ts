import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { aiEditSiteCopy, runSiteGeneration } from "@/lib/site-engine.functions";

/** Latest build job for the workspace; polls while a build is running. */
export function useLatestGenerationJob(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["generation_job", organizationId],
    enabled: !!organizationId,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      return status === "processing" || status === "queued" ? 1200 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRunSiteEngine(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  const run = useServerFn(runSiteGeneration);
  return useMutation({
    mutationFn: async () => run({ data: { organizationId: organizationId! } }),
    onMutate: () => {
      void queryClient.invalidateQueries({ queryKey: ["generation_job", organizationId] });
    },
    onSuccess: () => {
      toast.success("Your website is ready to review.");
      void queryClient.invalidateQueries({ queryKey: ["generation_job", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["website_settings"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => {
      void queryClient.invalidateQueries({ queryKey: ["generation_job", organizationId] });
      toast.error(error.message || "The build failed. You can retry.");
    },
  });
}

export function useAiCopyEdit(organizationId: string | undefined) {
  const edit = useServerFn(aiEditSiteCopy);
  return useMutation({
    mutationFn: async (vars: { instruction: string; fields: Record<string, string> }) =>
      edit({ data: { organizationId: organizationId!, ...vars } }),
    onError: (error: Error) => toast.error(error.message || "Couldn't rewrite that copy."),
  });
}

/* ------------------------------- versions ------------------------------- */

export function useWebsiteVersions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["website_versions", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_versions")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Snapshots the current draft as the next published version. */
export function useSnapshotWebsiteVersion(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label?: string) => {
      const orgId = organizationId!;
      const [{ data: settings }, { data: last }] = await Promise.all([
        supabase.from("website_settings").select("*").eq("organization_id", orgId).maybeSingle(),
        supabase
          .from("website_versions")
          .select("version")
          .eq("organization_id", orgId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!settings) throw new Error("There's no website to snapshot yet.");
      const version = Number(last?.version ?? 0) + 1;
      const { error } = await supabase.from("website_versions").insert({
        organization_id: orgId,
        version,
        label: label ?? `Version ${version}`,
        template: settings.template,
        generation: settings.generation as never,
        seo: settings.seo as never,
        pages: settings.pages as never,
        published_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      });
      if (error) throw error;
      return version;
    },
    onSuccess: (version) => {
      toast.success(`Saved as version ${version}.`);
      void queryClient.invalidateQueries({ queryKey: ["website_versions", organizationId] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't save this version."),
  });
}

/** Restores a previous version into the working draft. Nothing is destroyed. */
export function useRestoreWebsiteVersion(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const orgId = organizationId!;
      const { data: snapshot, error: readError } = await supabase
        .from("website_versions")
        .select("*")
        .eq("id", versionId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (readError) throw readError;
      if (!snapshot) throw new Error("That version is no longer available.");

      const { error } = await supabase.from("website_settings").upsert(
        {
          organization_id: orgId,
          template: snapshot.template ?? "default",
          generation: snapshot.generation as never,
          seo: snapshot.seo as never,
          pages: snapshot.pages as never,
          review_state: "ready_for_review",
          publish_state: "preview",
        } as never,
        { onConflict: "organization_id" },
      );
      if (error) throw error;
      return snapshot.version;
    },
    onSuccess: (version) => {
      toast.success(`Version ${version} restored into your draft. Review, then publish.`);
      void queryClient.invalidateQueries({ queryKey: ["website_settings"] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't restore that version."),
  });
}

/* --------------------------- score / recommendations --------------------------- */

/** Counts behind the Revora Website Score, read in one pass. */
export function useScoreFacts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["score_facts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const orgId = organizationId!;
      const [services, media, reviews, social, forms, events] = await Promise.all([
        supabase.from("services").select("price, starting_price, bookable").eq("organization_id", orgId).eq("is_active", true),
        supabase.from("media").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("social_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
        supabase.from("quote_forms").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
        supabase
          .from("analytics_events")
          .select("event_type")
          .eq("organization_id", orgId)
          .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
          .limit(20000),
      ]);

      const rows = services.data ?? [];
      const s = (social.data ?? {}) as Record<string, unknown>;
      const socialLinks = ["instagram", "facebook", "tiktok", "youtube", "google_business", "linkedin"].filter(
        (k) => typeof s[k] === "string" && String(s[k]).trim(),
      ).length;
      const eventRows = events.data ?? [];
      const countOf = (type: string) => eventRows.filter((e) => e.event_type === type).length;

      return {
        servicesCount: rows.length,
        pricedServicesCount: rows.filter((r) => r.price != null || r.starting_price != null).length,
        bookableCount: rows.filter((r) => r.bookable).length,
        mediaCount: media.count ?? 0,
        reviewCount: reviews.count ?? 0,
        socialLinks,
        quoteFormCount: forms.count ?? 0,
        signals: {
          visitors: countOf("page_view"),
          leads: countOf("lead_submit") + countOf("quote_submit"),
          bookings: countOf("booking_submit"),
          callClicks: countOf("call_click"),
          formViews: countOf("form_view"),
        },
      };
    },
  });
}
