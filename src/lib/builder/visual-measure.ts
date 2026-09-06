/**
 * Runs LAYER 2 — the rendered visual check — from inside the builder.
 *
 * The worker that serves the app cannot open a browser, but the person
 * building the website already has one. This module loads the workspace's own
 * preview in a hidden same-origin iframe, resizes it through every required
 * width, and collects the exact `ViewportMeasurement`s the shared grader
 * judges. The raw numbers go to the server, which re-grades them itself — the
 * browser never gets to decide its own score.
 */
import { MEASURE_SCRIPT, VIEWPORTS, type ViewportMeasurement } from "./visual";

const IFRAME_HEIGHT = 900;
/** Let styles, fonts and images settle after each resize before measuring. */
const SETTLE_MS = 400;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The preview page took too long to load.")), 30000);
    iframe.addEventListener(
      "load",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Measures one same-origin page at every required width. Throws a plain-language
 * error when the page cannot be reached or read.
 */
export async function measureWebsiteAtAllWidths(
  previewPath: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ViewportMeasurement[]> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.height = `${IFRAME_HEIGHT}px`;
  iframe.style.border = "0";
  iframe.src = previewPath;
  document.body.appendChild(iframe);

  try {
    await waitForLoad(iframe);
    const win = iframe.contentWindow;
    if (!win) throw new Error("The preview page could not be opened for checking.");

    const measurements: ViewportMeasurement[] = [];
    for (const [index, width] of VIEWPORTS.entries()) {
      iframe.style.width = `${width}px`;
      await wait(SETTLE_MS);
      // Same-origin, so the preview's own window can evaluate the shared
      // measurement snippet — no approximation, the real rendered numbers.
      const measured = win.eval(`(${MEASURE_SCRIPT})`) as ViewportMeasurement;
      measurements.push({ ...measured, width });
      onProgress?.(index + 1, VIEWPORTS.length);
    }
    return measurements;
  } finally {
    iframe.remove();
  }
}
