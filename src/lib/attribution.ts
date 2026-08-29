/**
 * First-touch attribution for public business websites.
 *
 * A visitor can arrive from a QR code or campaign link and submit a form
 * several pages later, so the campaign is captured once on arrival and reused
 * for every submission in that browser session. Without this, leads were
 * always stored as `source: "website"` and campaign attribution was lost.
 */

const KEY = "revora.attribution";

export type Attribution = {
  source: string;
  campaign: string | null;
  landingPath: string | null;
};

function safeRead(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Attribution>;
    if (!parsed || typeof parsed.source !== "string") return null;
    return {
      source: parsed.source,
      campaign: typeof parsed.campaign === "string" ? parsed.campaign : null,
      landingPath: typeof parsed.landingPath === "string" ? parsed.landingPath : null,
    };
  } catch {
    return null;
  }
}

/** Records the campaign that brought this visitor in, only the first time. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") {
    return { source: "website", campaign: null, landingPath: null };
  }
  const existing = safeRead();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") ?? params.get("source");
  const campaign = params.get("utm_campaign") ?? params.get("c");
  const referrer = document.referrer && !document.referrer.includes(window.location.host);

  const attribution: Attribution = {
    source: (utmSource || (referrer ? "referral" : "direct")).slice(0, 60),
    campaign: campaign ? campaign.slice(0, 60) : null,
    landingPath: window.location.pathname,
  };

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(attribution));
  } catch {
    /* private-mode browsers simply lose attribution */
  }
  return attribution;
}

/** Reads the stored campaign for a form submission. */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") {
    return { source: "website", campaign: null, landingPath: null };
  }
  return safeRead() ?? captureAttribution();
}
