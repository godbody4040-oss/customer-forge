/**
 * Revora Infinite Creative Engine — visual compositions (pure layer).
 *
 * The old effects catalog answered "which of my 7 backdrops do you want?".
 * This module answers a different question: "what visual experience should
 * THIS website have?" — and builds it out of primitives.
 *
 * A composition is a stack of tunable visual layers (stars, light rays, fog,
 * liquid motion, textures, holographic sheen…), each with its own density,
 * speed, scale, colour, motion, parallax and interaction. Any plain-language
 * request is interpreted into that stack, so requests we have never seen
 * before ("make it feel underwater", "a moving galaxy behind the hero",
 * "premium magazine") still produce a real, buildable result instead of
 * "that isn't available".
 *
 * Safety and performance are part of the type, not an afterthought:
 *  - layer kinds, motions, palettes and interactions are allowlisted enums,
 *    every number is clamped — no raw CSS, HTML or scripts are ever stored,
 *  - a performance budget caps layer count and heavy layers,
 *  - each layer declares its own mobile behaviour, and all motion is dropped
 *    for visitors who prefer reduced motion (handled in CSS).
 *
 * Storage (no schema change): `website_settings.generation.effects.composition`.
 */

export type LayerKind =
  | "stars"
  | "constellation"
  | "meteors"
  | "particles"
  | "orbs"
  | "rays"
  | "spotlight"
  | "aurora"
  | "nebula"
  | "mesh"
  | "grid"
  | "blueprint"
  | "streaks"
  | "waves"
  | "liquid"
  | "fog"
  | "rain"
  | "snow"
  | "holo"
  | "metal"
  | "texture"
  | "pattern"
  | "vignette";

export type LayerMotion = "still" | "drift" | "sweep" | "pulse" | "fall" | "rise" | "orbit";
export type LayerPalette = "brand" | "accent" | "cool" | "warm" | "mono" | "deep";
export type LayerInteraction = "none" | "cursor" | "scroll" | "both";
export type LayerMobile = "keep" | "simplify" | "off";

export type VisualLayer = {
  kind: LayerKind;
  /** 0–100. How much of it there is. */
  density: number;
  /** 0–100. How fast it moves. */
  speed: number;
  /** 0–100. How large each element reads. */
  scale: number;
  /** 0–100. Strength on the page. */
  opacity: number;
  palette: LayerPalette;
  motion: LayerMotion;
  /** 0–100. How much depth separation it gets. */
  parallax: number;
  interaction: LayerInteraction;
  mobile: LayerMobile;
};

export type VisualComposition = {
  /** Stable id so the same concept can be recognised and rolled back. */
  id: string;
  name: string;
  /** One line the business owner understands. */
  summary: string;
  layers: VisualLayer[];
  /** 0–100 global strength; scales every layer at render time. */
  intensity: number;
  /** Where the request came from — useful for the originality score. */
  origin: "prompt" | "command" | "auto" | "manual";
};

export const LAYER_LIBRARY: { kind: LayerKind; label: string; help: string; cost: number }[] = [
  { kind: "stars", label: "Starfield", help: "Drifting stars with depth.", cost: 1 },
  { kind: "constellation", label: "Constellations", help: "Linked star points, quiet and technical.", cost: 1 },
  { kind: "meteors", label: "Meteor trails", help: "Occasional light streaks falling across the page.", cost: 2 },
  { kind: "particles", label: "Floating particles", help: "Fine motes suspended in the air.", cost: 2 },
  { kind: "orbs", label: "Glowing orbs", help: "Soft spheres of light behind the content.", cost: 2 },
  { kind: "rays", label: "Light rays", help: "Directional beams, cinematic and premium.", cost: 1 },
  { kind: "spotlight", label: "Spotlight", help: "One wide beam that lifts the top of the page.", cost: 1 },
  { kind: "aurora", label: "Aurora", help: "Slow bands of coloured light.", cost: 2 },
  { kind: "nebula", label: "Nebula", help: "Deep drifting colour clouds.", cost: 2 },
  { kind: "mesh", label: "Mesh gradient", help: "Blended colour wash that shifts very slowly.", cost: 1 },
  { kind: "grid", label: "Tech grid", help: "Faint engineered grid lines.", cost: 1 },
  { kind: "blueprint", label: "Blueprint", help: "Technical drawing lines — trades and engineering.", cost: 1 },
  { kind: "streaks", label: "Light streaks", help: "Fast horizontal light trails.", cost: 2 },
  { kind: "waves", label: "Energy waves", help: "Rolling wave bands, calm and organic.", cost: 2 },
  { kind: "liquid", label: "Liquid motion", help: "Slow water-like movement.", cost: 2 },
  { kind: "fog", label: "Fog / smoke", help: "Atmospheric haze for depth.", cost: 2 },
  { kind: "rain", label: "Rain", help: "Fine falling lines.", cost: 2 },
  { kind: "snow", label: "Snow", help: "Soft falling flecks.", cost: 2 },
  { kind: "holo", label: "Holographic sheen", help: "Iridescent shift across the page.", cost: 2 },
  { kind: "metal", label: "Metallic / chrome", help: "Brushed metal light sweep.", cost: 1 },
  { kind: "texture", label: "Texture", help: "Paper, concrete, marble or fabric grain.", cost: 1 },
  { kind: "pattern", label: "Editorial pattern", help: "Repeating geometry for magazine energy.", cost: 1 },
  { kind: "vignette", label: "Vignette", help: "Darkened edges that focus the centre.", cost: 1 },
];

