/**
 * Tiny bridge so any panel in the builder can hand a request to the website
 * assistant at the top of the page. The panel dispatches, the assistant fills
 * its box and scrolls itself into view — no shared state, no prop drilling.
 */

import { scrollElementIntoView } from "@/lib/use-step-scroll";

const EVENT = "revora:assistant-prompt";

export function askAssistant(prompt: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: prompt }));
  scrollElementIntoView(document.getElementById("website-assistant"));
}

export function onAssistantPrompt(handler: (prompt: string) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => handler(String((event as CustomEvent<string>).detail ?? ""));
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
