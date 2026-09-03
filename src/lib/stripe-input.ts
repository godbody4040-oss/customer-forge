import type { StripeEnv } from "@/lib/stripe.server";

export const parseWorkspaceId = (value: unknown) => {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid workspace");
  return id;
};

export const parseStripeEnvironment = (value: unknown): StripeEnv => {
  if (value === "sandbox" || value === "live") return value;
  throw new Error("Invalid payment environment");
};

export const cleanText = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

/**
 * Hosts a Stripe checkout session is allowed to return a paying customer to.
 * A checkout return_url is a browser-supplied value, so without this an
 * attacker could send a real customer back to a look-alike host after paying.
 */
const PROJECT_ID = "d1d9f16a-c60a-4c57-9b56-1e1bb309adf2";

/**
 * Exact production and development origins only. Wildcards over
 * `*.lovable.app` were removed: any other project on that domain could
 * otherwise receive a paying Revora customer after checkout.
 */
const ALLOWED_RETURN_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "revoragrowthsystems.com",
  "www.revoragrowthsystems.com",
  "customer-forge.lovable.app",
  `id-preview--${PROJECT_ID}.lovable.app`,
  `preview--${PROJECT_ID}.lovable.app`,
  `project--${PROJECT_ID}.lovable.app`,
  `project--${PROJECT_ID}-dev.lovable.app`,
]);

const isAllowedReturnHost = (host: string) => ALLOWED_RETURN_HOSTS.has(host);

export const parseReturnUrl = (value: unknown) => {
  const raw = cleanText(value, 500);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid return URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Invalid return URL");
  }
  if (!isAllowedReturnHost(url.hostname)) throw new Error("Invalid return URL");
  return raw;
};