const LAYER_KINDS = new Set(LAYER_LIBRARY.map((entry) => entry.kind));
const MOTIONS: LayerMotion[] = ["still", "drift", "sweep", "pulse", "fall", "rise", "orbit"];
const PALETTES: LayerPalette[] = ["brand", "accent", "cool", "warm", "mono", "deep"];
const INTERACTIONS: LayerInteraction[] = ["none", "cursor", "scroll", "both"];
const MOBILES: LayerMobile[] = ["keep", "simplify", "off"];

export const layerLabel = (kind: LayerKind) =>
  LAYER_LIBRARY.find((entry) => entry.kind === kind)?.label ?? kind;

/* ------------------------------ performance ------------------------------ */

/** Layers beyond this never render; the engine trims the weakest first. */
export const MAX_LAYERS = 4;
/** Total render cost allowed on one page. Keeps phones smooth. */
export const MAX_COST = 6;

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
};

const layerCost = (layer: VisualLayer) => {
  const base = LAYER_LIBRARY.find((entry) => entry.kind === layer.kind)?.cost ?? 1;
  return base + (layer.density > 70 ? 1 : 0);
};

/** Validates, clamps and performance-trims anything claiming to be a layer stack. */
export function safeLayers(value: unknown): VisualLayer[] {
  if (!Array.isArray(value)) return [];
  const layers: VisualLayer[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const kind = entry["kind"];
    if (typeof kind !== "string" || !LAYER_KINDS.has(kind as LayerKind)) continue;
    if (layers.some((existing) => existing.kind === kind)) continue;

    layers.push({
      kind: kind as LayerKind,
      density: clamp(entry["density"], 0, 100, 50),
      speed: clamp(entry["speed"], 0, 100, 40),
      scale: clamp(entry["scale"], 0, 100, 50),
      opacity: clamp(entry["opacity"], 0, 100, 55),
      palette: PALETTES.includes(entry["palette"] as LayerPalette) ? (entry["palette"] as LayerPalette) : "brand",
      motion: MOTIONS.includes(entry["motion"] as LayerMotion) ? (entry["motion"] as LayerMotion) : "drift",
      parallax: clamp(entry["parallax"], 0, 100, 30),
      interaction: INTERACTIONS.includes(entry["interaction"] as LayerInteraction)
        ? (entry["interaction"] as LayerInteraction)
        : "none",
      mobile: MOBILES.includes(entry["mobile"] as LayerMobile) ? (entry["mobile"] as LayerMobile) : "simplify",
    });
  }

  const trimmed: VisualLayer[] = [];
  let cost = 0;
  for (const layer of layers.slice(0, MAX_LAYERS)) {
    const next = cost + layerCost(layer);
    if (next > MAX_COST) continue;
    cost = next;
    trimmed.push(layer);
  }
  return trimmed;
}

