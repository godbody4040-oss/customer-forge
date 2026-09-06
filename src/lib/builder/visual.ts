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
  deadControls?: string[] | undefined;
  /** Pictures stretched or squashed out of their real shape. */
  distortedImages?: string[] | undefined;
  /** Blocks of text sitting on top of each other. */
  overlapping?: string[] | undefined;
  /** Content columns so narrow that words break awkwardly. */
  narrowColumns?: string[] | undefined;
  /** A fixed bar covering the bottom of the page, in px. */
  stickyFooterHeight?: number | undefined;
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
  for (const control of (measurement.deadControls ?? []).slice(0, 5)) {
    add(
      "dead_control",
      "p0",
      `“${control}” looks like a button but leads nowhere.`,
      "Point it at a real page, a phone number, or the booking form.",
    );
  }
  for (const image of (measurement.distortedImages ?? []).slice(0, 5)) {
    add(
      "distorted_image",
      "advice",
      `A picture (${image}) is stretched out of its real shape.`,
      "Let the picture keep its proportions, or crop it properly.",
    );
  }
  for (const pair of (measurement.overlapping ?? []).slice(0, 5)) {
    add(
      "overlapping_content",
      "p0",
      `At ${width}px two blocks of text sit on top of each other (${pair}).`,
      "Add space between them, or let them stack on small screens.",
    );
  }
  for (const column of (measurement.narrowColumns ?? []).slice(0, 3)) {
    add(
      "narrow_column",
      "advice",
      `Text in “${column}” is squeezed into a very narrow column at ${width}px.`,
      "Let the text use the width of the screen.",
    );
  }

  const a11y = measurement.accessibility;
  if (a11y) {
    if (a11y.zoomBlocked)
      add(
        "zoom_blocked",
        "p0",
        "The page stops visitors pinching to zoom.",
        "Allow zooming so people with low vision can read the page.",
      );
    for (const image of a11y.imagesMissingAlt.slice(0, 5))
      add(
        "image_missing_alt",
        "advice",
        `A picture (${image}) has no description for screen readers.`,
        "Describe what the picture shows in a few words.",
      );
    for (const control of a11y.unlabeledControls.slice(0, 5))
      add(
        "unlabeled_control",
        "advice",
        `A button (${control}) has no readable name.`,
        "Give the button words, or a spoken label.",
      );
    for (const input of a11y.unlabeledInputs.slice(0, 5))
      add(
        "unlabeled_input",
        "p0",
        `A form field (${input}) has no label, so visitors can't tell what to type.`,
        "Add a label above the field.",
      );
    for (const heading of a11y.headingOrderProblems.slice(0, 3))
      add(
        "heading_order",
        "advice",
        `Headings skip a level around “${heading}”.`,
        "Use headings in order so the page reads logically.",
      );
    if (a11y.h1Count === 0)
      add(
        "missing_h1",
        "advice",
        "The page has no main heading.",
        "Give the page one clear main heading.",
      );
    if (a11y.h1Count > 1)
      add(
        "multiple_h1",
        "advice",
        `The page has ${a11y.h1Count} main headings.`,
        "Keep one main heading per page.",
      );
    if (!a11y.hasMain)
      add(
        "missing_main_landmark",
        "advice",
        "The page has no main content landmark.",
        "Wrap the page content in a main region.",
      );
    if (!a11y.hasNav)
      add(
        "missing_nav_landmark",
        "advice",
        "The page has no navigation landmark.",
        "Mark the menu as navigation.",
      );
    if (a11y.controls > 0 && a11y.keyboardReachable < a11y.controls)
      add(
        "keyboard_unreachable",
        "p0",
        `${a11y.controls - a11y.keyboardReachable} button(s) can't be reached with a keyboard.`,
        "Use real buttons and links so a keyboard can reach them.",
      );
    for (const item of a11y.lowContrast.slice(0, 5))
      add(
        "low_contrast",
        "advice",
        `Text in “${item.selector}” is only ${item.ratio.toFixed(1)}:1 against its background.`,
        "Darken the text or lighten the background so it reaches 4.5:1.",
      );
  }

  const perf = measurement.performance;
  if (perf) {
    if (perf.lcp !== null && perf.lcp > 4000)
      add(
        "slow_main_content",
        "advice",
        `The biggest part of the page took ${(perf.lcp / 1000).toFixed(1)}s to appear.`,
        "Shrink the hero picture and load it first.",
      );
    if (perf.cls !== null && perf.cls > 0.1)
      add(
        "layout_shift",
        "advice",
        `Content jumps around while the page loads (shift score ${perf.cls.toFixed(2)}).`,
        "Give pictures fixed sizes so nothing moves as they load.",
      );
    if (perf.ttfb !== null && perf.ttfb > 1500)
      add(
        "slow_server_response",
        "advice",
        `The server took ${(perf.ttfb / 1000).toFixed(1)}s to answer.`,
        "This usually settles after publishing; check again on the live site.",
      );
    if (perf.failedRequests > 0)
      add(
        "failed_requests",
        "p0",
        `${perf.failedRequests} file(s) on the page failed to load.`,
        "Replace or remove the missing files.",
      );
    if (perf.imageBytes > 3_000_000)
      add(
        "heavy_images",
        "advice",
        `The pictures on this page weigh ${(perf.imageBytes / 1_000_000).toFixed(1)}MB.`,
        "Use smaller pictures so the page opens quickly on phones.",
      );
    for (const image of perf.oversizedImages.slice(0, 3))
      add(
        "oversized_image",
        "advice",
        `A picture (${image}) is far bigger than the space it fills.`,
        "Upload a smaller version of that picture.",
      );
  }
  return found;
}

