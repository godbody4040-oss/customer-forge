/**
 * REVORA BUILDER CAPABILITIES — what this device and workspace can actually do.
 *
 * Revora's builder is free to run and free for customers. Its own engine does
 * the building; anything beyond that is a bonus that may or may not exist right
 * now. This module reports the truth about that, so the builder never claims to
 * have read a photo, listened to a recording or used a model it does not have.
 *
 * Four levels, cheapest first:
 *   1. own_engine   — always present, no cost, no network.
 *   2. on_device    — the browser ships a local model (free, private).
 *   3. self_hosted  — the owner runs their own model (optional).
 *   4. external     — a paid provider, only when an operator turns it on.
 *
 * Nothing here ever throws, and nothing here is required for building.
 */

import { hasLocalInference } from "./local-inference";

export type CapabilityLevel = "own_engine" | "on_device" | "self_hosted" | "external";

export type BuilderCapabilities = {
  /** Levels available right now, cheapest first. Always contains own_engine. */
  levels: CapabilityLevel[];
  /** The level the builder will use for the work it is asked to do. */
  chosen: CapabilityLevel;
  /** True when nothing is ever billed for building. */
  freeToRun: boolean;
  /** Can text be reworded by a model on this device? */
  textReasoning: boolean;
  /** Can a picture actually be looked at here? */
  imageUnderstanding: boolean;
  /** Can audio actually be listened to here? */
  audioUnderstanding: boolean;
  /** Can an uploaded document actually be read here? */
  documentUnderstanding: boolean;
  /** One honest sentence for the owner. */
  summary: string;
};

export type CapabilityInput = {
  /** An operator has switched on an outside provider for this install. */
  externalAllowed?: boolean;
  /** The owner has pointed Revora at their own model. */
  selfHostedConfigured?: boolean;
};

/** Detection is best-effort and silent; the builder works either way. */
export async function detectCapabilities(
  input: CapabilityInput = {},
): Promise<BuilderCapabilities> {
  let onDevice = false;
  try {
    onDevice = await hasLocalInference();
  } catch {
    onDevice = false;
  }
  return buildCapabilities({
    onDevice,
    selfHosted: Boolean(input.selfHostedConfigured),
    external: Boolean(input.externalAllowed),
  });
}

/** Pure form, used by the checks and by callers that already know the answers. */
export function buildCapabilities(flags: {
  onDevice: boolean;
  selfHosted: boolean;
  external: boolean;
}): BuilderCapabilities {
  const levels: CapabilityLevel[] = ["own_engine"];
  if (flags.onDevice) levels.push("on_device");
  if (flags.selfHosted) levels.push("self_hosted");
  if (flags.external) levels.push("external");

  // Cheapest first: the own engine builds, an on-device model may polish wording.
  const chosen: CapabilityLevel = flags.onDevice ? "on_device" : "own_engine";
  const freeToRun = !flags.external;

  return {
    levels,
    chosen,
    freeToRun,
    textReasoning: flags.onDevice || flags.selfHosted || flags.external,
    // Revora does not ship media understanding of its own, and an on-device
    // text model cannot see or hear. Saying otherwise would be a false claim.
    imageUnderstanding: false,
    audioUnderstanding: false,
    documentUnderstanding: false,
    summary: summarise(flags),
  };
}

function summarise(flags: { onDevice: boolean; selfHosted: boolean; external: boolean }): string {
  if (flags.onDevice)
    return "Revora builds with its own engine and can tidy wording on this device. Nothing is charged and nothing leaves your browser.";
  if (flags.selfHosted)
    return "Revora builds with its own engine, with your own model available for wording. Nothing is charged.";
  if (flags.external)
    return "Revora builds with its own engine. An outside provider has been switched on by an operator for extra wording help.";
  return "Revora builds with its own engine. No outside service is used and nothing is charged for building.";
}

/**
 * The honest line to show when someone attaches a photo, recording or document.
 * Returns null when the attachment kind can genuinely be handled here.
 */
export function attachmentNotice(
  capabilities: BuilderCapabilities,
  kind: "image" | "audio" | "document",
): string | null {
  const supported =
    kind === "image"
      ? capabilities.imageUnderstanding
      : kind === "audio"
        ? capabilities.audioUnderstanding
        : capabilities.documentUnderstanding;
  if (supported) return null;
  const label = kind === "image" ? "photos" : kind === "audio" ? "recordings" : "documents";
  return `Revora can save and use your ${label} on the site, but it cannot read them in this environment. Tell me in words what they show and I will build it.`;
}
