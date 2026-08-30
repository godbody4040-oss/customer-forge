import {
  backdropLabel,
  isBackdropId,
  isSectionEffectId,
  sectionEffectLabel,
  type BackdropId,
  type SectionEffectId,
} from "@/lib/site-effects";
import { safeLinkUrl } from "@/lib/website-content";
/**
 * Revora Site Agent — the shared vocabulary for "just tell it what you want".
 *
 * The assistant answers with a plan made of small, checkable actions. This file
 * owns the action shapes, the validation that keeps a model from doing anything
 * outside the workspace, and the plain-English descriptions the client reads
 * before approving. Nothing here talks to the database or the model.
 */

export const PLAN_INSTRUCTION_LIMIT = 24_000;
export const MAX_ACTIONS = 60;

export type AgentField = "heading" | "subheading" | "body";

export type PageSeoPatch = {
  title?: string;
  slug?: string;
  is_visible?: boolean;
  noindex?: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_canonical?: string;
  og_title?: string;
  og_description?: string;
};

export type ComponentPatch = {
  label?: string;
  body?: string;
  link_url?: string;
  link_label?: string;
  is_visible?: boolean;
};

export type { BackdropId, SectionEffectId };

export type ThemePatch = {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_preference?: string;
};

export const BUSINESS_FACT_FIELDS = [
  "tagline",
  "description",
  "phone",
  "email",
  "city",
  "state",
  "service_area",
  "address",
  "review_link",
  "website",
] as const;
export type BusinessFactField = (typeof BUSINESS_FACT_FIELDS)[number];

export type AgentAction =
  | { type: "set_section_text"; sectionId: string; field: AgentField; value: string }
  | { type: "set_section_visibility"; sectionId: string; visible: boolean }
  | { type: "set_section_variant"; sectionId: string; variant: string }
  | {
      type: "add_section";
      pageId: string;
      kind: string;
      heading?: string | undefined;
      subheading?: string | undefined;
      body?: string | undefined;
      position?: number | undefined;
    }
  | { type: "delete_section"; sectionId: string }
  | { type: "reorder_sections"; pageId: string; sectionIds: string[] }
  | { type: "set_component"; componentId: string; patch: ComponentPatch }
  | {
      type: "add_component";
      sectionId: string;
      kind: string;
      label?: string | undefined;
      body?: string | undefined;
      link_url?: string | undefined;
      link_label?: string | undefined;
    }
  | { type: "delete_component"; componentId: string }
  | { type: "add_page"; kind: string; title: string; slug: string }
  | { type: "set_page"; pageId: string; patch: PageSeoPatch }
  | { type: "delete_page"; pageId: string }
  | { type: "set_theme"; patch: ThemePatch }
  | { type: "set_backdrop"; backdrop: BackdropId }
  | { type: "set_section_effect"; sectionId: string; effect: SectionEffectId }
  | { type: "set_business_fact"; field: BusinessFactField; value: string };

export type AgentStep = {
  /** Stable index used by the UI to include or skip a step. */
  key: string;
  /** One line a business owner understands. */
  title: string;
  /** Where the change lands, e.g. "Home → Hero". */
  where: string;
  /** Current value, when the step replaces text. */
  before?: string;
  /** New value, when the step writes text. */
  after?: string;
  /** True when the step removes something, so the UI can warn. */
  destructive: boolean;
  action: AgentAction;
};

export type AgentPlan = {
  /** Conversational answer to the request. */
  reply: string;
  /** What the whole plan achieves, in one or two sentences. */
  summary: string;
  steps: AgentStep[];
  /** Anything the agent needs from the client before it can do more. */
  questions: string[];
  /** Honest caveats: things it deliberately did not do. */
  notes: string[];
};

export type AgentTurn = { role: "user" | "assistant"; content: string };

