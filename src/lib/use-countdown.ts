/**
 * Live countdown primitives for the per-workspace free-access trial.
 *
 * The countdown is derived from the workspace's own `trial_ends_at` timestamp
 * stored in the database, so it is real, tied to that single client, and keeps
 * running while the client is away from the site — closing the tab does not
 * pause or restart anything. Each render tick simply re-reads the wall clock.
 */
import { useEffect, useState } from "react";

/** Current time in ms, re-rendering every `intervalMs` while mounted. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    // Coming back from a background tab / locked phone must not show a stale
    // clock, so re-read immediately on focus and visibility changes.
    const sync = () => setNow(Date.now());
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [intervalMs]);
  return now;
}

export type Countdown = {
  /** Milliseconds left; 0 once expired. */
  msLeft: number;
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** e.g. "2d 03:14:07" or "03:14:07" in the final day. */
  label: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Breaks a remaining duration into display parts. */
export function countdownParts(endMs: number | null, now: number): Countdown | null {
  if (endMs === null || !Number.isFinite(endMs)) return null;
  const msLeft = Math.max(0, endMs - now);
  const total = Math.floor(msLeft / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return {
    msLeft,
    expired: msLeft <= 0,
    days,
    hours,
    minutes,
    seconds,
    label: days > 0 ? `${days}d ${clock}` : clock,
  };
}

/** Live countdown to `endMs` (ms epoch), ticking every second. */
export function useCountdown(endMs: number | null): Countdown | null {
  const now = useNow(1000);
  return countdownParts(endMs, now);
}
