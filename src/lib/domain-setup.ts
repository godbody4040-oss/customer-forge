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
export const REGISTRARS: {
  id: string;
  name: string;
  note: string;
  search: (domain: string) => string;
}[] = [
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
    search: (d) =>
      `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}`,
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    note: "The most familiar name. Watch for add-ons at checkout.",
    search: (d) =>
      `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d)}`,
  },
];

/** Registrar-specific pointers for where the DNS screen lives. */
export const DNS_HELP: { registrar: string; where: string }[] = [
  { registrar: "Cloudflare", where: "Websites → your domain → DNS → Records → Add record" },
  { registrar: "Porkbun", where: "Domain Management → your domain → DNS → Add record" },
  { registrar: "Namecheap", where: "Domain List → Manage → Advanced DNS → Add New Record" },
  { registrar: "GoDaddy", where: "My Products → DNS → Add / edit records" },
  {
    registrar: "Squarespace / Google Domains",
    where: "Domains → your domain → DNS → Custom records",
  },
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
  {
    id: "choose",
    title: "Choose your address",
    detail: "Buy a new name or use one you already own.",
  },
  { id: "connect", title: "Save it in Revora", detail: "We store it and start watching your DNS." },
  {
    id: "dns",
    title: "Add two DNS records",
    detail: "Copy them into your registrar exactly as shown.",
  },
  {
    id: "verify",
    title: "Verify and secure",
    detail: "We confirm DNS, then HTTPS is issued automatically.",
  },
  { id: "live", title: "Go live", detail: "Publish your website and your domain serves it." },
] as const;

/**
 * Registrar-specific, click-by-click instructions. Written for an owner who has
 * never touched DNS: exactly where to click and exactly what to type.
 */
export const REGISTRAR_GUIDES: {
  id: string;
  name: string;
  steps: string[];
}[] = [
  {
    id: "godaddy",
    name: "GoDaddy",
    steps: [
      "Sign in at godaddy.com and open My Products.",
      "Find your domain and click DNS (or Manage DNS).",
      "If an A record named @ already exists, click the pencil to edit it instead of adding a new one.",
      "Set Type A, Name @, Value 185.158.133.1, TTL 1 hour, then Save.",
      "Click Add, choose Type A, Name www, Value 185.158.133.1, then Save.",
      "Delete any other A record or CNAME for @ or www — two answers keep the site offline.",
    ],
  },
  {
    id: "namecheap",
    name: "Namecheap",
    steps: [
      "Sign in and open Domain List, then click Manage next to your domain.",
      "Open the Advanced DNS tab.",
      "Remove the default 'Parking page' / URL redirect records for @ and www.",
      "Add New Record → A Record, Host @, Value 185.158.133.1, TTL Automatic.",
      "Add New Record → A Record, Host www, Value 185.158.133.1, TTL Automatic.",
      "Save all changes with the green checkmarks.",
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    steps: [
      "Sign in, open Websites and pick your domain.",
      "Open DNS → Records.",
      "Add record → A, Name @, IPv4 address 185.158.133.1.",
      "Add record → A, Name www, IPv4 address 185.158.133.1.",
      "Set Proxy status to DNS only (grey cloud) for both records.",
      "Save. Delete any older A/CNAME record for @ or www.",
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace / Google Domains",
    steps: [
      "Sign in and open Domains, then your domain.",
      "Click DNS → DNS Settings → Custom records.",
      "Add Host @, Type A, Data 185.158.133.1.",
      "Add Host www, Type A, Data 185.158.133.1.",
      "Remove any existing A or CNAME rows for @ and www, then Save.",
    ],
  },
  {
    id: "porkbun",
    name: "Porkbun",
    steps: [
      "Sign in and open Domain Management.",
      "Click the DNS icon next to your domain.",
      "Delete the default ALIAS/CNAME records for the bare domain and www.",
      "Add Type A, Host blank, Answer 185.158.133.1.",
      "Add Type A, Host www, Answer 185.158.133.1.",
    ],
  },
  {
    id: "wix",
    name: "Wix",
    steps: [
      "Sign in and open Domains from your dashboard.",
      "Click your domain → Advanced → Edit DNS.",
      "Under A (Host) set the value to 185.158.133.1.",
      "Under CNAME (Aliases) delete the www row, then add an A record for www pointing to 185.158.133.1.",
      "Save changes.",
    ],
  },
];

/** Plain-English answers to what owners ask while they wait. */
export const DOMAIN_FAQ: { q: string; a: string }[] = [
  {
    q: "Will my site go down while I do this?",
    a: "No. Your Revora share link keeps serving the live site the entire time. Your own domain only takes over after both checks below pass.",
  },
  {
    q: "How long does it take?",
    a: "Usually 5–60 minutes after you save the records. Some registrars take up to 48 hours to publish the change worldwide.",
  },
  {
    q: "Do I need to buy an SSL certificate?",
    a: "No. HTTPS is issued automatically and renews itself once DNS points here.",
  },
  {
    q: "What about my email on this domain?",
    a: "Leave your MX and TXT records exactly as they are. Only the A records for @ and www change, so email keeps working.",
  },
];