/* ------------------------------- validation ------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const text = (value: unknown, max: number) => {
  const out = typeof value === "string" ? value.trim() : "";
  return out.slice(0, max);
};

const bool = (value: unknown) => value === true || value === "true";

const isField = (value: unknown): value is AgentField =>
  value === "heading" || value === "subheading" || value === "body";

const KIND = /^[a-z][a-z0-9_]{1,32}$/;

export const slugifyPath = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Turns whatever the model returned into actions we are willing to run. Unknown
 * types, unknown ids and out-of-range values are dropped rather than guessed at,
 * so a sloppy response can never write junk into a client's website.
 */
export function readActions(
  value: unknown,
  known: { pageIds: Set<string>; sectionIds: Set<string>; componentIds: Set<string> },
): AgentAction[] {
  if (!Array.isArray(value)) return [];
  const out: AgentAction[] = [];

  for (const raw of value.slice(0, MAX_ACTIONS * 2)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const type = text(row["type"], 40);
    const sectionId = text(row["sectionId"], 40);
    const pageId = text(row["pageId"], 40);
    const componentId = text(row["componentId"], 40);

    switch (type) {
      case "set_section_text": {
        const field = row["field"];
        const value2 = text(row["value"], 4000);
        if (!UUID.test(sectionId) || !known.sectionIds.has(sectionId)) break;
        if (!isField(field) || !value2) break;
        out.push({ type, sectionId, field, value: value2 });
        break;
      }
      case "set_section_visibility": {
        if (!known.sectionIds.has(sectionId)) break;
        out.push({ type, sectionId, visible: bool(row["visible"]) });
        break;
      }
      case "set_section_variant": {
        const variant = text(row["variant"], 40);
        if (!known.sectionIds.has(sectionId) || !KIND.test(variant)) break;
        out.push({ type, sectionId, variant });
        break;
      }
      case "add_section": {
        const kind = text(row["kind"], 40).toLowerCase();
        if (!known.pageIds.has(pageId) || !KIND.test(kind)) break;
        const position = Number(row["position"]);
        out.push({
          type,
          pageId,
          kind,
          heading: text(row["heading"], 200) || undefined,
          subheading: text(row["subheading"], 400) || undefined,
          body: text(row["body"], 4000) || undefined,
          position: Number.isFinite(position) && position >= 0 ? Math.floor(position) : undefined,
        });
        break;
      }
      case "delete_section": {
        if (!known.sectionIds.has(sectionId)) break;
        out.push({ type, sectionId });
        break;
      }
      case "reorder_sections": {
        const ids = Array.isArray(row["sectionIds"])
          ? (row["sectionIds"] as unknown[]).map((id) => text(id, 40)).filter((id) => known.sectionIds.has(id))
          : [];
        if (!known.pageIds.has(pageId) || ids.length < 2) break;
        out.push({ type, pageId, sectionIds: [...new Set(ids)] });
        break;
      }
      case "set_component": {
        const patchRaw = (row["patch"] ?? {}) as Record<string, unknown>;
        const patch: ComponentPatch = {};
        if (typeof patchRaw["label"] === "string") patch.label = text(patchRaw["label"], 200);
        if (typeof patchRaw["body"] === "string") patch.body = text(patchRaw["body"], 2000);
        if (typeof patchRaw["link_url"] === "string") {
          const safe = safeLinkUrl(text(patchRaw["link_url"], 400));
          if (safe) patch.link_url = safe;
        }
        if (typeof patchRaw["link_label"] === "string") patch.link_label = text(patchRaw["link_label"], 120);
        if ("is_visible" in patchRaw) patch.is_visible = bool(patchRaw["is_visible"]);
        if (!known.componentIds.has(componentId) || Object.keys(patch).length === 0) break;
        out.push({ type, componentId, patch });
        break;
      }
      case "add_component": {
        const kind = text(row["kind"], 40).toLowerCase();
        if (!known.sectionIds.has(sectionId) || !KIND.test(kind)) break;
        out.push({
          type,
          sectionId,
          kind,
          label: text(row["label"], 200) || undefined,
          body: text(row["body"], 2000) || undefined,
          link_url: safeLinkUrl(text(row["link_url"], 400)) ?? undefined,
          link_label: text(row["link_label"], 120) || undefined,
        });
        break;
      }
      case "delete_component": {
        if (!known.componentIds.has(componentId)) break;
        out.push({ type, componentId });
        break;
      }
      case "add_page": {
        const kind = text(row["kind"], 40).toLowerCase();
        const title = text(row["title"], 120);
        const slug = slugifyPath(text(row["slug"], 80) || title);
        if (!KIND.test(kind) || !title || !slug) break;
        out.push({ type, kind, title, slug });
        break;
      }
      case "set_page": {
        const patchRaw = (row["patch"] ?? {}) as Record<string, unknown>;
        const patch: PageSeoPatch = {};
        if (typeof patchRaw["title"] === "string") patch.title = text(patchRaw["title"], 120);
        if (typeof patchRaw["slug"] === "string") patch.slug = slugifyPath(text(patchRaw["slug"], 80));
        if ("is_visible" in patchRaw) patch.is_visible = bool(patchRaw["is_visible"]);
        if ("noindex" in patchRaw) patch.noindex = bool(patchRaw["noindex"]);
        if (typeof patchRaw["seo_title"] === "string") patch.seo_title = text(patchRaw["seo_title"], 70);
        if (typeof patchRaw["seo_description"] === "string")
          patch.seo_description = text(patchRaw["seo_description"], 165);
        if (typeof patchRaw["seo_canonical"] === "string") patch.seo_canonical = text(patchRaw["seo_canonical"], 300);
        if (typeof patchRaw["og_title"] === "string") patch.og_title = text(patchRaw["og_title"], 90);
        if (typeof patchRaw["og_description"] === "string")
          patch.og_description = text(patchRaw["og_description"], 200);
        if (!known.pageIds.has(pageId) || Object.keys(patch).length === 0) break;
        out.push({ type, pageId, patch });
        break;
      }
      case "delete_page": {
        if (!known.pageIds.has(pageId)) break;
        out.push({ type, pageId });
        break;
      }
      case "set_theme": {
        const patchRaw = (row["patch"] ?? {}) as Record<string, unknown>;
        const patch: ThemePatch = {};
        for (const key of ["primary_color", "secondary_color", "accent_color"] as const) {
          const colour = text(patchRaw[key], 9);
          if (HEX.test(colour)) patch[key] = colour;
        }
        const font = text(patchRaw["font_preference"], 60);
        if (font) patch.font_preference = font;
        if (Object.keys(patch).length === 0) break;
        out.push({ type, patch });
        break;
      }
      case "set_backdrop": {
        const backdrop = text(row["backdrop"], 30);
        if (!isBackdropId(backdrop)) break;
        out.push({ type, backdrop });
        break;
      }
      case "set_section_effect": {
        const effect = text(row["effect"], 30);
        if (!known.sectionIds.has(sectionId) || !isSectionEffectId(effect)) break;
        out.push({ type, sectionId, effect });
        break;
      }
      case "set_business_fact": {
        const field = text(row["field"], 40) as BusinessFactField;
        const value2 = text(row["value"], 1200);
        if (!BUSINESS_FACT_FIELDS.includes(field) || !value2) break;
        out.push({ type, field, value: value2 });
        break;
      }
      default:
        break;
    }
    if (out.length >= MAX_ACTIONS) break;
  }

  return out;
}

