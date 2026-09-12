/**
 * REVORA FREE ASSET INTELLIGENCE
 * ==============================
 *
 * Asset selection is separate from image generation.
 *
 * Priority:
 * 1. Client-owned uploaded media.
 * 2. Existing Revora media library.
 * 3. Approved free visual source.
 * 4. CSS/decorative visual fallback.
 *
 * Never fabricate a business-specific photo.
 */

export type AssetRole =
  | "hero"
  | "service"
  | "about"
  | "gallery"
  | "background"
  | "decorative"
  | "social";

export type MediaAsset = {
  id: string;
  url: string;
  altText: string | null;
  category: string | null;
  fileName?: string | null;
};

export type AssetDecision = {
  role: AssetRole;
  asset: MediaAsset | null;
  source: "client" | "library" | "free" | "decorative" | "none";
  crop:
    | "center"
    | "top"
    | "left"
    | "right"
    | "cover"
    | "contain";
  focalPoint?: string;
  reason: string;
};

const CATEGORY_ALIASES: Record<AssetRole, string[]> = {
  hero: ["hero", "cover", "banner", "featured"],
  service: ["service", "work", "portfolio", "project"],
  about: ["team", "about", "staff", "owner"],
  gallery: ["gallery", "work", "portfolio", "project"],
  background: ["background", "hero", "cover"],
  decorative: ["decorative", "background", "pattern"],
  social: ["social", "og", "share"],
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function scoreAsset(asset: MediaAsset, role: AssetRole) {
  const category = normalized(asset.category);
  const file = normalized(asset.fileName);

  let score = 0;

  for (const alias of CATEGORY_ALIASES[role]) {
    if (category === alias) score += 10;
    if (file.includes(alias)) score += 4;
  }

  if (asset.altText) score += 2;
  if (/hero|cover|banner|featured/.test(file) && role === "hero") score += 8;

  return score;
}

function best(
  assets: MediaAsset[],
  role: AssetRole,
): MediaAsset | null {
  return [...assets]
    .sort((a, b) => scoreAsset(b, role) - scoreAsset(a, role))[0] ?? null;
}

export function chooseAsset(
  assets: MediaAsset[],
  role: AssetRole,
): AssetDecision {
  const selected = best(assets, role);

  if (selected) {
    return {
      role,
      asset: selected,
      source: "client",
      crop: role === "hero" ? "cover" : "center",
      reason: "Used the client's existing media instead of inventing an image.",
    };
  }

  if (role === "decorative") {
    return {
      role,
      asset: null,
      source: "decorative",
      crop: "cover",
      reason: "Use a CSS/SVG decorative treatment rather than fabricated photography.",
    };
  }

  return {
    role,
    asset: null,
    source: "none",
    crop: "cover",
    reason:
      "No verified business image is available. Keep the visual slot intentional rather than inventing business-specific imagery.",
  };
}

export function buildAssetMap(assets: MediaAsset[]) {
  const roles: AssetRole[] = [
    "hero",
    "service",
    "about",
    "gallery",
    "background",
    "social",
  ];

  return Object.fromEntries(
    roles.map((role) => [role, chooseAsset(assets, role)]),
  ) as Record<AssetRole, AssetDecision>;
}