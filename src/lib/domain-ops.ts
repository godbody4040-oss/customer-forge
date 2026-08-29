/**
 * Domain operations shared between the browser and the server: which address is
 * the canonical one, what redirects should be in place, how the certificate is
 * doing, the transfer/cutover steps, and branded email forwarding.
 *
 * Nothing in here claims a domain is live. Live means DNS resolves to the
 * platform AND HTTPS answers — proven by the checks in domain-ops.server.ts.
 */

export type HostPreference = "root" | "www";

export type EmailForwardProvider = "improvmx" | "forwardemail";

export type EmailForwarding = {
  provider?: EmailForwardProvider;
  /** The branded mailbox, e.g. "contact". */
  alias?: string;
  /** Where mail should land, e.g. the owner's Gmail. */
  forward_to?: string;
  active?: boolean;
  mx_ok?: boolean;
  spf_ok?: boolean;
  detail?: string;
  checked_at?: string;
};

export type DomainTransfer = {
  state?: "idle" | "prepared" | "cutover" | "verifying" | "completed" | "rolled_back";
  from_domain?: string | null;
  to_domain?: string | null;
  started_at?: string;
  completed_at?: string;
  rolled_back_at?: string;
  detail?: string;
};

/** The one address every other address should redirect to. */
export function canonicalHost(domain: string | null, preference: HostPreference) {
  if (!domain) return null;
  const bare = domain.replace(/^www\./, "");
  return preference === "www" ? `www.${bare}` : bare;
}

export function canonicalOrigin(domain: string | null, preference: HostPreference) {
  const host = canonicalHost(domain, preference);
  return host ? `https://${host}` : null;
}

/** Plain-language list of the redirects that should be in force. */
export function redirectPlan(domain: string | null, preference: HostPreference, forceHttps: boolean) {
  const host = canonicalHost(domain, preference);
  if (!domain || !host) return [];
  const bare = domain.replace(/^www\./, "");
  const other = preference === "www" ? bare : `www.${bare}`;
  const rules = [
    {
      key: "alt-host",
      from: `https://${other}`,
      to: `https://${host}`,
      why: "One address only, so Google doesn't split your ranking between two versions of the site.",
    },
  ];
  if (forceHttps) {
    rules.unshift({
      key: "https",
      from: `http://${bare}`,
      to: `https://${host}`,
      why: "Anyone typing the address without https lands on the secure version.",
    });
  }
  return rules;
}

export type SslState = {
  label: string;
  tone: "signal" | "attention" | "danger" | "neutral";
  detail: string;
  /** True only when a real HTTPS response was proven. */
  secure: boolean;
};

/** Certificate state, described from evidence rather than assumption. */
export function sslState(input: {
  domain: string | null;
  dnsOk: boolean;
  sslOk: boolean;
  lastOkAt: string | null;
  checkedAt: string | null;
  detail: string | null;
}): SslState {
  if (!input.domain)
    return {
      label: "Not needed yet",
      tone: "neutral",
      detail: "Your free Revora address is already secured. Connect your own domain to get a certificate for it.",
      secure: true,
    };
  if (!input.dnsOk)
    return {
      label: "Waiting on DNS",
      tone: "attention",
      detail: "A certificate can only be issued once your domain points at Revora. Add the DNS records, then re-check.",
      secure: false,
    };
  if (input.sslOk)
    return {
      label: "Secured automatically",
      tone: "signal",
      detail:
        "HTTPS answered with a valid certificate. Renewal is automatic — Revora re-checks it and warns you if it ever stops answering.",
      secure: true,
    };
  return {
    label: "Being issued",
    tone: "attention",
    detail:
      input.detail ??
      "DNS is correct and the certificate is being issued. This usually completes within a few hours; Revora keeps checking.",
    secure: false,
  };
}

export type TransferStep = {
  key: string;
  title: string;
  what: string;
  done: boolean;
};

/** The cutover checklist, in the order it actually has to happen. */
export function transferSteps(input: {
  transfer: DomainTransfer;
  dnsOk: boolean;
  sslOk: boolean;
  live: boolean;
}): TransferStep[] {
  const state = input.transfer.state ?? "idle";
  const started = state !== "idle";
  return [
    {
      key: "prepare",
      title: "Keep the old address live",
      what: "Your current address stays online the whole time. Nothing is switched off until the new one is proven.",
      done: started,
    },
    {
      key: "lower-ttl",
      title: "Lower the DNS TTL to 5 minutes",
      what: "At your registrar, set TTL to 300 seconds a day before you cut over so changes take effect fast.",
      done: started,
    },
    {
      key: "records",
      title: "Point the new domain at Revora",
      what: "Add the A records and the verification TXT record shown above at the new domain's registrar.",
      done: input.dnsOk,
    },
    {
      key: "certificate",
      title: "Wait for the certificate",
      what: "HTTPS has to answer on the new address before any traffic is sent there.",
      done: input.sslOk,
    },
    {
      key: "verify",
      title: "Verify the site loads",
      what: "Revora loads the new address and checks it serves your site, not a parking page.",
      done: input.live,
    },
    {
      key: "finish",
      title: "Finish the cutover",
      what: "The new address becomes canonical and the old one redirects to it. Roll back any time if something looks wrong.",
      done: state === "completed",
    },
  ];
}

/** DNS records a client adds at their registrar to receive branded email. */
export function emailForwardingRecords(
  domain: string | null,
  provider: EmailForwardProvider,
  forwardTo: string,
) {
  if (!domain) return [];
  if (provider === "forwardemail")
    return [
      { type: "MX", name: "@", value: "mx1.forwardemail.net", priority: "10", purpose: "Receives mail for your domain" },
      { type: "MX", name: "@", value: "mx2.forwardemail.net", priority: "20", purpose: "Backup mail server" },
      {
        type: "TXT",
        name: "@",
        value: `forward-email=${forwardTo || "you@example.com"}`,
        priority: null,
        purpose: "Says where the mail should be delivered",
      },
    ];
  return [
    { type: "MX", name: "@", value: "mx1.improvmx.com", priority: "10", purpose: "Receives mail for your domain" },
    { type: "MX", name: "@", value: "mx2.improvmx.com", priority: "20", purpose: "Backup mail server" },
    {
      type: "TXT",
      name: "@",
      value: "v=spf1 include:spf.improvmx.com ~all",
      priority: null,
      purpose: "Lets you send from the address without landing in spam",
    },
  ];
}

export const EMAIL_PROVIDERS: { id: EmailForwardProvider; name: string; note: string; setupUrl: string }[] = [
  {
    id: "improvmx",
    name: "ImprovMX",
    note: "Free forwarding, quickest to set up. Create the alias there, then add the records below.",
    setupUrl: "https://improvmx.com/",
  },
  {
    id: "forwardemail",
    name: "Forward Email",
    note: "Open-source and free. The destination address goes straight into a DNS record.",
    setupUrl: "https://forwardemail.net/",
  },
];

export const COMMON_ALIASES = ["contact", "hello", "info", "bookings", "quotes", "support"];

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
