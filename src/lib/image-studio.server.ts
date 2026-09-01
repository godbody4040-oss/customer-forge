/**
 * Server side of the Revora AI Image Studio.
 *
 * Calls the Lovable AI Gateway image endpoint with a production brief built by
 * `visual-direction.ts`, then stores the result in the tenant's own private
 * media folder. Credit/policy denials are returned as a plain message rather
 * than thrown, so the builder never dead-ends on a red error.
 */

const IMAGE_ENDPOINT = "https://ai.gateway.lovable.dev/v1/images/generations";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";

export type GeneratedImage =
  { ok: true; base64: string } | { ok: false; blocked: boolean; message: string };

/** Generates one image. `blocked: true` means AI imagery is unavailable right now. */
export async function generateImageBase64(prompt: string): Promise<GeneratedImage> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    return {
      ok: false,
      blocked: true,
      message: "AI image generation isn't configured on this workspace yet.",
    };
  }

  let response: Response;
  try {
    response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
  } catch {
    return {
      ok: false,
      blocked: false,
      message: "The image service didn't respond. Try again in a moment.",
    };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 402 || response.status === 403) {
      return {
        ok: false,
        blocked: true,
        message:
          "AI photography is paused on this workspace right now. Your website still builds normally — upload real photos or try image generation again later.",
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        blocked: false,
        message: "Too many images at once. Wait a few seconds and try again.",
      };
    }
    return {
      ok: false,
      blocked: false,
      message: detail.slice(0, 300) || `Image generation failed (${response.status}).`,
    };
  }

  const json = (await response.json().catch(() => null)) as {
    data?: { b64_json?: string }[];
  } | null;
  const base64 = json?.data?.[0]?.b64_json;
  if (!base64) {
    return {
      ok: false,
      blocked: false,
      message: "The image service returned no image. Try again.",
    };
  }
  return { ok: true, base64 };
}

/** Decodes a base64 PNG into bytes for storage upload. */
export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