/* ------------------------------ descriptions ------------------------------ */

const FIELD_LABEL: Record<AgentField, string> = {
  heading: "headline",
  subheading: "sub-headline",
  body: "text",
};

export type SiteIndex = {
  pages: Map<string, { title: string; slug: string }>;
  sections: Map<string, { pageId: string; label: string }>;
  components: Map<string, { sectionId: string; label: string }>;
};

/** Human-readable "where" for a step, e.g. `Home → Hero`. */
function locate(
  index: SiteIndex,
  ids: { pageId?: string | undefined; sectionId?: string | undefined; componentId?: string | undefined },
): string {
  if (ids.componentId) {
    const component = index.components.get(ids.componentId);
    if (component) {
      const parent = locate(index, { sectionId: component.sectionId });
      return `${parent} → ${component.label}`;
    }
  }
  if (ids.sectionId) {
    const section = index.sections.get(ids.sectionId);
    if (section) {
      const page = index.pages.get(section.pageId);
      return `${page?.title ?? "Page"} → ${section.label}`;
    }
  }
  if (ids.pageId) return index.pages.get(ids.pageId)?.title ?? "Page";
  return "Your website";
}

/** Turns each action into a line the business owner can approve or skip. */
export function describeActions(actions: AgentAction[], index: SiteIndex, currentText: Map<string, string>): AgentStep[] {
  return actions.map((action, i) => {
    const key = `${i}-${action.type}`;
    switch (action.type) {
      case "set_section_text":
        return {
          key,
          title: `Rewrite the ${FIELD_LABEL[action.field]}`,
          where: locate(index, { sectionId: action.sectionId }),
          before: currentText.get(`${action.sectionId}:${action.field}`) ?? "",
          after: action.value,
          destructive: false,
          action,
        };
      case "set_section_visibility":
        return {
          key,
          title: action.visible ? "Show this section" : "Hide this section",
          where: locate(index, { sectionId: action.sectionId }),
          destructive: !action.visible,
          action,
        };
      case "set_section_variant":
        return {
          key,
          title: `Change the layout style to "${action.variant}"`,
          where: locate(index, { sectionId: action.sectionId }),
          destructive: false,
          action,
        };
      case "add_section":
        return {
          key,
          title: `Add a new ${action.kind.replace(/_/g, " ")} section`,
          where: locate(index, { pageId: action.pageId }),
          after: action.heading ?? action.body ?? "",
          destructive: false,
          action,
        };
      case "delete_section":
        return {
          key,
          title: "Remove this section",
          where: locate(index, { sectionId: action.sectionId }),
          destructive: true,
          action,
        };
      case "reorder_sections":
        return {
          key,
          title: "Reorder the sections on this page",
          where: locate(index, { pageId: action.pageId }),
          destructive: false,
          action,
        };
      case "set_component":
        return {
          key,
          title: "Update this item",
          where: locate(index, { componentId: action.componentId }),
          after: action.patch.label ?? action.patch.body ?? action.patch.link_label ?? action.patch.link_url ?? "",
          destructive: action.patch.is_visible === false,
          action,
        };
      case "add_component":
        return {
          key,
          title: `Add a new ${action.kind.replace(/_/g, " ")}`,
          where: locate(index, { sectionId: action.sectionId }),
          after: action.label ?? action.body ?? "",
          destructive: false,
          action,
        };
      case "delete_component":
        return {
          key,
          title: "Remove this item",
          where: locate(index, { componentId: action.componentId }),
          destructive: true,
          action,
        };
      case "add_page":
        return {
          key,
          title: `Add a new page: ${action.title}`,
          where: `/${action.slug}`,
          destructive: false,
          action,
        };
      case "set_page": {
        const fields = Object.keys(action.patch)
          .map((field) => field.replace(/_/g, " "))
          .join(", ");
        return {
          key,
          title: `Update page settings (${fields})`,
          where: locate(index, { pageId: action.pageId }),
          after: action.patch.title ?? action.patch.seo_title ?? action.patch.seo_description ?? "",
          destructive: action.patch.is_visible === false,
          action,
        };
      }
      case "delete_page":
        return {
          key,
          title: "Delete this page and everything on it",
          where: locate(index, { pageId: action.pageId }),
          destructive: true,
          action,
        };
      case "set_theme":
        return {
          key,
          title: `Update the look (${Object.keys(action.patch).map((f) => f.replace(/_/g, " ")).join(", ")})`,
          where: "Whole website",
          after: Object.values(action.patch).join("  "),
          destructive: false,
          action,
        };
      case "set_backdrop":
        return {
          key,
          title: `Install the "${backdropLabel(action.backdrop)}" animated background`,
          where: "Whole website",
          destructive: false,
          action,
        };
      case "set_section_effect":
        return {
          key,
          title: `Add the "${sectionEffectLabel(action.effect)}" effect to this section`,
          where: locate(index, { sectionId: action.sectionId }),
          destructive: false,
          action,
        };
      case "set_business_fact":
        return {
          key,
          title: `Update your ${action.field.replace(/_/g, " ")}`,
          where: "Business details",
          after: action.value,
          destructive: false,
          action,
        };
    }
  });
}

