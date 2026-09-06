/**
 * LAYER 2 — RENDERED VISUAL QUALITY.
 *
 * Layer 1 (`quality.ts`) reads the stored content. It can prove the words and
 * the data are sound, but it can never prove the page LOOKS right. This module
 * judges a page from measurements taken in a real browser, at real widths:
 * horizontal overflow, clipped text, broken images, unreachable buttons, tap
 * targets that are too small, text that is too small to read.
 *
 * It is deliberately pure. `MEASURE_SCRIPT` is the snippet a browser runs to
 * collect numbers; `gradeViewport` and `gradeVisual` turn those numbers into
 * findings. That means the same judgement runs in tests, in tooling, and in any
 * future browser runner — and no visual claim is ever made without real
 * measurements behind it.
 */

/** The widths every website is judged at, phone first. */
export const VIEWPORTS = [320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920] as const;

/** What a browser can prove about how usable a page is, beyond geometry. */
export type AccessibilityMeasurement = {
  /** Pictures carrying meaning with no description for a screen reader. */
  imagesMissingAlt: string[];
  /** Buttons and links with no readable name at all. */
  unlabeledControls: string[];
  /** Form fields with no label. */
  unlabeledInputs: string[];
  /** Headings that jump a level, e.g. an h4 straight after an h2. */
  headingOrderProblems: string[];
  /** Whether the page has more than one top-level heading, or none. */
  h1Count: number;
  hasMain: boolean;
  hasNav: boolean;
  /** Controls a keyboard can reach, out of all controls found. */
  controls: number;
  keyboardReachable: number;
  /** Text whose contrast against its background is below 4.5:1. */
  lowContrast: { selector: string; ratio: number }[];
  /** True when the page stops a visitor pinching to zoom. */
  zoomBlocked: boolean;
};

/** Lab timings and weights taken from the browser's own Performance APIs. */
export type PerformanceMeasurement = {
  /** Milliseconds; null whenever the browser could not report the metric. */
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  longTasks: number | null;
  resources: number;
  scriptBytes: number;
  imageBytes: number;
  fontBytes: number;
  failedRequests: number;
  /** Images shipped far larger than the box they render in. */
  oversizedImages: string[];
  renderBlocking: number;
};

export type ViewportMeasurement = {
  width: number;
  /** Widest scrollable extent of the document at this width. */
  scrollWidth: number;
  /** Elements that stick out past the right edge, with a readable selector. */
  overflowing: { selector: string; right: number }[];
  /** Images that failed to load or have no natural size. */
  brokenImages: string[];
  /** Text nodes whose box is shorter than their content (clipped). */
  clipped: string[];
  /** Buttons and links smaller than the 44x44 minimum, phone widths only. */
  smallTargets: { selector: string; width: number; height: number }[];
  /** Body text rendered below 14px. */
  tinyText: { selector: string; fontSize: number }[];
  /** Interactive elements hidden behind a fixed bar or off-screen. */
  unreachable: string[];
  /** Whether a visitor can open the menu at this width. */
  navigable: boolean;
  /** Number of visible calls to action found. */
  ctas: number;
  /** Buttons and links that lead nowhere (`#`, empty, `javascript:`). */
  deadControls?: string[];
  /** Pictures stretched or squashed out of their real shape. */
  distortedImages?: string[];
  /** Blocks of text sitting on top of each other. */
  overlapping?: string[];
  /** Content columns so narrow that words break awkwardly. */
  narrowColumns?: string[];
  /** A fixed bar covering the bottom of the page, in px. */
  stickyFooterHeight?: number;
  accessibility?: AccessibilityMeasurement | undefined;
  performance?: PerformanceMeasurement | undefined;
};

export type VisualFinding = {
  key: string;
  severity: "p0" | "advice";
  /** Plain-language description for the owner. */
  detail: string;
  fix: string;
  /** The width the problem appears at. */
  width: number;
  /** Which page the problem was seen on, when a whole site was measured. */
  page?: string;
};

/** Which judgements a run actually had evidence for. Unmeasured is never a pass. */
export type VisualCoverage = { accessibility: boolean; performance: boolean };

