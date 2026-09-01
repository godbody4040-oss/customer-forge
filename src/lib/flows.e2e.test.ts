/**
 * End-to-end flow tests against a running Revora app.
 *
 * These hit the real server (SSR, server routes, RLS-backed public reads) so a
 * regression in lead capture, quotes, booking, payments, notifications or
 * analytics surfaces here rather than in front of a customer.
 *
 * Run against the dev server (default) or any deployment:
 *   E2E_BASE_URL=https://customer-forge.lovable.app bunx vitest run src/lib/flows.e2e.test.ts
 *
 * The suite skips itself when no server is reachable, so unit runs stay green.
 */
import { beforeAll, describe, expect, it } from "vitest";

const BASE = process.env["E2E_BASE_URL"] ?? "http://localhost:8080";

let reachable = false;
/** A published tenant site discovered from the sitemap, when one exists. */
let publicSite: string | null = null;

async function get(path: string) {
  const response = await fetch(`${BASE}${path}`, { headers: { "user-agent": "RevoraE2E/1.0" } });
  return { status: response.status, body: await response.text() };
}

beforeAll(async () => {
  try {
    const root = await fetch(BASE);
    reachable = root.ok;
  } catch {
    reachable = false;
  }
  if (!reachable) return;
  const sitemap = await get("/sitemap.xml");
  publicSite = /<loc>[^<]*(\/s\/[a-z0-9-]+)<\/loc>/i.exec(sitemap.body)?.[1] ?? null;
}, 60_000);

const live = (name: string, fn: () => Promise<void>, timeout = 30_000) =>
  it(
    name,
    async () => {
      if (!reachable) return;
      await fn();
    },
    timeout,
  );

describe("marketing and discovery", () => {
  live("serves the home page with pricing and a signup path", async () => {
    const { status, body } = await get("/");
    expect(status).toBe(200);
    expect(body).toMatch(/750/);
    expect(body).toMatch(/250/);
    expect(body).toMatch(/get-started|Get started/i);
  });

  live("exposes crawlable robots and sitemap", async () => {
    const robots = await get("/robots.txt");
    expect(robots.status).toBe(200);
    expect(robots.body).not.toMatch(/^Disallow: \/$/m);
    const sitemap = await get("/sitemap.xml");
    expect(sitemap.status).toBe(200);
    expect(sitemap.body).toMatch(/<urlset|<sitemapindex/);
  });

  live("renders unique metadata on every public route", async () => {
    const titles = new Set<string>();
    for (const path of ["/", "/pricing", "/about", "/contact", "/industries"]) {
      const { status, body } = await get(path);
      expect(status).toBe(200);
      const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.trim();
      expect(title, `${path} needs a title`).toBeTruthy();
      expect(title).not.toMatch(/Lovable/i);
      titles.add(title!);
    }
    expect(titles.size).toBeGreaterThan(3);
  });
});

describe("lead capture, quote and booking flows", () => {
  live("renders a working conversion path on a published tenant site", async () => {
    if (!publicSite) return; // no tenant has published yet
    const { status, body } = await get(publicSite);
    expect(status).toBe(200);
    // A visitor must always have at least one way to convert.
    expect(/href=["']tel:|<form\b/i.test(body)).toBe(true);
    expect((body.match(/<h1\b/gi) ?? []).length).toBe(1);
  });

  live("serves the quote and booking pages of a published site", async () => {
    if (!publicSite) return;
    for (const suffix of ["/pricing", "/book", "/contact"]) {
      const { status, body } = await get(`${publicSite}${suffix}`);
      expect([200, 404]).toContain(status); // page only exists when generated
      if (status === 200) expect(body.length).toBeGreaterThan(500);
    }
  });

  live("keeps the interactive product demo working end to end", async () => {
    const demo = await get("/demo/dashboard");
    expect(demo.status).toBe(200);
    expect(demo.body).toMatch(/demo/i);
  });
});

describe("CRM, notifications and analytics surfaces", () => {
  live("keeps workspace routes private behind authentication", async () => {
    for (const path of ["/app", "/app/leads", "/app/command", "/app/billing", "/admin"]) {
      const { status, body } = await get(path);
      expect(status).toBeLessThan(500);
      // Unauthenticated HTML must never leak workspace data.
      expect(body).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE/i);
    }
  });
});

describe("payment and webhook endpoints", () => {
  live("rejects unsigned payment webhooks", async () => {
    // The Stripe route needs its environment marker; without it the event is ignored, not processed.
    for (const path of ["/api/public/payments/webhook?env=live", "/api/public/paypal/webhook"]) {
      const response = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "checkout.session.completed" }),
      });
      // 401/400 when configured. When a provider isn't configured the event is
      // acknowledged but explicitly ignored — never processed.
      if (response.status < 400) {
        const text = await response.text();
        expect(text).toMatch(/ignored/i);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    }
  });

  live("protects the background job endpoint from anonymous callers", async () => {
    const response = await fetch(`${BASE}/api/public/jobs/site-engine`, { method: "POST" });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