export function safeComposition(value: unknown): VisualComposition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const layers = safeLayers(entry["layers"]);
  if (!layers.length) return null;
  const origin = entry["origin"];
  return {
    id: typeof entry["id"] === "string" ? entry["id"].slice(0, 60) : `comp-${signature(layers)}`,
    name: typeof entry["name"] === "string" ? entry["name"].slice(0, 60) : "Custom visual",
    summary: typeof entry["summary"] === "string" ? entry["summary"].slice(0, 240) : describeComposition(layers),
    layers,
    intensity: clamp(entry["intensity"], 10, 100, 65),
    origin:
      origin === "prompt" || origin === "command" || origin === "auto" || origin === "manual" ? origin : "manual",
  };
}

/** Reads the composition out of `website_settings.generation`. */
export function readComposition(generation: unknown): VisualComposition | null {
  const effects = (generation as { effects?: unknown } | null)?.effects;
  return safeComposition((effects as { composition?: unknown } | null)?.composition);
}

/** Merges a composition (or `null` to clear it) into a `generation` blob. */
export function writeComposition(generation: unknown, composition: VisualComposition | null) {
  const base = (generation && typeof generation === "object" ? generation : {}) as Record<string, unknown>;
  const effects = (base["effects"] && typeof base["effects"] === "object"
    ? base["effects"]
    : {}) as Record<string, unknown>;
  const next = { ...effects };
  if (composition) next["composition"] = composition;
  else delete next["composition"];
  return { ...base, effects: next };
}

/* ------------------------------- language -------------------------------- */

const layer = (kind: LayerKind, patch: Partial<VisualLayer> = {}): VisualLayer => ({
  kind,
  density: 50,
  speed: 35,
  scale: 50,
  opacity: 55,
  palette: "brand",
  motion: "drift",
  parallax: 30,
  interaction: "none",
  mobile: "simplify",
  ...patch,
});

type Recipe = { match: RegExp; name: string; summary: string; layers: VisualLayer[] };

/**
 * Plain-language → visual primitives. Each recipe is a *starting stack*; the
 * modifiers below then retune it, so "a slow luxury galaxy that reacts to my
 * cursor" and "a fast bright galaxy" produce genuinely different results.
 */
