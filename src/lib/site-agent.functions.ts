/**
 * Authenticated Site Agent endpoints.
 *
 * `planWebsiteChanges` reads the workspace's real site and returns a reviewable
 * plan. `applyWebsiteChanges` writes only the steps the client approved, after
 * snapshotting the current content so any change can be rolled back from version
 * history. Every query and write runs through the caller's own client, so RLS
 * keeps one client's website out of another's.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MAX_ACTIONS,
  PLAN_INSTRUCTION_LIMIT,
  describeActions,
  readActions,
  readAttachments,
  type AgentAction,
  type AgentTurn,
  type SiteIndex,
} from "@/lib/site-agent";

const orgIdOf = (input: { organizationId?: unknown }) => {
  const organizationId = String(input?.organizationId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid workspace");
  return organizationId;
};

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

type LoadedSite = {
  pages: {
    id: string;
    slug: string;
    title: string;
    kind: string;
    sort_order: number;
    is_visible: boolean;
    noindex: boolean;
    seo_title: string | null;
    seo_description: string | null;
  }[];
  sections: {
    id: string;
    page_id: string;
    kind: string;
    variant: string;
    heading: string | null;
    subheading: string | null;
    body: string | null;
    sort_order: number;
    is_visible: boolean;
  }[];
  components: {
    id: string;
    section_id: string;
    kind: string;
    label: string | null;
    body: string | null;
    link_label: string | null;
    link_url: string | null;
    sort_order: number;
    is_visible: boolean;
  }[];
};

async function loadSite(supabase: SupabaseLike, orgId: string): Promise<LoadedSite> {
  const [pages, sections, components] = await Promise.all([
    supabase
      .from("website_pages")
      .select("id, slug, title, kind, sort_order, is_visible, noindex, seo_title, seo_description")
      .eq("organization_id", orgId)
      .order("sort_order"),
    supabase
      .from("website_sections")
      .select("id, page_id, kind, variant, heading, subheading, body, sort_order, is_visible")
      .eq("organization_id", orgId)
      .order("sort_order"),
    supabase
      .from("website_components")
      .select("id, section_id, kind, label, body, link_label, link_url, sort_order, is_visible")
      .eq("organization_id", orgId)
      .order("sort_order"),
  ]);
  if (pages.error) throw new Error("You don't have access to that workspace.");
  return {
    pages: (pages.data ?? []) as LoadedSite["pages"],
    sections: (sections.data ?? []) as LoadedSite["sections"],
    components: (components.data ?? []) as LoadedSite["components"],
  };
}

/** Minimal shape we use from the request-scoped Supabase client. */
type SupabaseLike = {
  from: (table: string) => any;
};

function indexOf(site: LoadedSite): { index: SiteIndex; currentText: Map<string, string> } {
  const index: SiteIndex = { pages: new Map(), sections: new Map(), components: new Map() };
  const currentText = new Map<string, string>();
  for (const page of site.pages) index.pages.set(page.id, { title: page.title, slug: page.slug });
  for (const section of site.sections) {
    index.sections.set(section.id, {
      pageId: section.page_id,
      label: section.heading?.slice(0, 40) || section.kind.replace(/_/g, " "),
    });
    currentText.set(`${section.id}:heading`, section.heading ?? "");
    currentText.set(`${section.id}:subheading`, section.subheading ?? "");
    currentText.set(`${section.id}:body`, section.body ?? "");
  }
  for (const component of site.components)
    index.components.set(component.id, {
      sectionId: component.section_id,
      label: component.label?.slice(0, 40) || component.kind.replace(/_/g, " "),
    });
  return { index, currentText };
}

/* --------------------------------- planning -------------------------------- */

