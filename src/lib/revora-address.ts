/**
 * The FREE REVORA ADDRESS.
 *
 * Every client website is included with a free address on Revora's own domain:
 *
 *   clientname.revoragrowthsystems.com
 *
 * It is handed out automatically, it is unique per organization, it never
 * expires, and it keeps working after a client connects a domain of their own.
 * A client never has to buy a domain before launching.
 *
 * Browser-safe: pure string work only. Uniqueness is enforced in the database
 * (unique index) and reserved names are rejected both here and by a database
 * constraint, so the two can never disagree.
 */

/**
 * Revora's own platform domain: dashboard, builder, billing, CRM. Client
 * websites are NEVER served from here.
 */
export const REVORA_ROOT = "revoragrowthsystems.com";

/**
 * The client website hosting domain. Every client website gets a free address
 * at `clientname.revoraweb.site`, kept completely separate from the platform
 * domain above so client traffic can never reach the dashboard host.
 */
export const SITE_ROOT = "revoraweb.site";

/** Roots whose subdomains are client website addresses (newest first). */
export const SITE_ROOTS = [SITE_ROOT, REVORA_ROOT];

/** Hosts that belong to Revora itself, never to a client site. */
export const REVORA_OWN_HOSTS = [
  REVORA_ROOT,
  `www.${REVORA_ROOT}`,
  SITE_ROOT,
  `www.${SITE_ROOT}`,
  "customer-forge.lovable.app",
];

/**
 * System / infrastructure names a client may never claim. Mirrors
 * `public.revora_reserved_subdomains()` in the database.
 */
export const RESERVED_SUBDOMAINS = [
  "www","app","apps","api","admin","administrator","auth","login","logout","signup","signin",
  "mail","email","smtp","imap","pop","webmail","mx","ns","ns1","ns2","dns","cdn","assets",
  "static","media","files","img","images","s","p","preview","staging","stage","test","dev",
  "demo","docs","doc","help","support","status","blog","news","shop","store","pay","payments",
  "billing","checkout","stripe","dashboard","portal","account","accounts","settings","security",
  "revora","revoragrowthsystems","growth","system","root","host","server","vpn","ftp","git",
  "internal","private","public","sitemap","robots","well-known","onboarding","invite",
];

export function normalizeSubdomain(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(
      new RegExp(`\\.(${SITE_ROOTS.map((root) => root.replace(/\./g, "\\.")).join("|")})$`),
      "",
    )
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export type AddressCheck = { ok: true; value: string } | { ok: false; error: string };

/** The same rules the database enforces, phrased for a business owner. */
export function validateSubdomain(value: string | null | undefined): AddressCheck {
  const clean = normalizeSubdomain(value);
  if (!clean) return { ok: false, error: "Enter an address, for example your business name." };
  if (clean.length < 3) return { ok: false, error: "Use at least 3 characters." };
  if (clean.length > 48) return { ok: false, error: "Use 48 characters or fewer." };
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(clean)) {
    return { ok: false, error: "Use letters, numbers and single hyphens only." };
  }
  if (RESERVED_SUBDOMAINS.includes(clean)) {
    return { ok: false, error: `"${clean}" is reserved by Revora. Pick a different address.` };
  }
  return { ok: true, value: clean };
}

/** `clientname.revoraweb.site` — the free client website address. */
export function revoraHost(subdomain: string | null | undefined) {
  const clean = normalizeSubdomain(subdomain);
  return clean ? `${clean}.${SITE_ROOT}` : null;
}

export function revoraUrl(subdomain: string | null | undefined) {
  const host = revoraHost(subdomain);
  return host ? `https://${host}` : null;
}

export function normalizeHost(host: string | null | undefined) {
  return String(host ?? "")
    .toLowerCase()
    .split(":")[0]!
    .replace(/\.$/, "");
}