const RECIPES: Recipe[] = [
  {
    match: /galax|space|cosmic|univers|interstell|travel(l)?ing through/,
    name: "Deep space",
    summary: "A slow galaxy behind the page: drifting stars, nebula colour and light depth.",
    layers: [
      layer("nebula", { opacity: 45, speed: 18, palette: "deep", parallax: 55 }),
      layer("stars", { density: 70, speed: 22, parallax: 70, interaction: "scroll" }),
      layer("meteors", { density: 25, speed: 60, opacity: 40 }),
    ],
  },
  {
    match: /constellation|star map|zodiac/,
    name: "Constellation",
    summary: "Linked star points that quietly connect across the page.",
    layers: [
      layer("constellation", { density: 55, speed: 20, interaction: "cursor", parallax: 45 }),
      layer("vignette", { opacity: 40, motion: "still" }),
    ],
  },
  {
    match: /underwater|ocean|sea|aqua|water|wave|liquid|fluid/,
    name: "Underwater",
    summary: "Slow liquid motion, drifting light and soft depth — calm and expensive.",
    layers: [
      layer("liquid", { speed: 16, opacity: 50, palette: "cool", parallax: 40 }),
      layer("waves", { speed: 22, opacity: 40, palette: "cool" }),
      layer("particles", { density: 35, speed: 14, motion: "rise", opacity: 35 }),
    ],
  },
  {
    match: /cinemat|film|movie|dramatic|hollywood/,
    name: "Cinematic",
    summary: "Directional light, controlled shadow and a focused centre — a film-set feel.",
    layers: [
      layer("rays", { opacity: 45, speed: 20, motion: "sweep", palette: "warm" }),
      layer("fog", { density: 40, speed: 14, opacity: 35 }),
      layer("vignette", { opacity: 55, motion: "still" }),
    ],
  },
  {
    match: /futur|sci.?fi|control cent|command cent|interface|hologra|cyber|digital world|data/,
    name: "Futuristic control centre",
    summary: "Engineered grid, data streaks and a holographic sheen.",
    layers: [
      layer("grid", { opacity: 35, speed: 25, parallax: 25, interaction: "scroll" }),
      layer("streaks", { density: 40, speed: 70, opacity: 45, palette: "cool" }),
      layer("holo", { opacity: 30, speed: 30, interaction: "cursor" }),
    ],
  },
  {
    match: /luxur|expensive|high.?end|premium|gold|elite|opulent/,
    name: "Quiet luxury",
    summary: "Gold light, brushed metal sheen and generous darkness.",
    layers: [
      layer("spotlight", { opacity: 45, speed: 18, palette: "brand", interaction: "cursor" }),
      layer("metal", { opacity: 30, speed: 22, motion: "sweep" }),
      layer("particles", { density: 22, speed: 12, scale: 30, opacity: 30, motion: "rise" }),
    ],
  },
  {
    match: /magic|dream|enchant|fairy|sparkl|whimsic/,
    name: "Magical",
    summary: "Floating light motes, soft orbs and a gentle glow.",
    layers: [
      layer("orbs", { density: 40, speed: 20, opacity: 40, motion: "orbit" }),
      layer("particles", { density: 55, speed: 25, motion: "rise", interaction: "cursor" }),
      layer("aurora", { opacity: 35, speed: 18 }),
    ],
  },
  {
    match: /storm|rain|wet|monsoon/,
    name: "Rainfall",
    summary: "Fine falling rain with atmospheric haze behind it.",
    layers: [
      layer("rain", { density: 55, speed: 75, opacity: 35, motion: "fall", palette: "cool" }),
      layer("fog", { density: 35, speed: 12, opacity: 30 }),
    ],
  },
  {
    match: /snow|winter|frost|ice|christmas|holiday/,
    name: "Snowfall",
    summary: "Soft falling flecks and cool light.",
    layers: [
      layer("snow", { density: 50, speed: 30, opacity: 40, motion: "fall", palette: "mono" }),
      layer("mesh", { opacity: 30, speed: 12, palette: "cool" }),
    ],
  },
  {
    match: /smoke|fog|mist|haze|moody|atmospher/,
    name: "Atmospheric",
    summary: "Drifting haze that adds depth without noise.",
    layers: [
      layer("fog", { density: 55, speed: 14, opacity: 45 }),
      layer("vignette", { opacity: 45, motion: "still" }),
    ],
  },
  {
    match: /fire|ember|heat|forge|weld|flame/,
    name: "Forge light",
    summary: "Warm rising embers and heat glow — heavy trades and craft work.",
    layers: [
      layer("particles", { density: 45, speed: 40, motion: "rise", palette: "warm", opacity: 45 }),
      layer("orbs", { density: 25, speed: 18, palette: "warm", opacity: 35 }),
      layer("vignette", { opacity: 50, motion: "still" }),
    ],
  },
  {
    match: /magazine|editorial|print|typograph|fashion/,
    name: "Editorial",
    summary: "Paper texture and quiet geometry — a printed-magazine feel.",
    layers: [
      layer("texture", { opacity: 35, motion: "still", palette: "mono" }),
      layer("pattern", { opacity: 25, speed: 10, palette: "mono" }),
    ],
  },
  {
    match: /blueprint|technical|engineer|architect|drawing|plan/,
    name: "Blueprint",
    summary: "Technical drawing lines behind the content — credible and precise.",
    layers: [
      layer("blueprint", { opacity: 32, speed: 14, palette: "cool", interaction: "scroll" }),
      layer("vignette", { opacity: 35, motion: "still" }),
    ],
  },
  {
    match: /marble|stone|concrete|wood|fabric|paper|texture|grain/,
    name: "Material",
    summary: "A real material surface behind the page instead of flat colour.",
    layers: [layer("texture", { opacity: 40, motion: "still" }), layer("vignette", { opacity: 35, motion: "still" })],
  },
  {
    match: /aurora|northern light/,
    name: "Aurora",
    summary: "Slow bands of coloured light across the whole site.",
    layers: [
      layer("aurora", { opacity: 50, speed: 22, parallax: 40 }),
      layer("stars", { density: 35, speed: 15, opacity: 35 }),
    ],
  },
  {
    match: /minimal|clean|simple|quiet|plain|calm/,
    name: "Minimal",
    summary: "Almost nothing: one soft light wash so the words do the work.",
    layers: [layer("mesh", { opacity: 25, speed: 10, motion: "drift" })],
  },
  {
    match: /bold|loud|striking|high.?contrast|aggressive|energetic/,
    name: "Bold",
    summary: "Strong contrast, fast light streaks and a hard focus.",
    layers: [
      layer("streaks", { density: 55, speed: 80, opacity: 50 }),
      layer("vignette", { opacity: 60, motion: "still" }),
    ],
  },
  {
    match: /human|warm|friendly|family|welcoming|approachable/,
    name: "Warm and human",
    summary: "Soft warm light with almost no motion — friendly, not flashy.",
    layers: [
      layer("mesh", { opacity: 35, speed: 12, palette: "warm" }),
      layer("orbs", { density: 20, speed: 12, opacity: 25, palette: "warm" }),
    ],
  },
  {
    match: /particle|dust|mote|floating/,
    name: "Floating particles",
    summary: "Fine particles suspended behind the content.",
    layers: [layer("particles", { density: 50, speed: 25, motion: "rise", interaction: "cursor" })],
  },
  {
    match: /spotlight|stage|beam|focus/,
    name: "Spotlight",
    summary: "One wide beam that lifts the hero and follows the visitor.",
    layers: [layer("spotlight", { opacity: 50, speed: 18, interaction: "cursor" })],
  },
  {
    match: /grid|tech|network|circuit/,
    name: "Tech grid",
    summary: "A faint engineered grid with depth on scroll.",
    layers: [
      layer("grid", { opacity: 35, speed: 22, interaction: "scroll" }),
      layer("particles", { density: 25, speed: 20, opacity: 30, palette: "cool" }),
    ],
  },
  {
    match: /chrome|metal|steel|silver|industrial/,
    name: "Brushed metal",
    summary: "A metallic sheen that sweeps slowly across the page.",
    layers: [
      layer("metal", { opacity: 35, speed: 24, motion: "sweep" }),
      layer("grid", { opacity: 22, speed: 14 }),
    ],
  },
];

