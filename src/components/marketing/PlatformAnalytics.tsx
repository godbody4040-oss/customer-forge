/**
 * Platform traffic tracking for revoragrowthsystems.com.
 *
 * Two independent layers, so a blocked third-party script never leaves Revora
 * blind:
 *  1. First-party — every public page view is written to `marketing_conversions`
 *     with first-touch attribution, and shows up in Admin → Overview.
 *  2. Google Analytics 4 — loaded only when a real measurement ID has been saved
 *     in Admin → Analytics.
 *
 * Private surfaces (`/app`, `/admin`, `/api`, tenant preview paths) are never
 * tracked: they are not marketing traffic and tenant paths must not leak into
 * platform reporting.
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";
import { trackConversion } from "@/lib/conversion";
import { isValidMeasurementId, loadGa4 } from "@/lib/ga4";

const PRIVATE_PREFIXES = ["/app", "/admin", "/api", "/s/", "/p/", "/auth"];

const isPublicMarketingPath = (path: string) =>
  !PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));

export function PlatformAnalytics() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const lastTracked = useRef<string | null>(null);

  // Load the configured GA4 property once per browser session.
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("platform_settings")
      .select("ga_measurement_id")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        const id = data?.ga_measurement_id;
        if (!cancelled && isValidMeasurementId(id)) loadGa4(id);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One page_view per navigation, including client-side route changes.
  useEffect(() => {
    if (!isPublicMarketingPath(path)) return;
    if (lastTracked.current === path) return;
    lastTracked.current = path;
    trackConversion("page_view", { metadata: { path: path.slice(0, 120) } });
    if (path === "/portal") trackConversion("portal_view");
  }, [path]);

  return null;
}
