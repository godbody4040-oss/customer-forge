/**
 * Authorization and host-resolution regressions.
 *
 * These prove the two rules the product cannot be shipped without: a workspace
 * id sent by a browser never grants access on its own, and no hostname under the
 * traffic-only domain can ever be read as a customer website.
 */
import { describe, expect, it } from "vitest";
import { requireOrgRole, roleAtLeast, orgRole } from "@/lib/org-authz.server";
import { isTrafficDomainHost, isPossibleTenantHost, trafficRedirectUrl } from "@/lib/revora-address";

type Row = { organization_id: string; user_id: string; role: string };

/** Minimal stand-in for the caller's own Supabase client, honouring the filters. */
function clientWith(rows: Row[]) {
  return {
    from() {
      const filters: Partial<Row> = {};
      const builder = {
        select: () => builder,
        eq: (col: keyof Row, value: string) => {
          filters[col] = value as never;
          return builder;
        },
        maybeSingle: async () => {
          const match = rows.find((r) =>
            Object.entries(filters).every(([k, v]) => r[k as keyof Row] === v),
          );
          return { data: match ? { role: match.role } : null, error: null };
        },
      };
      return builder;
    },
  } as never;
}

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("role ladder", () => {
  it("ranks roles strongest first", () => {
    expect(roleAtLeast("owner", "manager")).toBe(true);
    expect(roleAtLeast("admin", "manager")).toBe(true);
    expect(roleAtLeast("manager", "manager")).toBe(true);
    expect(roleAtLeast("staff", "manager")).toBe(false);
    expect(roleAtLeast("viewer", "staff")).toBe(false);
    expect(roleAtLeast(null, "viewer")).toBe(false);
  });
});

describe("workspace authorization", () => {
  it("lets an owner, admin and manager perform managing actions", async () => {
    for (const role of ["owner", "admin", "manager"]) {
      const client = clientWith([{ organization_id: ORG_A, user_id: USER_A, role }]);
      await expect(requireOrgRole(client, ORG_A, USER_A, "manager")).resolves.toBe(ORG_A);
    }
  });

  it("refuses staff and viewers for managing actions", async () => {
    for (const role of ["staff", "viewer"]) {
      const client = clientWith([{ organization_id: ORG_A, user_id: USER_A, role }]);
      await expect(requireOrgRole(client, ORG_A, USER_A, "manager")).rejects.toThrow(
        /permission/i,
      );
    }
  });

  it("blocks a member of one workspace from acting on another (IDOR)", async () => {
    const client = clientWith([{ organization_id: ORG_A, user_id: USER_A, role: "owner" }]);
    await expect(requireOrgRole(client, ORG_B, USER_A, "staff")).rejects.toThrow(/permission/i);
  });

  it("rejects malformed and injected workspace identifiers without a lookup", async () => {
    const client = clientWith([{ organization_id: ORG_A, user_id: USER_A, role: "owner" }]);
    for (const bad of ["", "*", `${ORG_A},${ORG_B}`, "' or 1=1--", "not-a-uuid"]) {
      expect(await orgRole(client, bad, USER_A)).toBeNull();
      await expect(requireOrgRole(client, bad, USER_A, "viewer")).rejects.toThrow(/permission/i);
    }
  });

  it("never reveals whether a workspace exists", async () => {
    const client = clientWith([]);
    await expect(requireOrgRole(client, ORG_B, USER_A, "viewer")).rejects.toThrow(
      "You don't have permission to do that in this workspace.",
    );
  });
});

describe("traffic-domain host handling", () => {
  const hosts = [
    "revoraweb.site",
    "www.revoraweb.site",
    "business.revoraweb.site",
    "customer.deep.revoraweb.site",
    "EVIL.RevoraWeb.Site",
    "revoraweb.site:8443",
    "revoraweb.site.",
  ];

  it("treats every traffic-domain host as redirect-only and never a tenant", () => {
    for (const host of hosts) {
      expect(isTrafficDomainHost(host)).toBe(true);
      expect(isPossibleTenantHost(host)).toBe(false);
    }
  });

  it("does not treat look-alike domains as the traffic domain", () => {
    for (const host of ["evilrevoraweb.site", "revoraweb.site.evil.tld", "revoraweb.co"]) {
      expect(isTrafficDomainHost(host)).toBe(false);
    }
  });

  it("keeps the platform domain and customer domains out of the redirect", () => {
    expect(isTrafficDomainHost("revoragrowthsystems.com")).toBe(false);
    expect(isTrafficDomainHost("acmeplumbing.com")).toBe(false);
    expect(isPossibleTenantHost("acmeplumbing.com")).toBe(true);
    expect(isPossibleTenantHost("revoragrowthsystems.com")).toBe(false);
  });

  it("always redirects to the platform origin, whatever the path or query", () => {
    for (const [path, search] of [
      ["/", ""],
      ["/pricing", "?utm=x"],
      ["/", "?_rw=1"],
      ["//evil.tld", "?next=https://evil.tld"],
      ["/app/dashboard", ""],
    ] as const) {
      expect(new URL(trafficRedirectUrl(path, search)).origin).toBe(
        "https://revoragrowthsystems.com",
      );
    }
  });
});
