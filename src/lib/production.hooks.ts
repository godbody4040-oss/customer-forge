import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/user-error";
import {
  activateProduction,
  checkProductionReadiness,
  getProductionStatus,
  type ActivationResult,
  type ProductionReadiness,
  type ProductionStatus,
} from "@/lib/production.functions";

/** Sandbox/production state for this workspace, read from the server. */
export function useProductionStatus(organizationId: string | undefined) {
  return useQuery<ProductionStatus>({
    queryKey: ["production-status", organizationId],
    enabled: !!organizationId,
    staleTime: 30_000,
    queryFn: () => getProductionStatus({ data: { organizationId: organizationId! } }),
  });
}

/** Deployment readiness — recomputed server-side from live workspace data. */
export function useProductionReadiness(organizationId: string | undefined) {
  return useQuery<ProductionReadiness>({
    queryKey: ["production-readiness", organizationId],
    enabled: !!organizationId,
    staleTime: 15_000,
    queryFn: () => checkProductionReadiness({ data: { organizationId: organizationId! } }),
  });
}

/**
 * One launch path for every publish button in the builder. The server decides:
 * locked → the activation modal opens, not-ready → the blockers are shown,
 * ready → the existing project goes live as a new production version.
 */
export function useLaunchFlow(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  const [lockedOpen, setLockedOpen] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);

  const mutation = useMutation<ActivationResult>({
    mutationFn: () => activateProduction({ data: { organizationId: organizationId! } }),
    onSuccess: (data) => {
      setResult(data);
      if (data.activated) {
        toast.success("Your website is live.");
        setLockedOpen(false);
      } else if (!data.readiness.unlocked) {
        setLockedOpen(true);
      } else {
        toast.error(data.reason);
      }
      void queryClient.invalidateQueries({ queryKey: ["website_settings"] });
      void queryClient.invalidateQueries({ queryKey: ["production-status"] });
      void queryClient.invalidateQueries({ queryKey: ["production-readiness"] });
      void queryClient.invalidateQueries({ queryKey: ["website_versions"] });
    },
    onError: (error: Error) => toast.error(friendlyError(error, "We couldn't take the website live.")),
  });

  const launch = useCallback(() => {
    if (!organizationId) return;
    mutation.mutate();
  }, [mutation, organizationId]);

  return {
    launch,
    isLaunching: mutation.isPending,
    lockedOpen,
    openLocked: () => setLockedOpen(true),
    closeLocked: () => setLockedOpen(false),
    result,
  };
}