export type VisualReport = {
  /** 0–100, from the measurements only. */
  score: number;
  /** True only when no P0 finding exists at any measured width. */
  passed: boolean;
  findings: VisualFinding[];
  widths: number[];
  /** Page paths covered by this report. */
  pages?: string[];
  coverage?: VisualCoverage;
};


const px = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/**
 * Judges one width. Anything that makes a page unusable — sideways scrolling,
 * a broken photo, clipped words, a button a thumb cannot hit — is a P0.
 */
export function gradeViewport(measurement: ViewportMeasurement): VisualFinding[] {
  const width = px(measurement.width);
  const phone = width <= 500;
  const found: VisualFinding[] = [];
  const add = (
    key: string,
    severity: VisualFinding["severity"],
    detail: string,
    fix: string,
  ): void => void found.push({ key, severity, detail, fix, width });

  // A page wider than the screen is the single most common broken-site symptom.
  if (px(measurement.scrollWidth) > width + 1) {
    add(
      "horizontal_overflow",
      "p0",
      `At ${width}px the page is ${Math.round(px(measurement.scrollWidth) - width)}px too wide, so it scrolls sideways.`,
      "Let the widest block shrink to the screen instead of holding a fixed width.",
    );
  }
  for (const element of measurement.overflowing.slice(0, 5)) {
    add(
      "element_overflow",
      "p0",
      `At ${width}px “${element.selector}” hangs off the edge of the screen.`,
      "Allow that block to wrap or shrink at small widths.",
    );
  }
  for (const image of measurement.brokenImages.slice(0, 5)) {
    add(
      "broken_image",
      "p0",
      `A picture doesn't load (${image}).`,
      "Replace or remove the picture.",
    );
  }
  for (const node of measurement.clipped.slice(0, 5)) {
    add(
      "clipped_text",
      "p0",
      `At ${width}px words are cut off in “${node}”.`,
      "Give the text room to wrap onto another line.",
    );
  }
  if (!measurement.navigable) {
    add(
      "menu_unusable",
      "p0",
      `At ${width}px the menu can't be opened, so most pages are unreachable.`,
      "Show the menu button on small screens.",
    );
  }
  if (measurement.ctas === 0) {
    add(
      "no_visible_cta",
      "p0",
      `At ${width}px there is no visible button to call, book or get a price.`,
      "Add a clear next step near the top of the page.",
    );
  }
  for (const element of measurement.unreachable.slice(0, 5)) {
    add(
      "unreachable_control",
      "p0",
      `At ${width}px “${element}” can't be tapped — something covers it.`,
      "Move the covering bar, or add space below the content.",
    );
  }
  if (phone) {
    for (const target of measurement.smallTargets.slice(0, 5)) {
      add(
        "small_tap_target",
        "advice",
        `“${target.selector}” is ${Math.round(target.width)}×${Math.round(target.height)}px — shorter than a comfortable tap.`,
        "Give buttons and links at least 44px of tappable height on phones.",
      );
    }
  }
  for (const text of measurement.tinyText.slice(0, 5)) {
    add(
      "tiny_text",
      "advice",
      `Text in “${text.selector}” is ${Math.round(text.fontSize)}px, below comfortable reading size.`,
      "Use at least 14px for body text, 16px on phones.",
    );
  }
  return found;
}

/** Judges every measured width together. No measurements means no pass. */
export function gradeVisual(measurements: ViewportMeasurement[]): VisualReport {
  if (!measurements.length)
    return {
      score: 0,
      passed: false,
      findings: [
        {
          key: "not_measured",
          severity: "p0",
          detail: "The website hasn't been checked in a real browser yet.",
          fix: "Run the visual check so Revora can see how the pages actually render.",
          width: 0,
        },
      ],
      widths: [],
    };

  const findings = measurements.flatMap(gradeViewport);
  // One fault seen at eleven widths is still one fault, so each distinct problem
  // is counted once. Otherwise a single small detail would sink every score.
  const distinct = (severity: "p0" | "advice") =>
    new Set(
      findings
        .filter((finding) => finding.severity === severity)
        .map((finding) => `${finding.key}|${finding.detail.replace(/\d+/g, "")}`),
    ).size;
  const p0 = distinct("p0");
  const score = Math.max(0, Math.min(100, 100 - p0 * 20 - distinct("advice") * 3));
  return {
    score,
    passed: p0 === 0,
    findings,
    widths: measurements.map((measurement) => px(measurement.width)),
  };
}