/** Judges every measured width together. No measurements means no pass. */
export function gradeVisual(measurements: ViewportMeasurement[], page?: string): VisualReport {
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
          ...(page ? { page } : {}),
        },
      ],
      widths: [],
      ...(page ? { pages: [page] } : {}),
      coverage: { accessibility: false, performance: false },
    };

  const findings = measurements
    .flatMap(gradeViewport)
    .map((finding) => (page ? { ...finding, page } : finding));
  const score = scoreFindings(findings);
  return {
    score,
    passed: !findings.some((finding) => finding.severity === "p0"),
    findings,
    widths: measurements.map((measurement) => px(measurement.width)),
    ...(page ? { pages: [page] } : {}),
    coverage: {
      accessibility: measurements.some((measurement) => !!measurement.accessibility),
      performance: measurements.some((measurement) => !!measurement.performance),
    },
  };
}

/**
 * One fault seen at eleven widths is still one fault, so each distinct problem
 * is counted once. Otherwise a single small detail would sink every score.
 */
function scoreFindings(findings: VisualFinding[]): number {
  const distinct = (severity: "p0" | "advice") =>
    new Set(
      findings
        .filter((finding) => finding.severity === severity)
        .map(
          (finding) => `${finding.page ?? ""}|${finding.key}|${finding.detail.replace(/\d+/g, "")}`,
        ),
    ).size;
  return Math.max(0, Math.min(100, 100 - distinct("p0") * 20 - distinct("advice") * 3));
}

/**
 * Judges a WHOLE WEBSITE. Every visible page must have its own fresh
 * measurements: a clean home page has never been proof that Services, Pricing
 * or Contact render correctly, so any page without a report fails the site
 * outright.
 */