type Modifier = { match: RegExp; apply: (layers: VisualLayer[]) => VisualLayer[]; note: string };

const map = (layers: VisualLayer[], fn: (l: VisualLayer) => VisualLayer) => layers.map(fn);

const MODIFIERS: Modifier[] = [
  {
    match: /slow|calm|gentle|subtle|soft|quiet/,
    note: "slower and softer",
    apply: (l) => map(l, (x) => ({ ...x, speed: Math.round(x.speed * 0.5), opacity: Math.round(x.opacity * 0.8) })),
  },
  {
    match: /fast|quick|energetic|lively|dynamic/,
    note: "faster",
    apply: (l) => map(l, (x) => ({ ...x, speed: Math.min(100, Math.round(x.speed * 1.6)) })),
  },
  {
    match: /strong|intense|dramatic|heavy|more visible|bolder/,
    note: "stronger",
    apply: (l) => map(l, (x) => ({ ...x, opacity: Math.min(100, Math.round(x.opacity * 1.35)) })),
  },
  {
    match: /brighter|lighter|airy/,
    note: "brighter",
    apply: (l) => map(l, (x) => ({ ...x, opacity: Math.min(100, x.opacity + 12), palette: "accent" })),
  },
  {
    match: /dark|deep|moody|black/,
    note: "deeper",
    apply: (l) => map(l, (x) => ({ ...x, palette: x.palette === "brand" ? "deep" : x.palette })),
  },
  {
    match: /gold/,
    note: "gold",
    apply: (l) => map(l, (x) => ({ ...x, palette: "brand" })),
  },
  {
    match: /cursor|finger|mouse|pointer|touch|react|interactive|follow/,
    note: "reacts to the visitor",
    apply: (l) => map(l, (x, i) => (i === 0 ? { ...x, interaction: x.interaction === "scroll" ? "both" : "cursor" } : x)),
  },
  {
    match: /scroll|as (i|you) scroll|parallax|depth/,
    note: "moves with scrolling",
    apply: (l) =>
      map(l, (x) => ({
        ...x,
        parallax: Math.min(100, x.parallax + 25),
        interaction: x.interaction === "cursor" ? "both" : "scroll",
      })),
  },
  {
    match: /mobile|phone/,
    note: "tuned for phones",
    apply: (l) => map(l, (x) => ({ ...x, mobile: "simplify" })),
  },
  {
    match: /dense|busy|lots of|more of/,
    note: "denser",
    apply: (l) => map(l, (x) => ({ ...x, density: Math.min(100, x.density + 25) })),
  },
  {
    match: /sparse|fewer|less/,
    note: "sparser",
    apply: (l) => map(l, (x) => ({ ...x, density: Math.max(5, x.density - 25) })),
  },
];

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "visual";

