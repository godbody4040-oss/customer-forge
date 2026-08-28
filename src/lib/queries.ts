import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentStatus, LeadStatus } from "@/lib/domain";

const DAY = 86_400_000;

export function useLeads(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["leads", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, name, email, phone, status, source, campaign, city, message, service_interest, estimated_value, next_follow_up_at, last_contacted_at, created_at, service_id",
        )
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAppointments(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["appointments", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, name, email, phone, starts_at, ends_at, status, notes, service_id, lead_id")
        .eq("organization_id", organizationId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useServices(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["services", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useAnalytics(organizationId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["analytics", organizationId, days],
    enabled: !!organizationId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * DAY).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type, source, campaign, device, path, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });
}

export function useBusinessProfile(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["business_profile", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWebsiteSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["website_settings", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useReviews(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useNotifications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["customers", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTeam(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["team", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, created_at, user_id, profiles(full_name, email, avatar_url)")
        .eq("organization_id", organizationId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useQuoteRequests(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["quote_requests", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, answers, estimate_min, estimate_max, created_at, lead_id, leads(name, email, phone)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/* ---------------------------------- mutations --------------------------------- */

function useInvalidate(keys: string[], organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key, organizationId] })));
}

export function useUpdateLead(organizationId: string | undefined) {
  const invalidate = useInvalidate(["leads"], organizationId);
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        status?: LeadStatus;
        estimated_value?: number;
        next_follow_up_at?: string | null;
        last_contacted_at?: string | null;
        notes?: string | null;
      };
    }) => {
      const { error } = await supabase.from("leads").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't update that lead."),
  });
}

export function useCreateLead(organizationId: string | undefined) {
  const invalidate = useInvalidate(["leads"], organizationId);
  return useMutation({
    mutationFn: async (lead: {
      name: string;
      email?: string | undefined;
      phone?: string | undefined;
      source?: string | undefined;
      service_interest?: string | undefined;
      estimated_value?: number | undefined;
      message?: string | undefined;
    }) => {
      const { error } = await supabase
        .from("leads")
        .insert({ ...lead, organization_id: organizationId!, status: "new" } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead added.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't add that lead."),
  });
}

export function useUpdateAppointment(organizationId: string | undefined) {
  const invalidate = useInvalidate(["appointments"], organizationId);
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't update that appointment."),
  });
}

export function useSaveService(organizationId: string | undefined) {
  const invalidate = useInvalidate(["services"], organizationId);
  return useMutation({
    mutationFn: async (service: {
      id?: string | undefined;
      name: string;
      description?: string | null | undefined;
      category?: string | null | undefined;
      price?: number | null | undefined;
      starting_price?: number | null | undefined;
      duration_minutes?: number | null | undefined;
      bookable?: boolean | undefined;
      featured?: boolean | undefined;
      is_active?: boolean | undefined;
      sort_order?: number | undefined;
    }) => {
      if (service.id) {
        const { id, ...patch } = service;
        const { error } = await supabase.from("services").update(patch as never).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("services")
          .insert({ ...service, organization_id: organizationId! } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Service saved.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't save that service."),
  });
}

export function useDeleteService(organizationId: string | undefined) {
  const invalidate = useInvalidate(["services"], organizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service removed.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't remove that service."),
  });
}

export function useSaveBusinessProfile(organizationId: string | undefined) {
  const invalidate = useInvalidate(["business_profile"], organizationId);
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("business_profiles")
        .upsert({ organization_id: organizationId!, ...patch } as never, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business details saved.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't save your details."),
  });
}

export function useSaveWebsiteSettings(organizationId: string | undefined) {
  const invalidate = useInvalidate(["website_settings"], organizationId);
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("website_settings")
        .upsert({ organization_id: organizationId!, ...patch } as never, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Website updated.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't update your website."),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("organizations").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't save that change."),
  });
}