/** Revora's marketing site, previews and local development are never tenants. */
export function isRevoraOwnHost(rawHost: string | null | undefined) {
  const host = normalizeHost(rawHost);
  if (!host) return true;
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;
  if (host.endsWith("lovable.app") || host.endsWith("lovableproject.com")) return true;
  return REVORA_OWN_HOSTS.includes(host);
}

/**
 * True when a host could belong to a client site: a Revora subdomain, or a
 * connected custom domain. Used to skip pointless lookups on Revora's own site.
 */
export function isPossibleTenantHost(rawHost: string | null | undefined) {
  return !isRevoraOwnHost(rawHost);
}

/**
 * The subdomain part of a client website address, or null for any other host.
 * Both the hosting domain and the older platform-domain addresses resolve, so
 * links handed out before the split keep working.
 */
export function revoraSubdomainFromHost(rawHost: string | null | undefined) {
  const host = normalizeHost(rawHost);
  for (const root of SITE_ROOTS) {
    const suffix = `.${root}`;
    if (!host.endsWith(suffix)) continue;
    const label = host.slice(0, -suffix.length);
    if (!label || label.includes(".")) continue;
    return label;
  }
  return null;
}

/**
 * A custom domain is only ever presented as active once DNS and HTTPS have both
 * been verified. Until then the free Revora address is the live address.
 */
export function customDomainIsLive(settings: {
  custom_domain?: string | null;
  dns_ok?: boolean | null;
  ssl_ok?: boolean | null;
}) {
  return !!settings.custom_domain && !!settings.dns_ok && !!settings.ssl_ok;
}

/**
 * The ALWAYS-WORKING client website address.
 *
 * Hostname addresses (a client's own domain, or `name.revoraweb.site`) each
 * need their own certificate on the hosting layer, so a hostname is only handed
 * out once a real DNS + HTTPS probe has confirmed it answers. Every published
 * client site is additionally, and permanently, reachable at a path on the
 * platform domain — that address needs no DNS, no certificate and no purchase,
 * which is what makes it safe to give a client on day one.
 */
export const PLATFORM_ORIGIN = `https://${REVORA_ROOT}`;

export function clientSitePath(orgSlug: string | null | undefined) {
  const slug = String(orgSlug ?? "").trim();
  return slug ? `/s/${slug}` : null;
}

export function clientSiteUrl(orgSlug: string | null | undefined) {
  const path = clientSitePath(orgSlug);
  return path ? `${PLATFORM_ORIGIN}${path}` : null;
}

/**
 * True once the free `name.revoraweb.site` address has been proven to resolve
 * AND serve HTTPS. Stored on the workspace by the live check, never assumed.
 */
export function revoraHostIsLive(settings: {
  subdomain?: string | null;
  revora_host_ok?: boolean | null;
}) {
  return !!settings.subdomain && !!settings.revora_host_ok;
}

/** The hostname visitors should use today, or null when none is verified yet. */
export function primaryAddress(settings: {
  custom_domain?: string | null;
  subdomain?: string | null;
  dns_ok?: boolean | null;
  ssl_ok?: boolean | null;
  revora_host_ok?: boolean | null;
}) {
  if (customDomainIsLive(settings)) return settings.custom_domain!;
  if (revoraHostIsLive(settings)) return revoraHost(settings.subdomain);
  return null;
}

/**
 * The single address to show a client: their verified hostname when one exists,
 * otherwise the platform path address that always works.
 */
export function liveAddressUrl(
  settings: {
    custom_domain?: string | null;
    subdomain?: string | null;
    dns_ok?: boolean | null;
    ssl_ok?: boolean | null;
    revora_host_ok?: boolean | null;
  },
  orgSlug: string | null | undefined,
) {
  const host = primaryAddress(settings);
  if (host) return { url: `https://${host}`, label: host, kind: "hostname" as const };
  const url = clientSiteUrl(orgSlug);
  return url
    ? { url, label: url.replace(/^https:\/\//, ""), kind: "path" as const }
    : { url: null, label: null, kind: "none" as const };
}
