/**
 * Browser-safe helpers for the client-facing Domain Center.
 *
 * Two jobs: help a business owner find and buy a domain name, and help them
 * point a domain they already own at their Revora website. Nothing here talks
 * to the database — availability checks and DNS verification are server work.
 */

export const DOMAIN_IP = "185.158.133.1";

export const SUGGESTION_TLDS = [".com", ".co", ".net", ".services", ".pro"] as const;

/** Where owners can register a name. Links open a pre-filled search. */
export const REGISTRARS: { id: string; name: string; note: string; search: (domain: string) => string }[] = [
  {
    id: "cloudflare",
    name: "Cloudflare Registrar",
    note: "At-cost pricing, no upsells. Best value if you're comfortable with DNS.",
    search: (d) => `https://domains.cloudflare.com/?domain=${encodeURIComponent(d)}`,
  },
  {
    id: "porkbun",
    name: "Porkbun",
    note: "Cheap renewals, free WHOIS privacy, simple DNS screens.",
    search: (d) => `https://porkbun.com/checkout/search?q=${encodeURIComponent(d)}`,
  },
  {
    id: "namecheap",
    name: "Namecheap",
    note: "Popular and beginner-friendly with 24/7 chat support.",
    search: (d) => `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}`,
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    note: "The most familiar name. Watch for add-ons at checkout.",
    search: (d) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d)}`,
  },
];

/** Registrar-specific pointers for where the DNS screen lives. */
export const DNS_HELP: { registrar: string; where: string }[] = [
  { registrar: "Cloudflare", where: "Websites → your domain → DNS → Records → Add record" },
  { registrar: "Porkbun", where: "Domain Management → your domain → DNS → Add record" },
  { registrar: "Namecheap", where: "Domain List → Manage → Advanced DNS → Add New Record" },
  { registrar: "GoDaddy", where: "My Products → DNS → Add / edit records" },
  { registrar: "Squarespace / Google Domains", where: "Domains → your domain → DNS → Custom records" },
  { registrar: "Wix", where: "Domains → your domain → Advanced → Edit DNS" },
];

export function normalizeInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\s+/g, "");
}

export function looksLikeDomain(value: string) {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(value);
}

/** Compact word used to build candidate names. */
function stem(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\b(the|and|llc|inc|co|company|services|service)\b/g, "")
    .replace(/\s+/g, "");
}

/**
 * Candidate names built only from facts the owner already gave us — business
 * name, city and trade. No invented brand words.
 */
export function domainSuggestions(input: {
  businessName?: string | null | undefined;
  city?: string | null | undefined;
  industry?: string | null | undefined;
  slug?: string | null | undefined;
}): string[] {
  const name = stem(input.businessName) || stem(input.slug);
  const city = stem(input.city);
  const trade = stem(input.industry);

  const roots = new Set<string>();
  if (name) roots.add(name);
  if (name && city) roots.add(`${name}${city}`);
  if (name && trade && !name.includes(trade)) roots.add(`${name}${trade}`);
  if (trade && city) roots.add(`${city}${trade}`);
  if (trade && city) roots.add(`${trade}${city}`);
  if (name) roots.add(`${name}pro`);
  if (name) roots.add(`get${name}`);

  const out: string[] = [];
  for (const root of roots) {
    if (root.length < 3 || root.length > 40) continue;
    for (const tld of SUGGESTION_TLDS) {
      const candidate = `${root}${tld}`;
      if (!out.includes(candidate)) out.push(candidate);
      if (out.length >= 20) break;
    }
    if (out.length >= 20) break;
  }
  return out;
}

export type DnsRecordRow = { type: string; name: string; value: string; ttl: string; why: string };

/** Exactly what the owner types into their registrar's DNS screen. */
export function dnsRows(domain: string): DnsRecordRow[] {
  return [
    {
      type: "A",
      name: "@",
      value: DOMAIN_IP,
      ttl: "Automatic",
      why: `Sends ${domain || "your domain"} to your Revora website`,
    },
    {
      type: "A",
      name: "www",
      value: DOMAIN_IP,
      ttl: "Automatic",
      why: `Makes www.${domain || "yourdomain.com"} work too`,
    },
  ];
}

export const DOMAIN_STEPS = [
  { id: "choose", title: "Choose your address", detail: "Buy a new name or use one you already own." },
  { id: "connect", title: "Save it in Revora", detail: "We store it and start watching your DNS." },
  { id: "dns", title: "Add two DNS records", detail: "Copy them into your registrar exactly as shown." },
  { id: "verify", title: "Verify and secure", detail: "We confirm DNS, then HTTPS is issued automatically." },
  { id: "live", title: "Go live", detail: "Publish your website and your domain serves it." },
] as const;
