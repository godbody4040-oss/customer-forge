/* -------------------------------------------------------------------------- */
/* QUICK COMMANDS + MULTIMODAL TEMPLATES                                     */
/* -------------------------------------------------------------------------- */

/**
 * Fast commands exposed by SiteChatbot.
 *
 * These are intentionally plain data objects so the chatbot can render
 * them without depending on the builder implementation.
 *
 * IMPORTANT:
 * These commands describe user intent only.
 * They do NOT execute actions directly.
 */
export type QuickCommand = {
  id: string;
  label: string;
  prompt: string;
  description?: string;
};

/**
 * High-value one-tap builder commands.
 *
 * Keep these aligned with capabilities already supported by the
 * deterministic builder and site-agent action contract.
 */
export const QUICK_COMMANDS: QuickCommand[] = [
  {
    id: "make-premium",
    label: "Make it premium",
    prompt:
      "Make the website look more premium, polished, modern, and conversion-focused while preserving the business facts, brand identity, and existing functionality.",
    description:
      "Upgrade visual hierarchy, spacing, composition, effects, and presentation.",
  },

  {
    id: "add-3d-depth",
    label: "Add 3D depth",
    prompt:
      "Add tasteful 3D depth, layered visual hierarchy, floating elements, and modern motion where appropriate. Keep it fast, responsive, accessible, and professional.",
    description:
      "Add depth without making the website distracting or slow.",
  },

  {
    id: "improve-homepage",
    label: "Improve homepage",
    prompt:
      "Improve the homepage from top to bottom for clarity, visual quality, mobile responsiveness, SEO, lead generation, and conversion while preserving accurate business information.",
    description:
      "Strengthen the complete homepage experience.",
  },

  {
    id: "fix-mobile",
    label: "Fix mobile",
    prompt:
      "Audit and improve the entire website for mobile responsiveness. Fix overflow, spacing, typography, buttons, navigation, images, cards, sections, and touch targets without breaking desktop.",
    description:
      "Make every important page work cleanly on phones and tablets.",
  },

  {
    id: "improve-seo",
    label: "Improve SEO",
    prompt:
      "Improve the website's SEO using only accurate existing business information. Audit page titles, descriptions, headings, internal links, visibility, canonical settings, and page structure without inventing facts.",
    description:
      "Strengthen technical and on-page SEO safely.",
  },
];

/**
 * Templates shown when the user attaches visual or media context.
 *
 * These templates are prompts only. They do not bypass validation,
 * authorization, RLS, or the AgentAction contract.
 */
export type MultimodalTemplate = {
  id: string;
  label: string;
  prompt: string;
  acceptedKinds: AgentAttachmentKind[];
  description?: string;
};

export const MULTIMODAL_TEMPLATES: MultimodalTemplate[] = [
  {
    id: "hero-photo",
    label: "Use as hero photo",
    prompt:
      "Use the attached image as the website hero visual when appropriate. Preserve the original business facts and choose a responsive composition that keeps the important subject visible.",
    acceptedKinds: ["image"],
    description:
      "Turn an uploaded business image into a strong hero visual.",
  },

  {
    id: "work-gallery",
    label: "Build a work gallery",
    prompt:
      "Use the attached business photos to improve the work or portfolio presentation. Favor real customer-owned media, avoid unnecessary duplication, and create a polished responsive gallery.",
    acceptedKinds: ["image", "video"],
    description:
      "Use real business media to strengthen portfolio presentation.",
  },

  {
    id: "brand-reference",
    label: "Match this brand",
    prompt:
      "Use the attached visual as a brand reference. Extract only safe visual direction such as general mood, composition, spacing, typography feel, and visual hierarchy. Do not copy protected assets or fabricate business facts.",
    acceptedKinds: ["image"],
    description:
      "Use an uploaded reference to guide visual direction.",
  },

  {
    id: "site-review",
    label: "Review this design",
    prompt:
      "Review the attached visual or media and identify practical improvements to the website's layout, hierarchy, visual composition, responsiveness, accessibility, and conversion experience. Preserve accurate business information.",
    acceptedKinds: ["image", "video"],
    description:
      "Turn visual feedback into safe website improvements.",
  },
];