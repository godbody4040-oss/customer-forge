/**
 * Server-anchored trial countdown.
 *
 * `useTrialCountdown` ticks every second like a normal clock, but the elapsed
 * time is measured against the server's clock, not the device's. The offset is
 * measured once per session and re-measured whenever the client returns to the
 * tab, so the timer stays accurate while the client is away and cannot be
 * extended by changing the phone's date.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getServerTime } from "@/lib/server-clock.functions";
import { countdownParts, useNow, type Countdown } from "@/lib/use-countdown";

/** Milliseconds to add to `Date.now()` to get server time (0 until measured). */
export function useServerClockOffset(): number {
  const fetchTime = useServerFn(getServerTime);
  const { data } = useQuery({
    queryKey: ["server_clock"],
    queryFn: async () => {
      const sentAt = Date.now();
      const { now } = await fetchTime();
      // Split the round trip so the offset isn't biased by network latency.
      const roundTrip = Date.now() - sentAt;
      return now + roundTrip / 2 - Date.now();
    },
    // Re-measure when the client comes back to the tab, and hourly while open.
    refetchOnWindowFocus: true,
    refetchInterval: 3_600_000,
    staleTime: 60_000,
    retry: 1,
  });
  return Number.isFinite(data) ? (data as number) : 0;
}

/** Live countdown to `endMs`, measured on server time. */
export function useTrialCountdown(endMs: number | null): Countdown | null {
  const offset = useServerClockOffset();
  const now = useNow(1000);
  return countdownParts(endMs, now + offset);
}
