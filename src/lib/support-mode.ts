/** Explicit, audited support mode: a super admin temporarily working inside a client workspace. */
import { useCallback, useEffect, useState } from "react";

export type SupportMode = {
  sessionId: string;
  organizationId: string;
  organizationName: string;
  reason: string;
  startedAt: string;
};

const KEY = "lle.support-mode";
const EVENT = "lle:support-mode";

export function readSupportMode(): SupportMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SupportMode) : null;
  } catch {
    return null;
  }
}

export function writeSupportMode(mode: SupportMode | null) {
  if (typeof window === "undefined") return;
  if (mode) window.sessionStorage.setItem(KEY, JSON.stringify(mode));
  else window.sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Reactive support-mode state (session-scoped, never persisted across browser sessions). */
export function useSupportMode() {
  const [mode, setMode] = useState<SupportMode | null>(null);

  useEffect(() => {
    const sync = () => setMode(readSupportMode());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const clear = useCallback(() => writeSupportMode(null), []);
  return { mode, clear };
}
