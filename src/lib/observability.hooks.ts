/**
 * Loads the real activity feed for a workspace. Kept short-lived because builds
 * and follow-ups move while the owner is watching.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActivityFeed, type ActivityFeed } from "@/lib/observability.functions";

export function useActivityFeed(organizationId: string | undefined) {
  const load = useServerFn(getActivityFeed);
  return useQuery<ActivityFeed>({
    queryKey: ["activity-feed", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: () => load({ data: { organizationId: organizationId! } }),
  });
}
