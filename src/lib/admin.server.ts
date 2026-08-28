/** Server-only helpers for platform admin (client creation, domains, support mode). */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewClientInput } from "@/lib/admin-types";

/** The DNS target clients point their domain at. */
export const DOMAIN_TARGET = "customer-forge.lovable.app";

export async function assertSuperAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error("Couldn't verify your platform access.");
  if (!data) throw new Error("Forbidden");
  return true;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidDomain(value: string) {
  return /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value) && value.length <= 253;
}

type DnsAnswer = { name: string; type: number; data: string };

async function dnsQuery(name: string, type: "A" | "CNAME"): Promise<DnsAnswer[]> {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { accept: "application/dns-json" } },
  );
  if (!res.ok) throw new Error("DNS lookup failed");
  const json = (await res.json()) as { Answer?: DnsAnswer[] };
  return json.Answer ?? [];
}

export type DomainCheck = {
  status: "not_connected" | "dns_pending" | "verifying" | "connected" | "ssl_active" | "error";
  detail: string;
};

/** Honest domain check: only reports connected/ssl_active from real DNS + TLS evidence. */
export async function checkDomain(domain: string): Promise<DomainCheck> {
  if (!domain) return { status: "not_connected", detail: "No custom domain added." };
  try {
    const [cname, a] = await Promise.all([dnsQuery(domain, "CNAME"), dnsQuery(domain, "A")]);
    const cnames = cname.filter((r) => r.type === 5).map((r) => normalizeDomain(r.data));
    const pointsHere = cnames.some((c) => c === DOMAIN_TARGET || c.endsWith(".lovable.app"));

    if (!pointsHere && a.length === 0 && cnames.length === 0) {
      return {
        status: "dns_pending",
        detail: `No DNS records found yet. Add a CNAME record pointing ${domain} to ${DOMAIN_TARGET}.`,
      };
    }

    if (!pointsHere) {
      return {
        status: "dns_pending",
        detail: `DNS records exist but don't point here yet. Point ${domain} to ${DOMAIN_TARGET} with a CNAME record.`,
      };
    }

    // DNS resolves to us — now see whether HTTPS actually answers on that hostname.
    try {
      const res = await fetch(`https://${domain}/`, { method: "GET", redirect: "manual" });
      if (res.status > 0) {
        return { status: "ssl_active", detail: "Domain resolves here and serves a secure connection." };
      }
      return { status: "connected", detail: "DNS points here. Waiting on the security certificate." };
    } catch {
      return {
        status: "connected",
        detail: "DNS points here. The security certificate isn't answering yet — this can take a few hours.",
      };
    }
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : "The domain check failed. Try again shortly.",
    };
  }
}

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return `Ll-${Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 18)}!7`;
}

/** Creates a fully provisioned, isolated client tenant. Requires the service-role client. */
export async function provisionClient(admin: SupabaseClient, input: NewClientInput) {
  const base = slugify(input.business_name) || "business";
  let slug = base;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const { data: taken } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${attempt + 2}`;
  }

  const email = input.owner_email.trim().toLowerCase();

  // Owner account — reuse an existing user when that email already signed up.
  let ownerId: string | null = null;
  let tempPassword: string | null = null;
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    ownerId = (existingProfile as { id: string }).id;
  } else {
    tempPassword = randomPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.owner_name },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Couldn't create the owner account.");
    }
    ownerId = created.user.id;
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: input.business_name.trim(),
      slug,
      industry: input.industry ?? null,
      plan_id: input.plan_id ?? null,
      subscription_status: "trialing",
      trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      conversion_goal: input.conversion_goal ?? null,
      onboarding_step: 4,
      onboarding_completed: true,
      created_by: ownerId,
    })
    .select("id, name, slug")
    .single();
  if (orgError || !org) throw new Error(orgError?.message ?? "Couldn't create the workspace.");

  const organizationId = (org as { id: string }).id;

  await admin.from("memberships").insert({ organization_id: organizationId, user_id: ownerId, role: "owner" });

  await admin.from("business_profiles").insert({
    organization_id: organizationId,
    tagline: input.tagline ?? null,
    description: input.description ?? null,
    phone: input.phone ?? null,
    email,
    address: input.address ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    zip: input.zip ?? null,
    service_area: input.service_area ?? null,
    hours: input.hours ?? {},
    logo_url: input.logo_url ?? null,
    hero_image_url: input.hero_image_url ?? null,
    primary_color: input.primary_color ?? null,
    secondary_color: input.secondary_color ?? null,
    accent_color: input.accent_color ?? null,
    owner_name: input.owner_name,
    owner_email: email,
    review_link: input.review_link ?? null,
    support_email: input.support_email ?? null,
  });

  const domain = input.desired_domain ? normalizeDomain(input.desired_domain) : "";
  await admin.from("website_settings").insert({
    organization_id: organizationId,
    template: input.template ?? "default",
    pages: {},
    seo: {
      headline: input.tagline ?? `${input.business_name}`,
      subheadline: input.description ?? null,
      meta_description: input.tagline ?? null,
    },
    subdomain: slug,
    custom_domain: domain && isValidDomain(domain) ? domain : null,
    domain_status: domain && isValidDomain(domain) ? "dns_pending" : "not_connected",
    domain_target: DOMAIN_TARGET,
    publish_state: "draft",
    published: false,
  });

  await admin.from("social_profiles").insert({
    organization_id: organizationId,
    instagram: input.instagram ?? null,
    facebook: input.facebook ?? null,
    tiktok: input.tiktok ?? null,
    youtube: input.youtube ?? null,
    linkedin: input.linkedin ?? null,
    google_business: input.google_business ?? null,
  });

  const services = (input.services ?? []).filter((s) => s.name?.trim());
  if (services.length) {
    await admin.from("services").insert(
      services.map((service, index) => ({
        organization_id: organizationId,
        name: service.name.trim(),
        description: service.description ?? null,
        price: service.price ?? null,
        duration_minutes: service.duration_minutes ?? 60,
        bookable: service.bookable ?? true,
        featured: index === 0,
        is_active: true,
        sort_order: index,
      })),
    );
  }

  const images = (input.images ?? []).filter((url) => url?.trim());
  if (images.length) {
    await admin.from("media").insert(
      images.map((url) => ({ organization_id: organizationId, url: url.trim(), category: "gallery" })),
    );
  }

  await admin.from("subscriptions").insert({
    organization_id: organizationId,
    plan_id: input.plan_id ?? null,
    status: "trialing",
    billing_interval: "monthly",
    trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });

  await admin.from("notifications").insert({
    organization_id: organizationId,
    title: "Workspace created",
    body: "Your business workspace is ready. Finish the launch checklist to go live.",
    kind: "system",
    link: "/app/launch",
  });

  return { organizationId, slug, ownerId, tempPassword, email };
}