export function gradeSite(
  expectedPages: string[],
  reports: { page: string; report: VisualReport }[],
): VisualReport {
  const measured = new Map(reports.map((entry) => [entry.page, entry.report]));
  const findings: VisualFinding[] = [];
  const widths = new Set<number>();
  const pages: string[] = [];
  let accessibility = expectedPages.length > 0;
  let performance = expectedPages.length > 0;

  for (const page of expectedPages) {
    const report = measured.get(page);
    if (!report || !report.widths.length) {
      findings.push({
        key: "page_not_measured",
        severity: "p0",
        detail: `“${page}” hasn't been checked in a real browser yet.`,
        fix: "Run the visual check so every page is measured, not just the home page.",
        width: 0,
        page,
      });
      accessibility = false;
      performance = false;
      continue;
    }
    pages.push(page);
    for (const width of report.widths) widths.add(width);
    findings.push(...report.findings.map((finding) => ({ ...finding, page })));
    if (!report.coverage?.accessibility) accessibility = false;
    if (!report.coverage?.performance) performance = false;
  }

  const missingWidths = VIEWPORTS.filter((width) => !widths.has(width));
  if (pages.length && missingWidths.length)
    findings.push({
      key: "widths_not_measured",
      severity: "p0",
      detail: `The website wasn't checked at ${missingWidths.join(", ")}px.`,
      fix: "Run the visual check again so every screen size is covered.",
      width: 0,
    });

  if (!expectedPages.length)
    findings.push({
      key: "not_measured",
      severity: "p0",
      detail: "There are no visitor-visible pages to check yet.",
      fix: "Build the website first, then run the visual check.",
      width: 0,
    });

  return {
    score: scoreFindings(findings),
    passed: !findings.some((finding) => finding.severity === "p0"),
    findings,
    widths: [...widths].sort((a, b) => a - b),
    pages,
    coverage: { accessibility, performance },
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
  // A call to action is judged by what it DOES, not by the words on it: where it
  // leads, whether it is a real control, and whether a visitor can see it.
  const actionWords = /call|book|quote|contact|get started|start now|enquir|inquir|estimate|schedule|request|availab|see services|message|email|apply|hire|order/i;
  const ctaControls = controls.filter((el) => {
    const href = (el.getAttribute('href') || '').trim();
    const text = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).trim();
    const box = el.getBoundingClientRect();
    if (box.height < 24) return false;
    const conversionTarget = /^(tel:|mailto:|sms:)/i.test(href) || /book|quote|contact|schedul|estimate|appoint|start/i.test(href);
    return conversionTarget || (actionWords.test(text) && (href.length > 1 || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'));
  });
  const ctas = ctaControls.length;
  // A control that leads nowhere is worse than a missing one: it looks like the
  // next step and does nothing.
  const deadControls = controls
    .filter((el) => {
      if (el.tagName !== 'A') return false;
      const href = (el.getAttribute('href') || '').trim();
      return href === '' || href === '#' || /^javascript:/i.test(href);
    })
    .slice(0, 10)
    .map(label);
  const distortedImages = [...document.images]
    .filter(visible)
    .filter((img) => {
      if (!img.naturalWidth || !img.naturalHeight) return false;
      const box = img.getBoundingClientRect();
      if (box.width < 40 || box.height < 40) return false;
      if (getComputedStyle(img).objectFit !== 'fill') return false;
      const natural = img.naturalWidth / img.naturalHeight;
      const shown = box.width / box.height;
      return Math.abs(natural - shown) / natural > 0.15;
    })
    .slice(0, 10)
    .map((img) => (img.currentSrc || img.src || label(img)).slice(0, 120));
  // Two blocks of readable text occupying the same pixels is a broken layout,
  // not a design choice.
  const textBlocks = all
    .filter((el) => el.childElementCount === 0 && (el.textContent || '').trim().length > 24)
    .filter((el) => getComputedStyle(el).position === 'static')
    .slice(0, 120);
  const overlapping = [];
  for (let i = 0; i < textBlocks.length && overlapping.length < 5; i += 1) {
    for (let j = i + 1; j < textBlocks.length; j += 1) {
      const a = textBlocks[i].getBoundingClientRect();
      const b = textBlocks[j].getBoundingClientRect();
      if (textBlocks[i].contains(textBlocks[j]) || textBlocks[j].contains(textBlocks[i])) continue;
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 12 && overlapY > 12) {
        overlapping.push((label(textBlocks[i]) + ' / ' + label(textBlocks[j])).slice(0, 120));
        break;
      }
    }
  }
  const narrowColumns = all
    .filter((el) => el.childElementCount === 0 && (el.textContent || '').trim().length > 80)
    .filter((el) => {
      const box = el.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(el).fontSize) || 16;
      return box.width > 0 && box.width < Math.min(180, size * 12) && width >= 360;
    })
    .slice(0, 5)
    .map(label);
  const fixedBars = all.filter((el) => {
    const pos = getComputedStyle(el).position;
    if (pos !== 'fixed') return false;
    const box = el.getBoundingClientRect();
    return box.height > 0 && box.bottom > window.innerHeight - 8 && box.width > width * 0.5;
  });
  const stickyFooterHeight = fixedBars.reduce((tallest, el) => Math.max(tallest, el.getBoundingClientRect().height), 0);

  const menuButton = [...document.querySelectorAll('button, [role="button"]')].some(
    (el) => visible(el) && /menu|navigation/i.test((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')),
  );
  const inlineNav = [...document.querySelectorAll('nav a[href]')].filter(visible).length >= 2;

  /* ---------------------------- accessibility ---------------------------- */
  const named = (el) => ((el.textContent || '').trim() + (el.getAttribute('aria-label') || '') + (el.getAttribute('title') || '')).trim().length > 0
    || !!el.querySelector('img[alt]:not([alt=""])')
    || !!(el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby')));
  const imagesMissingAlt = [...document.images]
    .filter(visible)
    .filter((img) => img.getAttribute('alt') === null && img.getAttribute('role') !== 'presentation' && !img.getAttribute('aria-hidden'))
    .slice(0, 10)
    .map((img) => (img.currentSrc || img.src || label(img)).slice(0, 120));
  const unlabeledControls = controls.filter((el) => !named(el)).slice(0, 10).map(label);
  const fields = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(visible);
  const unlabeledInputs = fields
    .filter((el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return false;
      if (el.id && document.querySelector('label[for="' + el.id.replace(/"/g, '') + '"]')) return false;
      return !el.closest('label');
    })
    .slice(0, 10)
    .map(label);
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
  const headingOrderProblems = [];
  let previousLevel = 0;
  for (const heading of headings) {
    const level = Number(heading.tagName.slice(1));
    if (previousLevel && level > previousLevel + 1) headingOrderProblems.push((heading.textContent || label(heading)).trim().slice(0, 60));
    previousLevel = level;
  }
  const focusable = controls.filter((el) => {
    const index = el.getAttribute('tabindex');
    if (index !== null && Number(index) < 0) return false;
    if (el.hasAttribute('disabled')) return false;
    if (el.tagName === 'A') return !!(el.getAttribute('href') || '').trim();
    if (el.tagName === 'BUTTON') return true;
    return index !== null && Number(index) >= 0;
  }).length;
  const toRgb = (value) => {
    const match = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!match) return null;
    const parts = match[1].split(',').map((part) => parseFloat(part));
    if (parts.length >= 4 && parts[3] === 0) return null;
    return parts.slice(0, 3);
  };
  const luminance = (rgb) => {
    const channels = rgb.map((value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const backgroundOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const rgb = toRgb(getComputedStyle(node).backgroundColor);
      if (rgb) return rgb;
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const lowContrast = all
    .filter((el) => el.childElementCount === 0 && (el.textContent || '').trim().length > 12)
    .slice(0, 80)
    .map((el) => {
      const style = getComputedStyle(el);
      const fg = toRgb(style.color);
      if (!fg) return null;
      const bg = backgroundOf(el);
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const size = parseFloat(style.fontSize) || 16;
      const bold = Number(style.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      return ratio < (large ? 3 : 4.5) ? { selector: label(el), ratio: Math.round(ratio * 100) / 100 } : null;
    })
    .filter(Boolean)
    .slice(0, 10);
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const viewportContent = viewportMeta ? (viewportMeta.getAttribute('content') || '') : '';
  const accessibility = {
    imagesMissingAlt,
    unlabeledControls,
    unlabeledInputs,
    headingOrderProblems: headingOrderProblems.slice(0, 5),
    h1Count: [...document.querySelectorAll('h1')].filter(visible).length,
    hasMain: !!document.querySelector('main, [role="main"]'),
    hasNav: !!document.querySelector('nav, [role="navigation"]'),
    controls: controls.length,
    keyboardReachable: focusable,
    lowContrast,
    zoomBlocked: /user-scalable\\s*=\\s*no/i.test(viewportContent) || /maximum-scale\\s*=\\s*1(\\.0)?\\b/i.test(viewportContent),
  };

  /* ----------------------------- performance ----------------------------- */
  const entry = (type) => { try { return performance.getEntriesByType(type); } catch (e) { return []; } };
  const nav = entry('navigation')[0] || null;
  const paint = entry('paint').find((p) => p.name === 'first-contentful-paint') || null;
  const lcpEntries = entry('largest-contentful-paint');
  const resources = entry('resource');
  const bytes = (filter) => resources.filter(filter).reduce((total, r) => total + (r.transferSize || r.encodedBodySize || 0), 0);
  const shift = (window.__revoraCls === undefined ? null : window.__revoraCls);
  const oversizedImages = [...document.images]
    .filter((img) => img.naturalWidth > 0)
    .filter((img) => {
      const box = img.getBoundingClientRect();
      return box.width > 0 && img.naturalWidth > box.width * window.devicePixelRatio * 2.2;
    })
    .slice(0, 5)
    .map((img) => (img.currentSrc || img.src || label(img)).slice(0, 120));
  const performanceMeasurement = {
    ttfb: nav ? Math.round(nav.responseStart) : null,
    fcp: paint ? Math.round(paint.startTime) : null,
    lcp: lcpEntries.length ? Math.round(lcpEntries[lcpEntries.length - 1].startTime) : null,
    cls: typeof shift === 'number' ? Math.round(shift * 1000) / 1000 : null,
    inp: null,
    longTasks: entry('longtask').length || null,
    resources: resources.length,
    scriptBytes: bytes((r) => r.initiatorType === 'script' || /\\.js(\\?|$)/i.test(r.name)),
    imageBytes: bytes((r) => r.initiatorType === 'img' || /\\.(png|jpe?g|webp|avif|gif|svg)(\\?|$)/i.test(r.name)),
    fontBytes: bytes((r) => /\\.(woff2?|ttf|otf)(\\?|$)/i.test(r.name)),
    failedRequests: resources.filter((r) => (r.responseStatus || 0) >= 400).length,
    oversizedImages,
    renderBlocking: resources.filter((r) => r.renderBlockingStatus === 'blocking').length,
  };

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
    deadControls,
    distortedImages,
    overlapping,
    narrowColumns,
    stickyFooterHeight,
    accessibility,
    performance: performanceMeasurement,
  };
})()`;

/**
 * Installed in the page as soon as it loads, before anything is measured, so
 * layout shift is observed as it happens instead of guessed at afterwards.
 */
export const OBSERVE_SCRIPT = `(() => {
  if (window.__revoraClsInstalled) return true;
  window.__revoraClsInstalled = true;
  window.__revoraCls = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__revoraCls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { window.__revoraCls = undefined; }
  return true;
})()`;