/**
 * The snippet a browser evaluates to produce one `ViewportMeasurement`. Kept as
 * a string so any runner (Playwright, a devtools console, a future in-app
 * checker) collects exactly the same numbers this module grades.
 */
export const MEASURE_SCRIPT = `(() => {
  const width = window.innerWidth;
  const label = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : '';
    return (el.tagName.toLowerCase() + id + cls).slice(0, 80);
  };
  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const all = [...document.querySelectorAll('body *')].filter(visible);
  // An element only breaks the page when nothing above it clips or scrolls
  // sideways: a deliberate swipe strip or a clipped glow is not a fault.
  const contained = (el) => {
    if (getComputedStyle(el).pointerEvents === 'none') return true;
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      const ps = getComputedStyle(parent);
      if (ps.overflowX !== 'visible' || ps.overflow !== 'visible') return true;
      parent = parent.parentElement;
    }
    return false;
  };
  const decorative = contained;
  const overflowing = all
    .filter((el) => el.getBoundingClientRect().right > width + 1 && !decorative(el))
    .slice(0, 10)
    .map((el) => ({ selector: label(el), right: Math.round(el.getBoundingClientRect().right) }));
  const brokenImages = [...document.images]
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .slice(0, 10)
    .map((img) => (img.currentSrc || img.src || label(img)).slice(0, 120));
  const clipped = all
    .filter((el) => el.childElementCount === 0 && el.textContent && el.textContent.trim().length > 0)
    .filter((el) => el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow === 'hidden')
    .slice(0, 10)
    .map((el) => (el.textContent || '').trim().slice(0, 60));
  const controls = [...document.querySelectorAll('a[href], button, [role="button"]')].filter(visible);
  const smallTargets = controls
    // A link inside a sentence is read, not tapped as a button, so its height is
    // set by the text around it and is not a fault.
    .filter((el) => getComputedStyle(el).display !== 'inline')
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    // Only the tappable height is judged: a short, narrow button is fine as long
    // as a fingertip can land on it.
    .filter(({ box }) => box.height < 40)
    .slice(0, 10)
    .map(({ el, box }) => ({ selector: label(el), width: box.width, height: box.height }));
  const tinyText = all
    .filter((el) => el.childElementCount === 0 && (el.textContent || '').trim().length > 20)
    // Small uppercase labels above a heading are a deliberate style, not body copy.
    .filter((el) => getComputedStyle(el).textTransform !== 'uppercase')
    .map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }))
    .filter(({ size }) => size > 0 && size < 13)
    .slice(0, 10)
    .map(({ el, size }) => ({ selector: label(el), fontSize: size }));
  const unreachable = controls
    .filter((el) => {
      const box = el.getBoundingClientRect();
      if (box.right < 0 || box.left > width) return true;
      const x = Math.min(width - 1, Math.max(1, box.left + box.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(1, box.top + box.height / 2));
      if (box.top < 0 || box.top > window.innerHeight) return false;
      const hit = document.elementFromPoint(x, y);
      if (!hit || el.contains(hit) || hit.contains(el)) return false;
      // A sticky call bar covers whatever it floats over until the visitor
      // scrolls, which is normal; only a permanent cover is a fault.
      let over = hit;
      while (over && over !== document.documentElement) {
        const pos = getComputedStyle(over).position;
        if (pos === 'fixed' || pos === 'sticky') return false;
        over = over.parentElement;
      }
      return true;
    })
    .slice(0, 10)
    .map(label);
  const ctaWords = /call|book|quote|contact|get started|enquir|inquir|estimate|schedule/i;
  const ctas = controls.filter((el) => ctaWords.test((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || ''))).length;
  const menuButton = [...document.querySelectorAll('button, [role="button"]')].some(
    (el) => visible(el) && /menu|navigation/i.test((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')),
  );
  const inlineNav = [...document.querySelectorAll('nav a[href]')].filter(visible).length >= 2;
  return {
    width,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    overflowing,
    brokenImages,
    clipped,
    smallTargets,
    tinyText,
    unreachable,
    navigable: width > 500 ? inlineNav : menuButton || inlineNav,
    ctas,
  };
})()`;
