import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditLiveSite } from "@/lib/site-audit.functions";
import type { UpgradeProposal } from "@/lib/auto-upgrade";
import { runSiteGeneration } from "@/lib/site-engine.functions";

/** Runs the live-page audit on demand (never on page load — it fetches pages). */
export function useLiveAudit(organizationId: string | undefined) {
  const run = useServerFn(auditLiveSite);
  return useMutation({
    mutationFn: async () => run({ data: { organizationId: organizationId! } }),
    onError: (error: Error) => toast.error(error.message || "Couldn't scan your live pages."),
  });
}

export type AppliedUpgrade = {
  proposalId: string;
  title: string;
  /** Version snapshot taken before the change, used for one-click rollback. */
  versionId: string | null;
  version: number | null;
  appliedAt: string;
};

/** The restore point Revora saves before every applied upgrade. */
async function snapshotForRollback(orgId: string, label: string) {
  const [{ data: settings }, { data: last }, pages, sections] = await Promise.all([
    supabase.from("website_settings").select("*").eq("organization_id", orgId).maybeSingle(),
    supabase
      .from("website_versions")
      .select("version")
      .eq("organization_id", orgId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("website_pages").select("id, slug, title, kind, seo_title, seo_description").eq("organization_id", orgId),
    supabase
      .from("website_sections")
      .select("id, page_id, kind, heading, subheading, body, sort_order, is_visible")
      .eq("organization_id", orgId),
  ]);
  if (!settings) return { versionId: null, version: null };
  const version = Number(last?.version ?? 0) + 1;
  const content = {
    pages: (pages.data ?? []).map((page) => ({
      ...page,
      sections: (sections.data ?? []).filter((section) => section.page_id === page.id),
    })),
  };
  const { data, error } = await supabase
    .from("website_versions")
    .insert({
      organization_id: orgId,
      version,
      label,
      template: settings.template,
      generation: settings.generation as never,
      seo: settings.seo as never,
      pages: { settings_pages: settings.pages ?? null, content } as never,
      published_at: new Date().toISOString(),
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select("id, version")
    .maybeSingle();
  if (error) throw error;
  return { versionId: data?.id ?? null, version: data?.version ?? version };
}

/**
 * Applies an approved upgrade.
 *
 * Order is always: snapshot → apply → report the restore point. Nothing is
 * deleted, and the caller can undo with `useUndoUpgrade`.
 */
export function useApplyUpgrade(organizationId: string | undefined, currentSeo: Record<string, unknown>) {
  const queryClient = useQueryClient();
  const runEngine = useServerFn(runSiteGeneration);

  return useMutation({
    mutationFn: async (proposal: UpgradeProposal): Promise<AppliedUpgrade> => {
      const orgId = organizationId!;
      if (!proposal.applyable) throw new Error(proposal.needs ?? "This upgrade can't be applied automatically yet.");

      const restore = await snapshotForRollback(orgId, `Before: ${proposal.title}`);

      const saveSettings = async (patch: Record<string, unknown>) => {
        const { error } = await supabase
          .from("website_settings")
          .upsert({ organization_id: orgId, ...patch } as never, { onConflict: "organization_id" });
        if (error) throw error;
      };

      if (proposal.kind === "apply_meta") {
        const seo = { ...currentSeo };
        for (const change of proposal.changes) {
          if (change.label.includes("headline")) seo["headline"] = change.after;
          if (change.label.includes("description")) seo["meta_description"] = change.after;
        }
        await saveSettings({ seo });
      } else if (proposal.kind === "apply_cta") {
        await saveSettings({ seo: { ...currentSeo, primary_cta_label: proposal.changes[0]?.after ?? null } });
      } else if (proposal.kind === "publish_site") {
        await saveSettings({
          publish_state: "published",
          published: true,
          last_published_at: new Date().toISOString(),
        });
      } else if (proposal.kind === "page_seo" || proposal.kind === "page_index") {
        const { error } = await supabase
          .from("website_pages")
          .update((proposal.seoPatch ?? {}) as never)
          .eq("id", proposal.pageId!)
          .eq("organization_id", orgId);
        if (error) throw error;
      } else if (
        proposal.kind === "add_cta_section" ||
        proposal.kind === "add_capture_section" ||
        proposal.kind === "add_faq_section"
      ) {
        let pageId = proposal.pageId ?? null;
        if (!pageId) {
          const { data: home } = await supabase
            .from("website_pages")
            .select("id")
            .eq("organization_id", orgId)
            .order("sort_order")
            .limit(1)
            .maybeSingle();
          pageId = home?.id ?? null;
        }
        if (!pageId) throw new Error("There are no pages to add a section to yet.");
        const { data: last } = await supabase
          .from("website_sections")
          .select("sort_order")
          .eq("organization_id", orgId)
          .eq("page_id", pageId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { error } = await supabase.from("website_sections").insert({
          organization_id: orgId,
          page_id: pageId,
          kind: proposal.sectionKind ?? "cta",
          sort_order: Number(last?.sort_order ?? 0) + 1,
        } as never);
        if (error) throw error;
      } else if (proposal.kind === "rebuild_site") {
        await runEngine({ data: { organizationId: orgId } });
      }

      return {
        proposalId: proposal.id,
        title: proposal.title,
        versionId: restore.versionId,
        version: restore.version,
        appliedAt: new Date().toISOString(),
      };
    },
    onSuccess: (applied) => {
      toast.success(`Applied: ${applied.title}`, {
        description: applied.version ? `Saved version ${applied.version} first — you can undo this.` : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: ["website_settings"] });
      void queryClient.invalidateQueries({ queryKey: ["website_content", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["website_versions", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["score_facts", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["generation_job", organizationId] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't apply that upgrade."),
  });
}

/** Restores the snapshot taken before an upgrade. */
export function useUndoUpgrade(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applied: AppliedUpgrade) => {
      if (!applied.versionId) throw new Error("There's no restore point for that change.");
      const orgId = organizationId!;
      const { data: snapshot, error } = await supabase
        .from("website_versions")
        .select("*")
        .eq("id", applied.versionId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      if (!snapshot) throw new Error("That restore point is no longer available.");
      const stored = snapshot.pages as { settings_pages?: unknown } | null;
      const settingsPages =
        stored && typeof stored === "object" && "settings_pages" in stored ? stored.settings_pages : snapshot.pages;
      const { error: writeError } = await supabase.from("website_settings").upsert(
        {
          organization_id: orgId,
          template: snapshot.template ?? "default",
          generation: snapshot.generation as never,
          seo: snapshot.seo as never,
          pages: settingsPages as never,
        } as never,
        { onConflict: "organization_id" },
      );
      if (writeError) throw writeError;
      return snapshot.version;
    },
    onSuccess: (version) => {
      toast.success(`Rolled back to version ${version}.`);
      void queryClient.invalidateQueries({ queryKey: ["website_settings"] });
      void queryClient.invalidateQueries({ queryKey: ["website_content", organizationId] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't roll that change back."),
  });
}

/** History of restore points, so the owner can always get back. */
export function useRestorePoints(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["website_versions", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_versions")
        .select("id, version, label, created_at")
        .eq("organization_id", organizationId!)
        .order("version", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}
