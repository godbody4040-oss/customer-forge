/**
 * Exact full-state website snapshots.
 *
 * Version history stores a compact copy of the structure for diffing. That is
 * good enough to *show* what changed, but not to put a website back exactly as
 * it was, because it drops components (buttons, cards, images, form fields),
 * section variants and settings.
 *
 * This module models a byte-for-byte snapshot of the editable website state and
 * computes the write plan that turns the current state back into a snapshot.
 * Everything here is pure so it can be unit tested; the database work lives in
 * `site-restore.functions.ts`.
 */

export type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

export type FullComponent = {
  id: string;
  section_id: string;
  kind: string;
  label: string | null;
  body: string | null;
  link_label: string | null;
  link_url: string | null;
  media_url: string | null;
  settings: JsonLike;
  sort_order: number;
  is_visible: boolean;
};

export type FullSection = {
  id: string;
  page_id: string;
  kind: string;
  variant: string;
  heading: string | null;
  subheading: string | null;
  body: string | null;
  settings: JsonLike;
  sort_order: number;
  is_visible: boolean;
  components: FullComponent[];
};

export type FullPage = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_canonical: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  noindex: boolean;
  sort_order: number;
  is_visible: boolean;
  sections: FullSection[];
};

export type FullSnapshot = {
  /** Snapshot format, so future changes can stay backwards compatible. */
  format: 1;
  takenAt: string;
  pages: FullPage[];
};

export type RestorePlan = {
  deleteComponentIds: string[];
  deleteSectionIds: string[];
  deletePageIds: string[];
  pages: Omit<FullPage, "sections">[];
  sections: Omit<FullSection, "components">[];
  components: FullComponent[];
  /** Plain-language summary of what the restore will do. */
  summary: string;
};

const asRecord = (value: unknown): JsonLike =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonLike) : {};