/** Short stable fingerprint of a layer stack — used for ids and originality. */
export function signature(layers: VisualLayer[]): string {
  const text = layers
    .map((l) => `${l.kind}:${Math.round(l.density / 10)}${Math.round(l.speed / 10)}${l.palette}${l.motion}`)
    .sort()
    .join("|");
  let out = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    out ^= text.charCodeAt(i);
    out = Math.imul(out, 16777619) >>> 0;
  }
  return out.toString(36);
}

export function describeComposition(layers: VisualLayer[]): string {
  if (!layers.length) return "No background effects.";
  const parts = layers.map((l) => layerLabel(l.kind).toLowerCase());
  const interactive = layers.some((l) => l.interaction !== "none");
  const last = parts.pop();
  const list = parts.length ? `${parts.join(", ")} and ${last}` : last;
  return `${list}${interactive ? ", reacting to the visitor" : ""}.`;
}

/** Plain-language brief a business owner can approve. */
export function compositionPreview(composition: VisualComposition): string[] {
  return [
    composition.summary,
    ...composition.layers.map(
      (l) =>
        `${layerLabel(l.kind)} — ${l.density}% density, ${l.speed}% speed, ${l.opacity}% strength${
          l.interaction === "none" ? "" : `, follows ${l.interaction === "both" ? "cursor and scroll" : l.interaction}`
        }${l.mobile === "off" ? ", desktop only" : l.mobile === "simplify" ? ", simplified on phones" : ""}`,
    ),
    `Overall strength ${composition.intensity}% · ${composition.layers.length} layer${
      composition.layers.length === 1 ? "" : "s"
    } · reduced-motion visitors see a still version`,
  ];
}

/* -------------------------- industry starting point ------------------------- */

const INDUSTRY_SEED: { match: RegExp; recipe: string }[] = [
  { match: /auto|detail|car|vehicle|mechanic|tint|wrap/, recipe: "cinematic" },
  { match: /solar|smart|security|ev|energy|automation|it|tech|network|camera/, recipe: "futuristic" },
  { match: /roof|remodel|construct|concrete|weld|contract|build/, recipe: "blueprint" },
  { match: /clean|wash|maid|janitor|pressure/, recipe: "underwater" },
  { match: /law|account|financ|consult|advis|insur/, recipe: "editorial" },
  { match: /salon|beauty|spa|lash|nail|hair|aesthet/, recipe: "luxury" },
  { match: /restaur|food|cafe|bar|bake|cater/, recipe: "cinematic" },
  { match: /child|kid|play|nursery|tutor/, recipe: "magical" },
  { match: /lawn|tree|garden|landscap|pest|septic/, recipe: "atmospheric" },
  { match: /photo|event|wedding|music|entertain/, recipe: "galaxy" },
];

/** What this business should start from before anyone types a word. */
export function seedPromptFor(industry: string | null | undefined, services: { name: string }[]): string {
  const text = `${industry ?? ""} ${services.map((s) => s.name).join(" ")}`.toLowerCase();
  return INDUSTRY_SEED.find((entry) => entry.match.test(text))?.recipe ?? "luxury";
}

/* ------------------------------ interpreter ------------------------------- */

export type InterpretResult = {
  composition: VisualComposition;
  /** What Revora understood, in the owner's words. */
  understood: string;
  /** True when nothing matched and we invented a fitting concept instead. */
  invented: boolean;
};

/**
 * Turns ANY visual request into a real composition. Unknown requests are never
 * refused: we fall back to an original concept built from the business itself.
 */