/* ------------------------------- attachments ------------------------------- */

/**
 * The assistant accepts photos, video and voice as well as text. Attachments are
 * context only — the model reads them to understand what the owner is pointing
 * at ("match this van wrap", "this is the finished job", "write it like this
 * flyer") and never gains new abilities from them.
 */
export const MAX_ATTACHMENTS = 4;

export const ATTACHMENT_LIMITS: Record<AgentAttachmentKind, number> = {
  image: 6 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 8 * 1024 * 1024,
};

export type AgentAttachmentKind = "image" | "video" | "audio";

/**
 * One moment in an attached clip. Revora writes these automatically so the
 * owner can say "use the shot at 0:12" instead of describing it.
 */
export type AgentChapter = {
  /** Display timestamp, e.g. "0:12". */
  at: string;
  label: string;
  detail: string;
};

export type AgentAttachment = {
  kind: AgentAttachmentKind;
  /** e.g. image/jpeg, video/mp4, audio/webm */
  mimeType: string;
  name: string;
  /** `data:<mime>;base64,<payload>` */
  dataUrl: string;
  /** Auto-written moments for a video clip, so the owner can reference them. */
  chapters?: AgentChapter[];
};

export const MAX_CHAPTERS = 10;

/** Sanitises model- or client-supplied chapter lists. */
export function readChapters(value: unknown): AgentChapter[] {
  if (!Array.isArray(value)) return [];
  const out: AgentChapter[] = [];
  for (const raw of value.slice(0, MAX_CHAPTERS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const at = typeof item["at"] === "string" ? item["at"].slice(0, 12) : "";
    const label = typeof item["label"] === "string" ? item["label"].slice(0, 120) : "";
    const detail = typeof item["detail"] === "string" ? item["detail"].slice(0, 400) : "";
    if (!label && !detail) continue;
    out.push({ at: at || "0:00", label: label || "Moment", detail });
  }
  return out;
}

/**
 * One-tap starting points for the most common edits. Used for the quick voice
 * and click commands next to the assistant box — each one is a full, safe
 * instruction the owner can still edit before sending.
 */
export const QUICK_COMMANDS: { label: string; instruction: string }[] = [
  {
    label: "Change hero text",
    instruction:
      "Rewrite the hero heading and subheading on the home page so the main benefit and service area are obvious in the first line, and make the main button copy action-led.",
  },
  {
    label: "Add gallery",
    instruction:
      "Add a photo gallery section to the home page showing recent work, with a short introduction line, and link it from the menu if a gallery page makes more sense.",
  },
  {
    label: "Update pricing section",
    instruction:
      "Update the pricing section so each package has a clear name, what's included and a starting price, and make the most popular option stand out. Ask me for any prices you don't already have.",
  },
  {
    label: "Sharpen the call to action",
    instruction:
      "Make every call to action on the site consistent and specific — same wording, same promise, and a booking or quote button visible on every page.",
  },
  {
    label: "Add customer reviews",
    instruction:
      "Add a reviews section high on the home page using the reviews already in my workspace, and move it above the services section.",
  },
  {
    label: "Write my search text",
    instruction:
      "Write a page title and meta description for every page, plus social share text for the home page, using my real services and city.",
  },
];

/**
 * Guided multimodal templates. Each one tells the owner exactly what to attach
 * and gives the assistant a consistent brief, so a before/after clip or a set
 * of job photos produces the same quality of update every time.
 */
export const MULTIMODAL_TEMPLATES: {
  key: string;
  label: string;
  attach: string;
  instruction: string;
}[] = [
  {
    key: "before-after",
    label: "Before / after job",
    attach: "A short before/after clip, or one before photo and one after photo",
    instruction:
      "I've attached a before/after of a recent job. Write a short case-study block for the home page: a headline about the transformation, two or three sentences describing what was done (only what you can actually see), and a button to book the same service. Add the photos to the gallery section, and tell me any detail you need from me instead of guessing prices or timings.",
  },
  {
    key: "walkthrough",
    label: "Walkthrough clip",
    attach: "A 30–60 second clip talking through your business or a job",
    instruction:
      "I've attached a walkthrough clip. Use the chapters you wrote for it to update my website: pull the services mentioned into the services section, use my own words for the about section, and list anything I said that you can't verify as a question for me instead of publishing it.",
  },
  {
    key: "photo-refresh",
    label: "Photo refresh",
    attach: "Two to four recent job photos",
    instruction:
      "I've attached recent job photos. Refresh the gallery section with them, write one short caption per photo describing only what's visible, and update the hero image guidance to match the style of these photos.",
  },
  {
    key: "competitor-flyer",
    label: "Match a flyer or design",
    attach: "A photo or screenshot of the flyer, van wrap or page you like",
    instruction:
      "I've attached a design I like. Match its tone and structure on my home page — section order, heading style and colour feel — but keep every fact, price and service my own. Don't copy any wording or claims from the image.",
  },
];


export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
export const AUDIO_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/m4a", "audio/x-m4a"];

export const ATTACHMENT_ACCEPT = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",");