/** Builds a snapshot from flat table rows. */
export function buildFullSnapshot(
  pages: Record<string, unknown>[],
  sections: Record<string, unknown>[],
  components: Record<string, unknown>[],
  takenAt = new Date().toISOString(),
): FullSnapshot {
  const componentsBySection = new Map<string, FullComponent[]>();
  for (const raw of components) {
    const component: FullComponent = {
      id: String(raw["id"] ?? ""),
      section_id: String(raw["section_id"] ?? ""),
      kind: String(raw["kind"] ?? "text"),
      label: (raw["label"] as string | null) ?? null,
      body: (raw["body"] as string | null) ?? null,
      link_label: (raw["link_label"] as string | null) ?? null,
      link_url: (raw["link_url"] as string | null) ?? null,
      media_url: (raw["media_url"] as string | null) ?? null,
      settings: asRecord(raw["settings"]),
      sort_order: Number(raw["sort_order"] ?? 0),
      is_visible: raw["is_visible"] !== false,
    };
    if (!component.id || !component.section_id) continue;
    const list = componentsBySection.get(component.section_id) ?? [];
    list.push(component);
    componentsBySection.set(component.section_id, list);
  }

  const sectionsByPage = new Map<string, FullSection[]>();
  for (const raw of sections) {
    const id = String(raw["id"] ?? "");
    const pageId = String(raw["page_id"] ?? "");
    if (!id || !pageId) continue;
    const section: FullSection = {
      id,
      page_id: pageId,
      kind: String(raw["kind"] ?? "text"),
      variant: String(raw["variant"] ?? "default"),
      heading: (raw["heading"] as string | null) ?? null,
      subheading: (raw["subheading"] as string | null) ?? null,
      body: (raw["body"] as string | null) ?? null,
      settings: asRecord(raw["settings"]),
      sort_order: Number(raw["sort_order"] ?? 0),
      is_visible: raw["is_visible"] !== false,
      components: (componentsBySection.get(id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    };
    const list = sectionsByPage.get(pageId) ?? [];
    list.push(section);
    sectionsByPage.set(pageId, list);
  }

  const fullPages: FullPage[] = pages
    .map((raw) => {
      const id = String(raw["id"] ?? "");
      return {
        id,
        slug: String(raw["slug"] ?? ""),
        title: String(raw["title"] ?? ""),
        kind: String(raw["kind"] ?? "custom"),
        seo_title: (raw["seo_title"] as string | null) ?? null,
        seo_description: (raw["seo_description"] as string | null) ?? null,
        seo_canonical: (raw["seo_canonical"] as string | null) ?? null,
        og_title: (raw["og_title"] as string | null) ?? null,
        og_description: (raw["og_description"] as string | null) ?? null,
        og_image_url: (raw["og_image_url"] as string | null) ?? null,
        noindex: raw["noindex"] === true,
        sort_order: Number(raw["sort_order"] ?? 0),
        is_visible: raw["is_visible"] !== false,
        sections: (sectionsByPage.get(id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
      };
    })
    .filter((page) => page.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return { format: 1, takenAt, pages: fullPages };
}

export function readFullSnapshot(value: unknown): FullSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record["format"] !== 1 || !Array.isArray(record["pages"])) return null;
  return {
    format: 1,
    takenAt: typeof record["takenAt"] === "string" ? record["takenAt"] : "",
    pages: record["pages"] as FullPage[],
  };
}

export function countSnapshot(snapshot: FullSnapshot | null) {
  const pages = snapshot?.pages ?? [];
  const sections = pages.flatMap((page) => page.sections ?? []);
  const components = sections.flatMap((section) => section.components ?? []);
  return { pages: pages.length, sections: sections.length, components: components.length };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Works out exactly which rows to write and which to remove so the live state
 * matches `target`. Rows keep their original ids, so links, analytics and
 * saved references stay valid after a rollback.
 */
export function planRestore(current: FullSnapshot | null, target: FullSnapshot): RestorePlan {
  const pages: Omit<FullPage, "sections">[] = [];
  const sections: Omit<FullSection, "components">[] = [];
  const components: FullComponent[] = [];

  for (const page of target.pages ?? []) {
    const { sections: pageSections, ...pageRow } = page;
    pages.push(pageRow);
    for (const section of pageSections ?? []) {
      const { components: sectionComponents, ...sectionRow } = section;
      sections.push({ ...sectionRow, page_id: page.id });
      for (const component of sectionComponents ?? []) {
        components.push({ ...component, section_id: section.id });
      }
    }
  }

  const keepPages = new Set(pages.map((page) => page.id));
  const keepSections = new Set(sections.map((section) => section.id));
  const keepComponents = new Set(components.map((component) => component.id));

  const currentCounts = countSnapshot(current);
  const deletePageIds: string[] = [];
  const deleteSectionIds: string[] = [];
  const deleteComponentIds: string[] = [];

  for (const page of current?.pages ?? []) {
    if (!keepPages.has(page.id)) deletePageIds.push(page.id);
    for (const section of page.sections ?? []) {
      if (!keepSections.has(section.id) && !deletePageIds.includes(page.id)) {
        deleteSectionIds.push(section.id);
      }
      for (const component of section.components ?? []) {
        if (!keepComponents.has(component.id) && !deleteSectionIds.includes(section.id)) {
          deleteComponentIds.push(component.id);
        }
      }
    }
  }

  const targetCounts = countSnapshot(target);
  const parts = [
    `${plural(targetCounts.pages, "page")}, ${plural(targetCounts.sections, "section")} and ${plural(
      targetCounts.components,
      "element",
    )} restored exactly`,
  ];
  const removed = deletePageIds.length + deleteSectionIds.length + deleteComponentIds.length;
  if (removed > 0) parts.push(`${plural(removed, "newer item")} removed`);
  if (currentCounts.pages === 0) parts.push("nothing was live before this restore");

  return {
    deleteComponentIds,
    deleteSectionIds,
    deletePageIds,
    pages,
    sections,
    components,
    summary: `${parts.join(" · ")}.`,
  };
}

/** True when the two snapshots describe an identical website. */
export function snapshotsMatch(a: FullSnapshot | null, b: FullSnapshot | null): boolean {
  if (!a || !b) return false;
  const strip = (snapshot: FullSnapshot) =>
    JSON.stringify({
      pages: (snapshot.pages ?? []).map((page) => ({
        ...page,
        sections: (page.sections ?? []).map((section) => ({
          ...section,
          components: section.components ?? [],
        })),
      })),
    });
  return strip(a) === strip(b);
}