export function interpretVisualPrompt(input: {
  prompt: string;
  industry?: string | null;
  services?: { name: string }[];
  seed?: number;
  origin?: VisualComposition["origin"];
}): InterpretResult {
  const prompt = input.prompt.toLowerCase();
  const matched = RECIPES.filter((recipe) => recipe.match.test(prompt));
  const invented = matched.length === 0;

  const base = matched.length
    ? matched
    : [
        RECIPES.find((recipe) => recipe.match.test(seedPromptFor(input.industry, input.services ?? []))) ??
          RECIPES[0]!,
      ];

  // Combining recipes is what makes the engine open-ended: "cinematic space
  // with gold particles" pulls layers from three different concepts.
  const merged: VisualLayer[] = [];
  for (const recipe of base.slice(0, 3)) {
    for (const entry of recipe.layers) {
      if (!merged.some((existing) => existing.kind === entry.kind)) merged.push({ ...entry });
    }
  }

  const notes: string[] = [];
  let layers = merged;
  for (const modifier of MODIFIERS) {
    if (!modifier.match.test(prompt)) continue;
    layers = modifier.apply(layers);
    notes.push(modifier.note);
  }

  const safe = safeLayers(layers);
  const name = base.map((recipe) => recipe.name).slice(0, 2).join(" + ");
  const summary = invented
    ? `An original concept built for this business: ${describeComposition(safe)}`
    : base[0]!.summary;

  return {
    invented,
    understood: invented
      ? "That's not a stock effect, so Revora built an original composition from the same ingredients."
      : `Understood as ${name.toLowerCase()}${notes.length ? `, ${notes.join(", ")}` : ""}.`,
    composition: {
      id: `${slug(name)}-${signature(safe)}`,
      name,
      summary,
      layers: safe,
      intensity: /subtle|slow|minimal|quiet/.test(prompt) ? 45 : /strong|intense|bold|dramatic/.test(prompt) ? 85 : 65,
      origin: input.origin ?? "prompt",
    },
  };
}

/* --------------------------- creative commands ---------------------------- */

export type CreativeCommand = { id: string; label: string; prompt: string; help: string };

export const CREATIVE_COMMANDS: CreativeCommand[] = [
  {
    id: "new",
    label: "Create something new",
    prompt: "",
    help: "Revora reads this business and invents a concept it hasn't used before.",
  },
  { id: "surprise", label: "Surprise me", prompt: "", help: "A random original direction that still fits the brand." },
  { id: "magical", label: "Make it magical", prompt: "magical sparkling floating light", help: "Light motes and glow." },
  { id: "cinematic", label: "Make it cinematic", prompt: "cinematic dramatic light and fog", help: "Film-set lighting." },
  { id: "futuristic", label: "Make it futuristic", prompt: "futuristic control centre data grid", help: "Tech energy." },
  { id: "luxury", label: "Make it luxury", prompt: "quiet luxury gold light premium", help: "Expensive restraint." },
  { id: "bold", label: "Make it bold", prompt: "bold high contrast fast streaks", help: "Loud and confident." },
  { id: "minimal", label: "Make it minimal", prompt: "minimal clean quiet", help: "Almost no decoration." },
  { id: "human", label: "Make it more human", prompt: "warm friendly human soft", help: "Family-business warmth." },
  { id: "premium", label: "Make it more premium", prompt: "premium luxury slow subtle depth", help: "Perceived value." },
  {
    id: "interactive",
    label: "Make it more interactive",
    prompt: "interactive particles that follow the cursor and move on scroll",
    help: "Reacts to the visitor.",
  },
  {
    id: "memorable",
    label: "Make it more memorable",
    prompt: "galaxy aurora cinematic depth",
    help: "Something people describe to a friend.",
  },
  {
    id: "different",
    label: "Make it completely different",
    prompt: "",
    help: "Throws out the current look and starts again.",
  },
  {
    id: "unexpected",
    label: "Build me something nobody expects",
    prompt: "",
    help: "Experimental art direction — always previewed before it goes live.",
  },
];

const ORIGINAL_POOL: Recipe[] = RECIPES;

/**
 * Original concepts. `avoid` is the signature list of compositions already in
 * use (this site's current look, and other Revora sites), so "create something
 * new" genuinely returns something new rather than the same favourite.
 */
