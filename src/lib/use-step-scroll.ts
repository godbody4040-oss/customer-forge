/**
 * Keeps multi-step flows oriented: whenever the active step changes, the
 * viewport moves to the top of the step panel so the next question is the
 * first thing on screen instead of leaving people mid-scroll on a form they
 * already finished. Skips the very first render (nothing has changed yet) and
 * respects the visitor's reduced-motion preference.
 */
import { useEffect, useRef } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Smoothly bring an element into view, allowing for sticky headers. */
export function scrollElementIntoView(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") return;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

/** Scroll a hash target (`#pricing`) into view without a jarring jump. */
export function scrollToHash(hash: string) {
  if (typeof document === "undefined") return;
  const id = hash.replace(/^#/, "");
  scrollElementIntoView(document.getElementById(id));
}

/**
 * Bring a panel into view AND put the cursor in its first unanswered field, so
 * "answer the required questions" lands the owner on the actual question rather
 * than somewhere near it.
 */
export function focusAndScrollToId(id: string) {
  if (typeof document === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;
  scrollElementIntoView(target);
  const fields = Array.from(
    target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"),
  ).filter((el) => !el.disabled);
  const first = fields.find((el) => !el.value.trim()) ?? fields[0];
  if (first) window.setTimeout(() => first.focus({ preventScroll: true }), 320);
}


/**
 * Attach the returned ref to the container that renders the current step.
 * The container is scrolled into view every time `step` changes.
 */
export function useStepScroll<T extends HTMLElement = HTMLDivElement>(step: unknown) {
  const ref = useRef<T | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Let the new step paint before measuring its position.
    const frame = requestAnimationFrame(() => scrollElementIntoView(ref.current));
    return () => cancelAnimationFrame(frame);
  }, [step]);

  return ref;
}
