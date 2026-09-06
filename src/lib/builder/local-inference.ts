/**
 * ON-DEVICE AI DETECTION — free reasoning when the browser already has a model.
 *
 * Some browsers now ship a local language model (Chrome's built-in Prompt API).
 * When one is present, Revora can use it for small wording jobs at zero cost and
 * without sending the owner's website content to any outside service. When it is
 * absent — which is most of the time — nothing happens and Revora's own
 * deterministic builder is used unchanged.
 *
 * This module never throws and never blocks the builder.
 */

type LocalModelSession = { prompt: (input: string) => Promise<string> };
type LocalModelApi = {
  availability?: () => Promise<string>;
  create: (options?: unknown) => Promise<LocalModelSession>;
};

function api(): LocalModelApi | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    LanguageModel?: LocalModelApi;
    ai?: { languageModel?: LocalModelApi };
  };
  return scope.LanguageModel ?? scope.ai?.languageModel ?? null;
}

/** True when this device can run a language model locally, for free. */
export async function hasLocalInference(): Promise<boolean> {
  const model = api();
  if (!model) return false;
  try {
    if (!model.availability) return true;
    const state = await model.availability();
    return state === "available" || state === "readily" || state === "downloadable";
  } catch {
    return false;
  }
}

/**
 * Tidies wording on the device. Returns the original text on any failure, so a
 * missing or busy local model can never change what Revora produced.
 */
export async function localPolish(text: string): Promise<string> {
  const source = text.trim();
  if (source.length < 12 || source.length > 600) return text;
  const model = api();
  if (!model) return text;
  try {
    const session = await model.create({
      initialPrompts: [
        {
          role: "system",
          content:
            "You tidy short website copy. Keep every fact exactly as given. Never add a price, review, rating, award, licence, guarantee or result. Reply with the improved sentence only.",
        },
      ],
    });
    const result = (await session.prompt(source))?.trim();
    if (!result || result.length > source.length * 2) return text;
    return result;
  } catch {
    return text;
  }
}