export function attachmentKindOf(mimeType: string): AgentAttachmentKind | null {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (IMAGE_MIME_TYPES.includes(mime)) return "image";
  if (VIDEO_MIME_TYPES.includes(mime)) return "video";
  if (AUDIO_MIME_TYPES.includes(mime)) return "audio";
  return null;
}

/** Roughly how many bytes a base64 payload decodes to. */
export function base64Bytes(dataUrl: string) {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((payload.length * 3) / 4);
}

/**
 * Server-side gate: only well-formed data URLs of an allowed type and size get
 * through, so a crafted request can't push arbitrary bytes at the model.
 */
export function readAttachments(value: unknown): AgentAttachment[] {
  if (!Array.isArray(value)) return [];
  const out: AgentAttachment[] = [];
  for (const raw of value.slice(0, MAX_ATTACHMENTS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const dataUrl = typeof item["dataUrl"] === "string" ? item["dataUrl"] : "";
    // Browser recordings carry codec parameters (audio/webm;codecs=opus) — accept
    // and drop them, since only the base media type decides what we allow.
    const match = /^data:([a-z0-9.+/-]+)((?:;[a-z0-9.+=_-]+)*);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
    if (!match) continue;
    const mimeType = (match[1] ?? "").toLowerCase();

    const kind = attachmentKindOf(mimeType);
    if (!kind) continue;
    const clean = `data:${mimeType};base64,${(match[3] ?? "").replace(/\s+/g, "")}`;
    if (base64Bytes(clean) > ATTACHMENT_LIMITS[kind]) continue;
    const name = typeof item["name"] === "string" ? item["name"].slice(0, 120) : `${kind} attachment`;
    const chapters = kind === "video" ? readChapters(item["chapters"]) : [];
    out.push({ kind, mimeType, name, dataUrl: clean, ...(chapters.length ? { chapters } : {}) });

  }
  return out;
}