export const planWebsiteChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      organizationId: string;
      instruction: string;
      history?: { role: string; content: string }[];
      attachments?: unknown;
    }) => {
      const organizationId = orgIdOf(input);
      const instruction = str(input?.instruction, PLAN_INSTRUCTION_LIMIT);
      const attachments = readAttachments(input?.attachments);
      if (instruction.length < 3 && !attachments.length)
        throw new Error("Tell Revora what you'd like changed — type it, say it, or attach a photo or clip.");
      const history: AgentTurn[] = Array.isArray(input?.history)
        ? input.history
            .slice(-8)
            .map((turn) => ({
              role: turn?.role === "assistant" ? ("assistant" as const) : ("user" as const),
              content: str(turn?.content, 4000),
            }))
            .filter((turn) => turn.content.length > 0)
        : [];
      return { organizationId, instruction, history, attachments };
    },
  )

  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = data.organizationId;
    const { planChanges, AGENT_MODEL } = await import("@/lib/site-agent.server");
    const { SECTION_LIBRARY, PAGE_LIBRARY } = await import("@/lib/website-content");

    const [site, org, profile, services, reviews, media] = await Promise.all([
      loadSite(supabase as unknown as SupabaseLike, orgId),
      supabase.from("organizations").select("name, industry").eq("id", orgId).maybeSingle(),
      supabase.from("business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase
        .from("services")
        .select("name, price, starting_price")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_published", true),
      supabase.from("media").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    ]);
    if (!org.data) throw new Error("Workspace not found.");
    if (!site.pages.length)
      throw new Error("Build your website structure first — then the assistant can change anything on it.");

    const p = (profile.data ?? {}) as Record<string, unknown>;
    const componentsBySection = new Map<string, LoadedSite["components"]>();
    for (const component of site.components) {
      const list = componentsBySection.get(component.section_id) ?? [];
      list.push(component);
      componentsBySection.set(component.section_id, list);
    }

    const raw = await planChanges(
      {
        business: {
          name: org.data.name ?? "",
          industry: org.data.industry ?? null,
          tagline: (p["tagline"] as string) ?? null,
          description: (p["description"] as string) ?? null,
          city: (p["city"] as string) ?? null,
          state: (p["state"] as string) ?? null,
          serviceArea: (p["service_area"] as string) ?? null,
          phone: (p["phone"] as string) ?? null,
          email: (p["email"] as string) ?? null,
          yearsInBusiness: (p["years_in_business"] as number) ?? null,
          primaryColor: (p["primary_color"] as string) ?? null,
          secondaryColor: (p["secondary_color"] as string) ?? null,
          accentColor: (p["accent_color"] as string) ?? null,
          fontPreference: (p["font_preference"] as string) ?? null,
          services: (services.data ?? []).map((s) => ({
            name: s.name,
            price: s.price ?? null,
            startingPrice: s.starting_price ?? null,
          })),
          publishedReviewCount: reviews.count ?? 0,
          photoCount: media.count ?? 0,
        },
        pages: site.pages.map((page) => ({
          id: page.id,
          slug: page.slug,
          title: page.title,
          kind: page.kind,
          is_visible: page.is_visible,
          noindex: page.noindex,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          sections: site.sections
            .filter((section) => section.page_id === page.id)
            .map((section) => ({
              id: section.id,
              kind: section.kind,
              variant: section.variant,
              is_visible: section.is_visible,
              heading: section.heading,
              subheading: section.subheading,
              body: section.body,
              components: (componentsBySection.get(section.id) ?? []).map((component) => ({
                id: component.id,
                kind: component.kind,
                label: component.label,
                body: component.body,
                link_label: component.link_label,
                link_url: component.link_url,
              })),
            })),
        })),
        sectionKinds: SECTION_LIBRARY.map((s) => s.kind),
        pageKinds: PAGE_LIBRARY.map((p2) => p2.kind),
        componentKinds: ["feature", "faq", "step", "stat", "card", "link", "button", "quote", "list_item", "image"],
      },
      data.instruction || "(see the attached file(s) — follow what they show or say)",
      data.history,
      data.attachments,
    );

    const actions = readActions(raw["actions"], {
      pageIds: new Set(site.pages.map((page) => page.id)),
      sectionIds: new Set(site.sections.map((section) => section.id)),
      componentIds: new Set(site.components.map((component) => component.id)),
    });
    const { index, currentText } = indexOf(site);
    const steps = describeActions(actions, index, currentText);

    const list = (value: unknown) =>
      Array.isArray(value) ? value.map((item) => str(item, 300)).filter(Boolean).slice(0, 6) : [];

    const plan = {
      reply: str(raw["reply"], 1500) || "Here's what I'll change.",
      summary: str(raw["summary"], 300),
      steps,
      questions: list(raw["questions"]),
      notes: list(raw["notes"]),
    };

    await supabase.from("ai_generations").insert({
      organization_id: orgId,
      kind: "agent_plan",
      model: AGENT_MODEL,
      instruction:
        data.instruction.slice(0, 4000) +
        (data.attachments.length
          ? `\n[attached: ${data.attachments.map((a) => `${a.kind} ${a.name}`).join(", ")}]`
          : ""),
      result: plan as unknown as never,
      created_by: userId,
    });

    return plan;
  });

/* --------------------------------- applying -------------------------------- */