export function inventComposition(input: {
  industry?: string | null;
  services?: { name: string }[];
  seed: number;
  avoid?: string[];
  daring?: boolean;
}): VisualComposition {
  const avoid = new Set(input.avoid ?? []);
  const pool = ORIGINAL_POOL;
  const start = Math.abs(input.seed) % pool.length;

  for (let step = 0; step < pool.length; step += 1) {
    const primary = pool[(start + step) % pool.length]!;
    const secondary = pool[(start + step * 3 + 5) % pool.length]!;

    const layers = safeLayers([
      ...primary.layers.map((l, index) => ({
        ...l,
        speed: Math.max(5, Math.min(100, l.speed + ((input.seed >> (index + 1)) % 21) - 10)),
        density: Math.max(5, Math.min(100, l.density + ((input.seed >> (index + 2)) % 25) - 12)),
        interaction: input.daring && index === 0 ? "both" : l.interaction,
      })),
      ...(input.daring ? secondary.layers.slice(0, 2) : secondary.layers.slice(0, 1)),
    ]);

    const sig = signature(layers);
    if (avoid.has(sig) && step < pool.length - 1) continue;

    const name = input.daring ? `${primary.name} × ${secondary.name}` : primary.name;
    return {
      id: `${slug(name)}-${sig}`,
      name,
      summary: input.daring
        ? `An experimental direction nobody else in this trade is running: ${describeComposition(layers)}`
        : `${primary.summary} ${describeComposition(layers)}`,
      layers,
      intensity: input.daring ? 80 : 65,
      origin: "command",
    };
  }

  return interpretVisualPrompt({
    prompt: seedPromptFor(input.industry, input.services ?? []),
    origin: "command",
  }).composition;
}

/* ---------------------------- originality score --------------------------- */

export type Originality = { score: number; verdict: string; advice: string };

/**
 * How distinct this website's visual identity is compared with other Revora
 * sites. The goal is not different colours — it's a different creative
 * identity, so we score the layer recipe, not the palette.
 */
export function originalityScore(
  composition: VisualComposition | null,
  otherSignatures: string[],
): Originality {
  if (!composition || !composition.layers.length) {
    return {
      score: 20,
      verdict: "Generic",
      advice: "This site has no visual identity of its own yet. Start with one concept below.",
    };
  }

  const sig = signature(composition.layers);
  const clashes = otherSignatures.filter((other) => other === sig).length;
  const kinds = new Set(composition.layers.map((l) => l.kind)).size;
  const interactive = composition.layers.some((l) => l.interaction !== "none");

  let score = 55 + kinds * 10 + (interactive ? 12 : 0) - clashes * 25;
  score = Math.max(5, Math.min(100, score));

  if (score >= 80) {
    return { score, verdict: "Distinctive", advice: "This look is this business's own. Keep it and build on it." };
  }
  if (score >= 55) {
    return {
      score,
      verdict: "Recognisable",
      advice: "Solid, but one more layer or an interaction would make it memorable.",
    };
  }
  return {
    score,
    verdict: "Too familiar",
    advice: "This is close to other sites. Use 'Create something new' for a different direction.",
  };
}

/* ------------------------------ design director --------------------------- */

export type DirectorNote = { tone: "ok" | "warn"; message: string };

/**
 * Premium does not mean more effects. Before anything is applied, this checks
 * readability, focus and performance and says so plainly.
 */
export function reviewComposition(composition: VisualComposition): DirectorNote[] {
  const notes: DirectorNote[] = [];
  const strong = composition.layers.filter((l) => l.opacity > 70).length;
  const fast = composition.layers.filter((l) => l.speed > 75).length;
  const cost = composition.layers.reduce((sum, l) => sum + layerCost(l), 0);

  if (composition.layers.length >= 3 && composition.intensity > 80) {
    notes.push({ tone: "warn", message: "Strong and layered — check your headline still reads instantly." });
  }
  if (strong >= 2) {
    notes.push({ tone: "warn", message: "Two heavy layers compete with your text. Lowering one usually looks better." });
  }
  if (fast) {
    notes.push({ tone: "warn", message: "Fast motion can pull attention off your main button." });
  }
  if (cost <= 3) {
    notes.push({ tone: "ok", message: "Light on performance — this will stay fast on phones." });
  }
  if (!notes.length) {
    notes.push({ tone: "ok", message: "Balanced: enough character to be memorable, quiet enough to convert." });
  }
  return notes;
}