export const applyWebsiteChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; actions: unknown; label?: string }) => ({
    organizationId: orgIdOf(input),
    actions: input?.actions,
    label: str(input?.label, 120),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = data.organizationId;

    const site = await loadSite(supabase as unknown as SupabaseLike, orgId);
    const actions = readActions(data.actions, {
      pageIds: new Set(site.pages.map((page) => page.id)),
      sectionIds: new Set(site.sections.map((section) => section.id)),
      componentIds: new Set(site.components.map((component) => component.id)),
    }).slice(0, MAX_ACTIONS);
    if (!actions.length) throw new Error("Nothing to apply.");

    // Snapshot first, so an unwanted change can always be rolled back.
    const snapshotLabel = data.label || "Before assistant changes";
    const { snapshotContent } = await import("@/lib/website-content");
    const [{ data: latest }, contentTree] = await Promise.all([
      supabase
        .from("website_versions")
        .select("version")
        .eq("organization_id", orgId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      Promise.resolve(
        site.pages.map((page) => ({
          ...page,
          seo_canonical: null,
          og_title: null,
          og_description: null,
          og_image_url: null,
          sections: site.sections
            .filter((section) => section.page_id === page.id)
            .map((section) => ({
              ...section,
              settings: {},
              components: site.components
                .filter((component) => component.section_id === section.id)
                .map((component) => ({ ...component, media_url: null, settings: {} })),
            })),
        })),
      ),
    ]);
    await supabase.from("website_versions").insert({
      organization_id: orgId,
      version: (latest?.version ?? 0) + 1,
      label: snapshotLabel,
      pages: snapshotContent(contentTree as never) as unknown as never,
      created_by: userId,
    });

    const sortOf = new Map(site.sections.map((section) => [section.id, section.sort_order]));
    const applied: string[] = [];
    const failed: string[] = [];

    const run = async (label: string, work: () => PromiseLike<unknown>) => {
      try {
        const result = (await work()) as { error?: unknown } | null;
        if (result && result.error) throw result.error;
        applied.push(label);
      } catch (error) {
        console.error("[site-agent] action failed", label, error);
        failed.push(label);
      }
    };

    for (const action of actions as AgentAction[]) {
      switch (action.type) {
        case "set_section_text":
          await run(action.type, () =>
            supabase
              .from("website_sections")
              .update({ [action.field]: action.value } as never)
              .eq("id", action.sectionId)
              .eq("organization_id", orgId),
          );
          break;
        case "set_section_visibility":
          await run(action.type, () =>
            supabase
              .from("website_sections")
              .update({ is_visible: action.visible })
              .eq("id", action.sectionId)
              .eq("organization_id", orgId),
          );
          break;
        case "set_section_variant":
          await run(action.type, () =>
            supabase
              .from("website_sections")
              .update({ variant: action.variant })
              .eq("id", action.sectionId)
              .eq("organization_id", orgId),
          );
          break;
        case "add_section": {
          const siblings = site.sections.filter((section) => section.page_id === action.pageId);
          const position = action.position ?? siblings.length;
          await run(action.type, () =>
            supabase.from("website_sections").insert({
              organization_id: orgId,
              page_id: action.pageId,
              kind: action.kind,
              heading: action.heading ?? null,
              subheading: action.subheading ?? null,
              body: action.body ?? null,
              sort_order: position,
            }),
          );
          break;
        }
        case "delete_section":
          await run(action.type, () =>
            supabase.from("website_sections").delete().eq("id", action.sectionId).eq("organization_id", orgId),
          );
          break;
        case "reorder_sections":
          for (const [order, id] of action.sectionIds.entries()) {
            await run(action.type, () =>
              supabase
                .from("website_sections")
                .update({ sort_order: order })
                .eq("id", id)
                .eq("organization_id", orgId),
            );
          }
          break;
        case "set_component":
          await run(action.type, () =>
            supabase
              .from("website_components")
              .update(action.patch as never)
              .eq("id", action.componentId)
              .eq("organization_id", orgId),
          );
          break;
        case "add_component":
          await run(action.type, () =>
            supabase.from("website_components").insert({
              organization_id: orgId,
              section_id: action.sectionId,
              kind: action.kind,
              label: action.label ?? null,
              body: action.body ?? null,
              link_url: action.link_url ?? null,
              link_label: action.link_label ?? null,
              sort_order: site.components.filter((c) => c.section_id === action.sectionId).length,
            }),
          );
          break;
        case "delete_component":
          await run(action.type, () =>
            supabase.from("website_components").delete().eq("id", action.componentId).eq("organization_id", orgId),
          );
          break;
        case "add_page":
          await run(action.type, () =>
            supabase.from("website_pages").insert({
              organization_id: orgId,
              kind: action.kind,
              title: action.title,
              slug: action.slug,
              sort_order: site.pages.length,
            }),
          );
          break;
        case "set_page":
          await run(action.type, () =>
            supabase
              .from("website_pages")
              .update(action.patch as never)
              .eq("id", action.pageId)
              .eq("organization_id", orgId),
          );
          break;
        case "delete_page":
          await run(action.type, () =>
            supabase.from("website_pages").delete().eq("id", action.pageId).eq("organization_id", orgId),
          );
          break;
        case "set_theme":
          await run(action.type, () =>
            supabase
              .from("business_profiles")
              .update(action.patch as never)
              .eq("organization_id", orgId),
          );
          break;
        case "set_business_fact":
          await run(action.type, () =>
            supabase
              .from("business_profiles")
              .update({ [action.field]: action.value } as never)
              .eq("organization_id", orgId),
          );
          break;
      }
      void sortOf;
    }

    await supabase.from("ai_generations").insert({
      organization_id: orgId,
      kind: "agent_apply",
      model: "applied",
      instruction: snapshotLabel,
      result: { applied, failed } as unknown as never,
      created_by: userId,
    });

    return { applied: applied.length, failed: failed.length, snapshotLabel };
  });
