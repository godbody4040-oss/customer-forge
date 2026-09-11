/**
 * REVORA FREE-FIRST BUILDER — LAYER 2 VISUAL ENGINE
 *
 * Code #7 — Master rendered-site quality measurement and grading.
 *
 * Layer 1 (`quality.ts`) evaluates stored content and structure.
 * Layer 2 evaluates what a real browser actually renders.
 *
 * Design goals:
 * - Mobile-first.
 * - Deterministic.
 * - Zero external AI dependency.
 * - Zero paid AI credits.
 * - No false "looks good" claims without browser evidence.
 * - Strong accessibility checks.
 * - Strong responsive checks.
 * - Strong conversion checks.
 * - Strong image checks.
 * - Strong performance checks.
 * - Whole-site coverage rather than homepage-only validation.
 *
 * Browser flow:
 *
 * OBSERVE_SCRIPT
 *      ↓
 * page loads
 *      ↓
 * MEASURE_SCRIPT
 *      ↓
 * ViewportMeasurement
 *      ↓
 * gradeViewport()
 *      ↓
 * gradeVisual()
 *      ↓
 * gradeSite()
 *      ↓
 * quality.ts
 *
 * IMPORTANT:
 * This module does not modify the website.
 * It measures and grades it.
 */

export const VIEWPORTS = [
  320,
  360,
  375,
  390,
  414,
  430,
  768,
  1024,
  1280,
  1440,
  1920,
] as const;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type AccessibilityMeasurement = {
  imagesMissingAlt: string[];
  unlabeledControls: string[];
  unlabeledInputs: string[];
  headingOrderProblems: string[];
  h1Count: number;
  hasMain: boolean;
  hasNav: boolean;
  controls: number;
  keyboardReachable: number;
  lowContrast: {
    selector: string;
    ratio: number;
  }[];
  zoomBlocked: boolean;

  /**
   * Additional accessibility evidence.
   */
  invalidTabIndexes?: string[];
  focusVisibleMissing?: string[];
};

export type PerformanceMeasurement = {
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

  oversizedImages: string[];

  renderBlocking: number;

  /**
   * Additional performance evidence.
   */
  cssBytes?: number;
  documentBytes?: number;
  thirdPartyResources?: number;
};

export type ViewportMeasurement = {
  width: number;

  scrollWidth: number;

  overflowing: {
    selector: string;
    right: number;
  }[];

  brokenImages: string[];

  clipped: string[];

  smallTargets: {
    selector: string;
    width: number;
    height: number;
  }[];

  tinyText: {
    selector: string;
    fontSize: number;
  }[];

  unreachable: string[];

  navigable: boolean;

  ctas: number;

  deadControls?: string[] | undefined;

  distortedImages?: string[] | undefined;

  overlapping?: string[] | undefined;

  narrowColumns?: string[] | undefined;

  stickyFooterHeight?: number | undefined;

  accessibility?: AccessibilityMeasurement | undefined;

  performance?: PerformanceMeasurement | undefined;
};

export type VisualFinding = {
  key: string;

  severity: "p0" | "advice";

  detail: string;

  fix: string;

  width: number;

  page?: string;
};

export type VisualCoverage = {
  accessibility: boolean;
  performance: boolean;
};

export type VisualReport = {
  score: number;

  passed: boolean;

  findings: VisualFinding[];

  widths: number[];

  pages?: string[];

  coverage?: VisualCoverage;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const px = (
  value: unknown,
): number =>
  typeof value === "number" &&
  Number.isFinite(value)
    ? value
    : 0;

const uniqueStrings = (
  values: string[],
): string[] =>
  Array.from(
    new Set(
      values.filter(
        (value) =>
          typeof value ===
            "string" &&
          value.trim()
            .length > 0,
      ),
    ),
  );

const findingKey = (
  finding: VisualFinding,
): string =>
  [
    finding.page ?? "",
    finding.key,
    finding.width,
    finding.detail
      .replace(
        /\d+(?:\.\d+)?/g,
        "#",
      )
      .trim(),
  ].join("|");

/**
 * Remove duplicate findings caused by several DOM nodes producing the same
 * underlying problem.
 */
const dedupeFindings = (
  findings: VisualFinding[],
): VisualFinding[] => {
  const seen =
    new Set<string>();

  const result: VisualFinding[] =
    [];

  for (const finding of findings) {
    const key =
      findingKey(finding);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(finding);
  }

  return result;
};

/* -------------------------------------------------------------------------- */
/* VIEWPORT GRADING                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Grades one real browser viewport.
 *
 * P0 means the visitor experience is materially broken.
 * Advice means the page works but should be improved.
 */
export function gradeViewport(
  measurement: ViewportMeasurement,
): VisualFinding[] {
  const width =
    px(measurement.width);

  const phone =
    width <= 500;

  const found: VisualFinding[] =
    [];

  const add = (
    key: string,
    severity: VisualFinding["severity"],
    detail: string,
    fix: string,
  ): void => {
    found.push({
      key,
      severity,
      detail,
      fix,
      width,
    });
  };

  /* --------------------------- RESPONSIVE -------------------------------- */

  if (
    width > 0 &&
    px(
      measurement.scrollWidth,
    ) >
      width + 1
  ) {
    add(
      "horizontal_overflow",
      "p0",
      `At ${width}px the page is ${Math.round(
        px(
          measurement.scrollWidth,
        ) - width,
      )}px too wide and can scroll sideways.`,
      "Find the widest element and let it shrink, wrap, or use a contained overflow region.",
    );
  }

  for (const element of (
    measurement.overflowing ??
    []
  ).slice(0, 6)) {
    add(
      "element_overflow",
      "p0",
      `At ${width}px “${element.selector}” extends beyond the visible screen.`,
      "Make the element responsive instead of using a fixed width that exceeds its container.",
    );
  }

  for (const node of (
    measurement.clipped ??
    []
  ).slice(0, 6)) {
    add(
      "clipped_text",
      "p0",
      `At ${width}px text is being clipped in “${node}”.`,
      "Allow the text to wrap and remove fixed heights that cut off content.",
    );
  }

  /* ------------------------------ IMAGES --------------------------------- */

  for (const image of (
    measurement.brokenImages ??
    []
  ).slice(0, 6)) {
    add(
      "broken_image",
      "p0",
      `A visible image failed to load: ${image}.`,
      "Replace the broken asset with a valid image or remove the image.",
    );
  }

  for (const image of (
    measurement.distortedImages ??
    []
  ).slice(0, 6)) {
    add(
      "distorted_image",
      "advice",
      `An image is being stretched or squashed: ${image}.`,
      "Preserve the image aspect ratio or use an intentional object-fit crop.",
    );
  }

  /* --------------------------- NAVIGATION -------------------------------- */

  if (
    !measurement.navigable
  ) {
    add(
      "menu_unusable",
      "p0",
      `At ${width}px the primary navigation cannot be opened or reached.`,
      "Provide a usable mobile menu or visible navigation links.",
    );
  }

  /* ---------------------------- CONVERSION ------------------------------- */

  if (
    measurement.ctas <= 0
  ) {
    add(
      "no_visible_cta",
      "p0",
      `At ${width}px there is no visible conversion action.`,
      "Add a real call, booking, quote, contact, enquiry, or other appropriate next-step control.",
    );
  }

  for (const control of (
    measurement.deadControls ??
    []
  ).slice(0, 6)) {
    add(
      "dead_control",
      "p0",
      `“${control}” appears interactive but does not lead anywhere.`,
      "Give the control a real destination or remove it.",
    );
  }

  for (const control of (
    measurement.unreachable ??
    []
  ).slice(0, 6)) {
    add(
      "unreachable_control",
      "p0",
      `At ${width}px “${control}” cannot be reliably reached because another element covers or displaces it.`,
      "Remove the overlap, add sufficient spacing, or correct the fixed/sticky layout.",
    );
  }

  /* ----------------------------- TOUCH ----------------------------------- */

  if (phone) {
    for (const target of (
      measurement.smallTargets ??
      []
    ).slice(0, 8)) {
      add(
        "small_tap_target",
        "advice",
        `“${target.selector}” is approximately ${Math.round(
          target.width,
        )}×${Math.round(
          target.height,
        )}px and may be uncomfortable to tap.`,
        "Give important mobile controls a comfortable tappable area of about 44px or more.",
      );
    }
  }

  /* ------------------------------ TYPE ----------------------------------- */

  for (const text of (
    measurement.tinyText ??
    []
  ).slice(0, 8)) {
    add(
      "tiny_text",
      "advice",
      `Text in “${text.selector}” is only ${Math.round(
        text.fontSize,
      )}px.`,
      "Use readable body text and avoid forcing important content into tiny typography.",
    );
  }

  /* ---------------------------- OVERLAP ---------------------------------- */

  for (const pair of (
    measurement.overlapping ??
    []
  ).slice(0, 6)) {
    add(
      "overlapping_content",
      "p0",
      `At ${width}px two visible content blocks overlap: ${pair}.`,
      "Let the blocks stack or resize instead of occupying the same readable area.",
    );
  }

  for (const column of (
    measurement.narrowColumns ??
    []
  ).slice(0, 4)) {
    add(
      "narrow_column",
      "advice",
      `“${column}” is squeezed into an unusually narrow text column at ${width}px.`,
      "Allow readable content to use more available width.",
    );
  }

  /* --------------------------- STICKY UI --------------------------------- */

  if (
    phone &&
    px(
      measurement.stickyFooterHeight,
    ) >
      120
  ) {
    add(
      "sticky_footer_too_tall",
      "advice",
      `A fixed bottom bar occupies approximately ${Math.round(
        px(
          measurement.stickyFooterHeight,
        ),
      )}px of the phone screen.`,
      "Keep sticky actions compact so they do not consume a large portion of the viewport.",
    );
  }

  /* -------------------------- ACCESSIBILITY ------------------------------ */

  const a11y =
    measurement.accessibility;

  if (a11y) {
    if (
      a11y.zoomBlocked
    ) {
      add(
        "zoom_blocked",
        "p0",
        "The page prevents normal browser zooming.",
        "Allow visitors to zoom the page, especially users with low vision.",
      );
    }

    for (const image of (
      a11y.imagesMissingAlt ??
      []
    ).slice(0, 6)) {
      add(
        "image_missing_alt",
        "advice",
        `A meaningful image has no accessible alternative text: ${image}.`,
        "Add concise alt text describing the meaningful image content.",
      );
    }

    for (const control of (
      a11y.unlabeledControls ??
      []
    ).slice(0, 6)) {
      add(
        "unlabeled_control",
        "advice",
        `An interactive control has no accessible name: ${control}.`,
        "Give the control visible text or an appropriate accessible label.",
      );
    }

    for (const input of (
      a11y.unlabeledInputs ??
      []
    ).slice(0, 6)) {
      add(
        "unlabeled_input",
        "p0",
        `A form field has no accessible label: ${input}.`,
        "Associate the field with a visible label or an equivalent accessible name.",
      );
    }

    for (const heading of (
      a11y.headingOrderProblems ??
      []
    ).slice(0, 4)) {
      add(
        "heading_order",
        "advice",
        `Heading structure skips a level near “${heading}”.`,
        "Use heading levels in a logical hierarchy.",
      );
    }

    if (
      a11y.h1Count ===
      0
    ) {
      add(
        "missing_h1",
        "advice",
        "The page has no visible H1 heading.",
        "Give the page one clear primary heading.",
      );
    }

    if (
      a11y.h1Count >
      1
    ) {
      add(
        "multiple_h1",
        "advice",
        `The page has ${a11y.h1Count} visible H1 headings.`,
        "Use one clear primary H1 and use lower-level headings for supporting sections.",
      );
    }

    if (
      !a11y.hasMain
    ) {
      add(
        "missing_main_landmark",
        "advice",
        "The page has no main content landmark.",
        "Use a semantic <main> region for the primary page content.",
      );
    }

    if (
      !a11y.hasNav
    ) {
      add(
        "missing_nav_landmark",
        "advice",
        "The page has no navigation landmark.",
        "Use a semantic <nav> region for primary navigation.",
      );
    }

    if (
      a11y.controls >
        0 &&
      a11y.keyboardReachable <
        a11y.controls
    ) {
      add(
        "keyboard_unreachable",
        "p0",
        `${a11y.controls - a11y.keyboardReachable} interactive control(s) cannot be reached normally by keyboard.`,
        "Use native buttons/links or correctly implemented keyboard-accessible controls.",
      );
    }

    for (const item of (
      a11y.lowContrast ??
      []
    ).slice(0, 6)) {
      add(
        "low_contrast",
        "advice",
        `Text in “${item.selector}” has approximately ${item.ratio.toFixed(
          1,
        )}:1 contrast.`,
        "Increase text/background contrast to an appropriate accessible level.",
      );
    }

    for (const item of (
      a11y.invalidTabIndexes ??
      []
    ).slice(0, 4)) {
      add(
        "invalid_tab_index",
        "advice",
        `A control uses a suspicious positive tabindex: ${item}.`,
        "Prefer natural document order and avoid positive tabindex values.",
      );
    }

    for (const item of (
      a11y.focusVisibleMissing ??
      []
    ).slice(0, 4)) {
      add(
        "missing_focus_indicator",
        "advice",
        `A keyboard-focusable control appears to lack a visible focus indicator: ${item}.`,
        "Provide a clear :focus-visible state.",
      );
    }
  }

  /* ---------------------------- PERFORMANCE ------------------------------ */

  const performance =
    measurement.performance;

  if (performance) {
    if (
      performance.lcp !==
        null &&
      performance.lcp >
        4000
    ) {
      add(
        "slow_main_content",
        "advice",
        `Largest contentful paint took approximately ${(
          performance.lcp /
          1000
        ).toFixed(1)}s.`,
        "Prioritize the main visual, reduce render-blocking work, and optimize the largest image or content block.",
      );
    }

    if (
      performance.cls !==
        null &&
      performance.cls >
        0.1
    ) {
      add(
        "layout_shift",
        "advice",
        `The page has measurable layout movement with a CLS of ${performance.cls.toFixed(
          2,
        )}.`,
        "Reserve space for images, fonts and dynamic content before they load.",
      );
    }

    if (
      performance.ttfb !==
        null &&
      performance.ttfb >
        1500
    ) {
      add(
        "slow_server_response",
        "advice",
        `The initial server response took approximately ${(
          performance.ttfb /
          1000
        ).toFixed(1)}s.`,
        "Investigate server response time, caching, data fetching and deployment configuration.",
      );
    }

    if (
      performance.failedRequests >
        0
    ) {
      add(
        "failed_requests",
        "p0",
        `${performance.failedRequests} network resource(s) failed to load.`,
        "Identify failed requests and repair, replace or remove the affected resources.",
      );
    }

    if (
      performance.imageBytes >
      3_000_000
    ) {
      add(
        "heavy_images",
        "advice",
        `Images transferred approximately ${(
          performance.imageBytes /
          1_000_000
        ).toFixed(1)}MB.`,
        "Compress images, use responsive formats, and avoid shipping desktop-sized assets to phones.",
      );
    }

    if (
      performance.scriptBytes >
      2_500_000
    ) {
      add(
        "heavy_scripts",
        "advice",
        `JavaScript transferred approximately ${(
          performance.scriptBytes /
          1_000_000
        ).toFixed(1)}MB.`,
        "Split large bundles, remove unnecessary dependencies, and lazy-load noncritical features.",
      );
    }

    if (
      performance.fontBytes >
      1_000_000
    ) {
      add(
        "heavy_fonts",
        "advice",
        `Font resources transferred approximately ${(
          performance.fontBytes /
          1_000_000
        ).toFixed(1)}MB.`,
        "Use fewer font files and only load the weights actually used.",
      );
    }

    if (
      performance.renderBlocking >
      5
    ) {
      add(
        "render_blocking",
        "advice",
        `${performance.renderBlocking} resources were reported as render-blocking.`,
        "Reduce render-blocking resources and defer noncritical work.",
      );
    }

    if (
      performance.thirdPartyResources !==
        undefined &&
      performance.thirdPartyResources >
        15
    ) {
      add(
        "third_party_overhead",
        "advice",
        `${performance.thirdPartyResources} third-party resources were detected.`,
        "Remove unnecessary third-party scripts and defer optional integrations.",
      );
    }

    for (const image of (
      performance.oversizedImages ??
      []
    ).slice(0, 5)) {
      add(
        "oversized_image",
        "advice",
        `An image is substantially larger than the rendered space it occupies: ${image}.`,
        "Use a responsive image size closer to the displayed dimensions.",
      );
    }
  }

  return dedupeFindings(
    found,
  );
}

/* -------------------------------------------------------------------------- */
/* SINGLE PAGE REPORT                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Grades every measurement collected for one page.
 *
 * No measurements means no pass.
 */
export function gradeVisual(
  measurements: ViewportMeasurement[],
  page?: string,
): VisualReport {
  if (
    !Array.isArray(
      measurements,
    ) ||
    measurements.length ===
      0
  ) {
    const finding: VisualFinding =
      {
        key: "not_measured",
        severity: "p0",
        detail:
          "The page has not been measured in a real browser.",
        fix:
          "Run the visual measurement at the required viewport widths.",
        width: 0,
        ...(page
          ? { page }
          : {}),
      };

    return {
      score: 0,
      passed: false,
      findings: [finding],
      widths: [],
      ...(page
        ? {
            pages: [page],
          }
        : {}),
      coverage: {
        accessibility: false,
        performance: false,
      },
    };
  }

  const validMeasurements =
    measurements.filter(
      (measurement) =>
        px(
          measurement.width,
        ) > 0,
    );

  if (
    validMeasurements.length ===
    0
  ) {
    return {
      score: 0,
      passed: false,
      findings: [
        {
          key: "not_measured",
          severity: "p0",
          detail:
            "No valid viewport measurements were returned by the browser.",
          fix:
            "Run the browser measurement again and return a valid viewport width.",
          width: 0,
          ...(page
            ? { page }
            : {}),
        },
      ],
      widths: [],
      ...(page
        ? {
            pages: [page],
          }
        : {}),
      coverage: {
        accessibility: false,
        performance: false,
      },
    };
  }

  const findings =
    dedupeFindings(
      validMeasurements
        .flatMap(
          gradeViewport,
        )
        .map((finding) =>
          page
            ? {
                ...finding,
                page,
              }
            : finding,
        ),
    );

  const widths =
    uniqueNumbers(
      validMeasurements.map(
        (measurement) =>
          px(
            measurement.width,
          ),
      ),
    ).sort(
      (a, b) => a - b,
    );

  const score =
    scoreFindings(
      findings,
    );

  return {
    score,
    passed:
      !findings.some(
        (finding) =>
          finding.severity ===
          "p0",
      ),
    findings,
    widths,
    ...(page
      ? {
          pages: [page],
        }
      : {}),
    coverage: {
      accessibility:
        validMeasurements.some(
          (measurement) =>
            !!measurement.accessibility,
        ),
      performance:
        validMeasurements.some(
          (measurement) =>
            !!measurement.performance,
        ),
    },
  };
}

function uniqueNumbers(
  values: number[],
): number[] {
  return Array.from(
    new Set(
      values.filter(
        (value) =>
          Number.isFinite(
            value,
          ) &&
          value > 0,
      ),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* VISUAL SCORE                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Scores distinct faults rather than multiplying one fault by every viewport.
 *
 * P0:
 *   - large penalty
 *
 * Advice:
 *   - smaller penalty
 *
 * A page with no evidence is not awarded a fake perfect score.
 */
function scoreFindings(
  findings: VisualFinding[],
): number {
  if (
    findings.length ===
    0
  ) {
    return 100;
  }

  const distinctP0 =
    new Set(
      findings
        .filter(
          (finding) =>
            finding.severity ===
            "p0",
        )
        .map(
          (finding) =>
            `${finding.page ?? ""}|${finding.key}|${finding.detail
              .replace(
                /\d+(?:\.\d+)?/g,
                "#",
              )
              .trim()}`,
        ),
    ).size;

  const distinctAdvice =
    new Set(
      findings
        .filter(
          (finding) =>
            finding.severity ===
            "advice",
        )
        .map(
          (finding) =>
            `${finding.page ?? ""}|${finding.key}|${finding.detail
              .replace(
                /\d+(?:\.\d+)?/g,
                "#",
              )
              .trim()}`,
        ),
    ).size;

  const penalty =
    distinctP0 * 20 +
    distinctAdvice * 3;

  return Math.max(
    0,
    Math.min(
      100,
      100 - penalty,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* WHOLE-SITE GRADING                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Grades the entire visitor-visible site.
 *
 * Every expected page must be measured independently.
 *
 * A beautiful homepage cannot prove that Services, Pricing, Contact,
 * Booking or other pages work.
 */
export function gradeSite(
  expectedPages: string[],
  reports: {
    page: string;
    report: VisualReport;
  }[],
): VisualReport {
  const expected =
    uniqueStrings(
      expectedPages,
    );

  const measured =
    new Map<
      string,
      VisualReport
    >(
      reports.map(
        (entry) => [
          entry.page,
          entry.report,
        ],
      ),
    );

  const findings: VisualFinding[] =
    [];

  const widths =
    new Set<number>();

  const pages: string[] =
    [];

  let accessibility =
    expected.length > 0;

  let performance =
    expected.length > 0;

  /* ----------------------------- PAGES ---------------------------------- */

  for (const page of expected) {
    const report =
      measured.get(page);

    if (
      !report ||
      !report.widths.length
    ) {
      findings.push({
        key:
          "page_not_measured",
        severity: "p0",
        detail: `“${page}” has not been measured in a real browser.`,
        fix:
          "Run the visual check against this page at every required viewport width.",
        width: 0,
        page,
      });

      accessibility =
        false;

      performance =
        false;

      continue;
    }

    pages.push(page);

    for (const width of
      report.widths) {
      widths.add(width);
    }

    for (const finding of
      report.findings) {
      findings.push({
        ...finding,
        page,
      });
    }

    if (
      !report.coverage
        ?.accessibility
    ) {
      accessibility =
        false;
    }

    if (
      !report.coverage
        ?.performance
    ) {
      performance =
        false;
    }
  }

  /* --------------------------- WIDTH COVERAGE --------------------------- */

  if (
    pages.length > 0
  ) {
    const missingWidths =
      VIEWPORTS.filter(
        (width) =>
          !widths.has(width),
      );

    if (
      missingWidths.length >
      0
    ) {
      findings.push({
        key:
          "widths_not_measured",
        severity: "p0",
        detail: `The website was not checked at ${missingWidths.join(
          ", ",
        )}px.`,
        fix:
          "Measure every required viewport so responsive behavior is actually proven.",
        width: 0,
      });
    }
  }

  /* --------------------------- EMPTY SITE ------------------------------- */

  if (
    expected.length ===
    0
  ) {
    findings.push({
      key: "not_measured",
      severity: "p0",
      detail:
        "There are no visitor-visible pages available to measure.",
      fix:
        "Build or publish the website before running the visual quality check.",
      width: 0,
    });
  }

  const unique =
    dedupeFindings(
      findings,
    );

  return {
    score:
      scoreFindings(
        unique,
      ),

    passed:
      !unique.some(
        (finding) =>
          finding.severity ===
          "p0",
      ),

    findings: unique,

    widths:
      [...widths].sort(
        (a, b) => a - b,
      ),

    pages,

    coverage: {
      accessibility,
      performance,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* BROWSER MEASUREMENT SCRIPT                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Browser-side measurement script.
 *
 * This is intentionally plain JavaScript inside a string so the same script
 * can be executed by Playwright, a browser worker, devtools tooling, or a
 * future Revora visual checker.
 */
export const MEASURE_SCRIPT = `(() => {
  const width = window.innerWidth;

  const label = (el) => {
    if (!el) return 'unknown';

    const tag = (el.tagName || 'element').toLowerCase();
    const id = el.id ? '#' + String(el.id).slice(0, 30) : '';

    const className =
      typeof el.className === 'string'
        ? el.className.trim().split(/\\s+/)[0]
        : '';

    const cls = className
      ? '.' + className.slice(0, 30)
      : '';

    return (tag + id + cls).slice(0, 100);
  };

  const visible = (el) => {
    if (!el) return false;

    const style = getComputedStyle(el);

    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.contentVisibility === 'hidden' ||
      Number(style.opacity) === 0
    ) {
      return false;
    }

    const box = el.getBoundingClientRect();

    return (
      box.width > 0 &&
      box.height > 0
    );
  };

  const all = [
    ...document.querySelectorAll('body *')
  ].filter(visible);

  const controls = [
    ...document.querySelectorAll(
      'a[href], button, [role="button"], input, select, textarea, summary'
    )
  ].filter(visible);

  /*
   * Decorative overflow should not be treated as a broken layout.
   *
   * A glow, shadow, carousel viewport or intentional contained visual may
   * extend inside an overflow-hidden parent without creating page overflow.
   */
  const containedOverflow = (el) => {
    if (
      getComputedStyle(el).pointerEvents === 'none'
    ) {
      return true;
    }

    let parent = el.parentElement;

    while (
      parent &&
      parent !== document.documentElement
    ) {
      const style = getComputedStyle(parent);

      if (
        style.overflowX !== 'visible' ||
        style.overflow !== 'visible'
      ) {
        return true;
      }

      parent = parent.parentElement;
    }

    return false;
  };

  /* --------------------------- RESPONSIVE ------------------------------- */

  const overflowing = all
    .filter((el) => {
      const box =
        el.getBoundingClientRect();

      return (
        box.right > width + 1 &&
        !containedOverflow(el)
      );
    })
    .slice(0, 12)
    .map((el) => ({
      selector: label(el),
      right: Math.round(
        el.getBoundingClientRect().right
      )
    }));

  const brokenImages = [
    ...document.images
  ]
    .filter(
      (img) =>
        !img.complete ||
        img.naturalWidth === 0
    )
    .slice(0, 12)
    .map(
      (img) =>
        (
          img.currentSrc ||
          img.src ||
          label(img)
        ).slice(0, 140)
    );

  /*
   * Detect actual clipped text rather than every overflow-hidden element.
   */
  const clipped = all
    .filter(
      (el) =>
        el.childElementCount === 0 &&
        (el.textContent || '')
          .trim()
          .length > 0
    )
    .filter((el) => {
      const style =
        getComputedStyle(el);

      const horizontalClip =
        style.overflowX === 'hidden' &&
        el.scrollWidth >
          el.clientWidth + 2;

      const verticalClip =
        style.overflowY === 'hidden' &&
        el.scrollHeight >
          el.clientHeight + 2;

      return (
        horizontalClip ||
        verticalClip
      );
    })
    .slice(0, 12)
    .map((el) =>
      (el.textContent || '')
        .trim()
        .slice(0, 80)
    );

  /* ---------------------------- TOUCH ----------------------------------- */

  const smallTargets = controls
    .filter((el) => {
      const style =
        getComputedStyle(el);

      /*
       * Inline links inside paragraphs are not button-sized controls.
       * Their line height should not be mistaken for a broken tap target.
       */
      return (
        style.display !== 'inline' &&
        style.visibility !== 'hidden'
      );
    })
    .map((el) => ({
      el,
      box:
        el.getBoundingClientRect()
    }))
    .filter(
      ({ box }) =>
        box.width > 0 &&
        box.height > 0 &&
        (
          box.width < 44 ||
          box.height < 44
        )
    )
    .slice(0, 12)
    .map(({ el, box }) => ({
      selector: label(el),
      width: box.width,
      height: box.height
    }));

  const tinyText = all
    .filter(
      (el) =>
        el.childElementCount === 0 &&
        (el.textContent || '')
          .trim()
          .length > 20
    )
    .map((el) => ({
      el,
      size:
        parseFloat(
          getComputedStyle(el)
            .fontSize
        ) || 16
    }))
    .filter(
      ({ el, size }) => {
        const style =
          getComputedStyle(el);

        /*
         * Tiny metadata labels can be intentional.
         * Body-like text below 13px is much more concerning.
         */
        return (
          size > 0 &&
          size < 13 &&
          style.textTransform !==
            'uppercase'
        );
      }
    )
    .slice(0, 12)
    .map(({ el, size }) => ({
      selector: label(el),
      fontSize: size
    }));

  /* ---------------------------- Z-INDEX / HIT TEST --------------------- */

  const unreachable = controls
    .filter((el) => {
      const box =
        el.getBoundingClientRect();

      if (
        box.right < 0 ||
        box.left > width ||
        box.bottom < 0 ||
        box.top >
          window.innerHeight
      ) {
        return false;
      }

      const x = Math.min(
        width - 1,
        Math.max(
          1,
          box.left +
            box.width / 2
        )
      );

      const y = Math.min(
        window.innerHeight - 1,
        Math.max(
          1,
          box.top +
            box.height / 2
        )
      );

      const hit =
        document.elementFromPoint(
          x,
          y
        );

      if (
        !hit ||
        el.contains(hit) ||
        hit.contains(el)
      ) {
        return false;
      }

      let parent = hit;

      while (
        parent &&
        parent !==
          document.documentElement
      ) {
        const style =
          getComputedStyle(parent);

        /*
         * Fixed/sticky UI can legitimately occupy the same screen region.
         * Only report ordinary content that blocks a control.
         */
        if (
          style.position ===
            'fixed' ||
          style.position ===
            'sticky'
        ) {
          return false;
        }

        parent =
          parent.parentElement;
      }

      return true;
    })
    .slice(0, 12)
    .map(label);

  /* ---------------------------- CTA ------------------------------------- */

  const actionWords =
    /call|book|quote|contact|get started|start now|enquir|inquir|estimate|schedule|request|available|see services|message|email|apply|hire|order|reserve|consult/i;

  const ctaControls =
    controls.filter((el) => {
      const href =
        (
          el.getAttribute(
            'href'
          ) || ''
        ).trim();

      const text =
        (
          (el.textContent || '') +
          ' ' +
          (
            el.getAttribute(
              'aria-label'
            ) || ''
          )
        ).trim();

      const box =
        el.getBoundingClientRect();

      if (
        box.width < 20 ||
        box.height < 20
      ) {
        return false;
      }

      const conversionTarget =
        /^(tel:|mailto:|sms:)/i.test(
          href
        ) ||
        /book|quote|contact|schedul|estimate|appoint|start|reserve|consult/i.test(
          href
        );

      return (
        conversionTarget ||
        (
          actionWords.test(text) &&
          (
            href.length > 1 ||
            el.tagName ===
              'BUTTON' ||
            el.getAttribute(
              'role'
            ) ===
              'button'
          )
        )
      );
    });

  const ctas =
    ctaControls.length;

  const deadControls =
    controls
      .filter((el) => {
        if (
          el.tagName !== 'A'
        ) {
          return false;
        }

        const href =
          (
            el.getAttribute(
              'href'
            ) || ''
          ).trim();

        return (
          href === '' ||
          href === '#' ||
          /^javascript:/i.test(
            href
          )
        );
      })
      .slice(0, 12)
      .map(label);

  /* ---------------------------- IMAGES ---------------------------------- */

  const distortedImages =
    [
      ...document.images
    ]
      .filter(visible)
      .filter((img) => {
        if (
          !img.naturalWidth ||
          !img.naturalHeight
        ) {
          return false;
        }

        const box =
          img.getBoundingClientRect();

        if (
          box.width < 40 ||
          box.height < 40
        ) {
          return false;
        }

        const natural =
          img.naturalWidth /
          img.naturalHeight;

        const shown =
          box.width /
          box.height;

        /*
         * Only flag actual distortion when object-fit is fill.
         * Cover/contain are normally intentional.
         */
        if (
          getComputedStyle(
            img
          ).objectFit !== 'fill'
        ) {
          return false;
        }

        return (
          Math.abs(
            natural - shown
          ) /
            natural >
          0.15
        );
      })
      .slice(0, 12)
      .map(
        (img) =>
          (
            img.currentSrc ||
            img.src ||
            label(img)
          ).slice(0, 140)
      );

  /* -------------------------- OVERLAPPING -------------------------------- */

  const textBlocks =
    all
      .filter(
        (el) =>
          el.childElementCount === 0 &&
          (el.textContent || '')
            .trim()
            .length > 24
      )
      .filter(
        (el) =>
          getComputedStyle(
            el
          ).position === 'static'
      )
      .slice(0, 160);

  const overlapping = [];

  for (
    let i = 0;
    i <
      textBlocks.length &&
      overlapping.length <
        6;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < textBlocks.length;
      j += 1
    ) {
      const a =
        textBlocks[i]
          .getBoundingClientRect();

      const b =
        textBlocks[j]
          .getBoundingClientRect();

      if (
        textBlocks[i].contains(
          textBlocks[j]
        ) ||
        textBlocks[j].contains(
          textBlocks[i]
        )
      ) {
        continue;
      }

      const overlapX =
        Math.min(
          a.right,
          b.right
        ) -
        Math.max(
          a.left,
          b.left
        );

      const overlapY =
        Math.min(
          a.bottom,
          b.bottom
        ) -
        Math.max(
          a.top,
          b.top
        );

      if (
        overlapX > 12 &&
        overlapY > 12
      ) {
        overlapping.push(
          (
            label(
              textBlocks[i]
            ) +
            ' / ' +
            label(
              textBlocks[j]
            )
          ).slice(0, 140)
        );

        break;
      }
    }
  }

  /* --------------------------- NARROW COLUMNS ---------------------------- */

  const narrowColumns =
    all
      .filter(
        (el) =>
          el.childElementCount === 0 &&
          (el.textContent || '')
            .trim()
            .length > 80
      )
      .filter((el) => {
        const box =
          el.getBoundingClientRect();

        const size =
          parseFloat(
            getComputedStyle(
              el
            ).fontSize
          ) || 16;

        return (
          box.width > 0 &&
          box.width <
            Math.min(
              180,
              size * 12
            ) &&
          width >= 360
        );
      })
      .slice(0, 6)
      .map(label);

  /* --------------------------- STICKY BAR ------------------------------- */

  const fixedBars =
    all.filter((el) => {
      const style =
        getComputedStyle(el);

      if (
        style.position !==
        'fixed'
      ) {
        return false;
      }

      const box =
        el.getBoundingClientRect();

      return (
        box.height > 0 &&
        box.bottom >
          window.innerHeight -
            8 &&
        box.width >
          width * 0.5
      );
    });

  const stickyFooterHeight =
    fixedBars.reduce(
      (tallest, el) =>
        Math.max(
          tallest,
          el.getBoundingClientRect()
            .height
        ),
      0
    );

  /* ---------------------------- NAVIGATION ------------------------------ */

  const menuButton =
    [
      ...document.querySelectorAll(
        'button, [role="button"]'
      )
    ].some((el) => {
      if (!visible(el)) {
        return false;
      }

      const text =
        (
          el.getAttribute(
            'aria-label'
          ) || ''
        ) +
        ' ' +
        (
          el.textContent || ''
        );

      return /menu|navigation|open/i.test(
        text
      );
    });

  const inlineNav =
    [
      ...document.querySelectorAll(
        'nav a[href]'
      )
    ].filter(visible).length >=
    2;

  const navigable =
    width > 500
      ? inlineNav ||
        menuButton
      : menuButton ||
        inlineNav;

  /* -------------------------- ACCESSIBILITY ----------------------------- */

  const named = (el) => {
    const text =
      (
        el.textContent ||
        ''
      ).trim();

    const aria =
      (
        el.getAttribute(
          'aria-label'
        ) || ''
      ).trim();

    const title =
      (
        el.getAttribute(
          'title'
        ) || ''
      ).trim();

    const labelledBy =
      (
        el.getAttribute(
          'aria-labelledby'
        ) || ''
      ).trim();

    return (
      text.length > 0 ||
      aria.length > 0 ||
      title.length > 0 ||
      (
        labelledBy.length > 0 &&
        !!document.getElementById(
          labelledBy
        )
      ) ||
      !!el.querySelector(
        'img[alt]:not([alt=""])'
      )
    );
  };

  const imagesMissingAlt =
    [
      ...document.images
    ]
      .filter(visible)
      .filter((img) => {
        /*
         * Decorative images may legitimately have empty alt text.
         * Missing alt attribute entirely is the unsafe case.
         */
        return (
          img.getAttribute(
            'alt'
          ) === null &&
          img.getAttribute(
            'role'
          ) !== 'presentation' &&
          !img.getAttribute(
            'aria-hidden'
          )
        );
      })
      .slice(0, 12)
      .map(
        (img) =>
          (
            img.currentSrc ||
            img.src ||
            label(img)
          ).slice(0, 140)
      );

  const unlabeledControls =
    controls
      .filter(
        (el) =>
          (
            el.tagName ===
              'A' ||
            el.tagName ===
              'BUTTON' ||
            el.getAttribute(
              'role'
            ) ===
              'button'
          ) &&
          !named(el)
      )
      .slice(0, 12)
      .map(label);

  const fields =
    [
      ...document.querySelectorAll(
        'input:not([type="hidden"]), select, textarea'
      )
    ].filter(visible);

  const unlabeledInputs =
    fields
      .filter((el) => {
        if (
          el.getAttribute(
            'aria-label'
          ) ||
          el.getAttribute(
            'aria-labelledby'
          ) ||
          el.getAttribute(
            'title'
          )
        ) {
          return false;
        }

        if (
          el.id &&
          document.querySelector(
            'label[for="' +
              el.id.replace(
                /"/g,
                ''
              ) +
              '"]'
          )
        ) {
          return false;
        }

        return !el.closest(
          'label'
        );
      })
      .slice(0, 12)
      .map(label);

  const headings =
    [
      ...document.querySelectorAll(
        'h1,h2,h3,h4,h5,h6'
      )
    ].filter(visible);

  const headingOrderProblems =
    [];

  let previousLevel =
    0;

  for (
    const heading of
      headings
  ) {
    const level =
      Number(
        heading.tagName.slice(
          1
        )
      );

    if (
      previousLevel &&
      level >
        previousLevel + 1
    ) {
      headingOrderProblems.push(
        (
          heading.textContent ||
          label(heading)
        )
          .trim()
          .slice(0, 80)
      );
    }

    previousLevel =
      level;
  }

  const focusable =
    controls.filter(
      (el) => {
        const index =
          el.getAttribute(
            'tabindex'
          );

        if (
          index !== null &&
          Number(index) < 0
        ) {
          return false;
        }

        if (
          el.hasAttribute(
            'disabled'
          )
        ) {
          return false;
        }

        if (
          el.tagName ===
          'A'
        ) {
          return !!(
            el.getAttribute(
              'href'
            ) || ''
          ).trim();
        }

        if (
          el.tagName ===
          'BUTTON'
        ) {
          return true;
        }

        return (
          index !== null &&
          Number(index) >= 0
        );
      }
    );

  const invalidTabIndexes =
    controls
      .filter((el) => {
        const index =
          el.getAttribute(
            'tabindex'
          );

        return (
          index !== null &&
          Number(index) > 0
        );
      })
      .slice(0, 8)
      .map(label);

  const toRgb = (value) => {
    const match =
      /rgba?\$begin:math:text$\(\[\^\)\]\+\)\\$end:math:text$/.exec(
        value || ''
      );

    if (!match) {
      return null;
    }

    const parts =
      match[1]
        .split(',')
        .map((part) =>
          parseFloat(part)
        );

    if (
      parts.length >= 4 &&
      parts[3] === 0
    ) {
      return null;
    }

    if (
      parts.length < 3
    ) {
      return null;
    }

    return parts.slice(
      0,
      3
    );
  };

  const luminance = (
    rgb
  ) => {
    const channels =
      rgb.map(
        (value) => {
          const v =
            value / 255;

          return v <=
            0.03928
            ? v / 12.92
            : Math.pow(
                (
                  v +
                  0.055
                ) /
                  1.055,
                2.4
              );
        }
      );

    return (
      0.2126 *
        channels[0] +
      0.7152 *
        channels[1] +
      0.0722 *
        channels[2]
    );
  };

  const backgroundOf =
    (el) => {
      let node = el;

      while (
        node &&
        node !==
          document.documentElement
      ) {
        const rgb =
          toRgb(
            getComputedStyle(
              node
            ).backgroundColor
          );

        if (rgb) {
          return rgb;
        }

        node =
          node.parentElement;
      }

      return [
        255,
        255,
        255
      ];
    };

  const lowContrast =
    all
      .filter(
        (el) =>
          el.childElementCount ===
            0 &&
          (
            el.textContent ||
            ''
          )
            .trim()
            .length > 12
      )
      .slice(0, 100)
      .map((el) => {
        const style =
          getComputedStyle(
            el
          );

        const fg =
          toRgb(
            style.color
          );

        if (!fg) {
          return null;
        }

        const bg =
          backgroundOf(
            el
          );

        const l1 =
          luminance(fg);

        const l2 =
          luminance(bg);

        const ratio =
          (
            Math.max(
              l1,
              l2
            ) +
            0.05
          ) /
          (
            Math.min(
              l1,
              l2
            ) +
            0.05
          );

        const size =
          parseFloat(
            style.fontSize
          ) || 16;

        const bold =
          Number(
            style.fontWeight
          ) >= 700;

        const large =
          size >= 24 ||
          (
            bold &&
            size >=
              18.66
          );

        return ratio <
          (
            large
              ? 3
              : 4.5
          )
          ? {
              selector:
                label(el),
              ratio:
                Math.round(
                  ratio *
                    100
                ) /
                100
            }
          : null;
      })
      .filter(Boolean)
      .slice(0, 12);

  const viewportMeta =
    document.querySelector(
      'meta[name="viewport"]'
    );

  const viewportContent =
    viewportMeta
      ? (
          viewportMeta.getAttribute(
            'content'
          ) || ''
        )
      : '';

  const accessibility = {
    imagesMissingAlt,
    unlabeledControls,
    unlabeledInputs,
    headingOrderProblems:
      headingOrderProblems.slice(
        0,
        6
      ),
    h1Count:
      [
        ...document.querySelectorAll(
          'h1'
        )
      ].filter(visible)
        .length,
    hasMain:
      !!document.querySelector(
        'main, [role="main"]'
      ),
    hasNav:
      !!document.querySelector(
        'nav, [role="navigation"]'
      ),
    controls:
      controls.length,
    keyboardReachable:
      focusable.length,
    lowContrast,
    zoomBlocked:
      /user-scalable\\s*=\\s*no/i.test(
        viewportContent
      ) ||
      /maximum-scale\\s*=\\s*1(?:\\.0)?\\b/i.test(
        viewportContent
      ),
    invalidTabIndexes,
    focusVisibleMissing: []
  };

  /* --------------------------- PERFORMANCE ------------------------------ */

  const entry = (
    type
  ) => {
    try {
      return performance.getEntriesByType(
        type
      );
    } catch (
      error
    ) {
      return [];
    }
  };

  const nav =
    entry(
      'navigation'
    )[0] || null;

  const paint =
    entry(
      'paint'
    ).find(
      (p) =>
        p.name ===
        'first-contentful-paint'
    ) || null;

  const lcpEntries =
    entry(
      'largest-contentful-paint'
    );

  const resources =
    entry(
      'resource'
    );

  const bytes = (
    filter
  ) =>
    resources
      .filter(filter)
      .reduce(
        (
          total,
          resource
        ) =>
          total +
          (
            resource.transferSize ||
            resource.encodedBodySize ||
            0
          ),
        0
      );

  const cls =
    window.__revoraCls ===
      undefined
      ? null
      : window.__revoraCls;

  const oversizedImages =
    [
      ...document.images
    ]
      .filter(
        (img) =>
          img.naturalWidth >
          0
      )
      .filter((img) => {
        const box =
          img.getBoundingClientRect();

        if (
          box.width <=
            0 ||
          box.height <=
            0
        ) {
          return false;
        }

        const ratio =
          window.devicePixelRatio ||
          1;

        return (
          img.naturalWidth >
          box.width *
            ratio *
            2.2
        );
      })
      .slice(0, 8)
      .map(
        (img) =>
          (
            img.currentSrc ||
            img.src ||
            label(img)
          ).slice(0, 140)
      );

  const performanceMeasurement = {
    ttfb:
      nav
        ? Math.round(
            nav.responseStart
          )
        : null,

    fcp:
      paint
        ? Math.round(
            paint.startTime
          )
        : null,

    lcp:
      lcpEntries.length
        ? Math.round(
            lcpEntries[
              lcpEntries.length -
                1
            ].startTime
          )
        : null,

    cls:
      typeof cls ===
      'number'
        ? Math.round(
            cls * 1000
          ) / 1000
        : null,

    /*
     * INP is intentionally null unless a supported browser measurement
     * supplies a reliable value.
     */
    inp: null,

    longTasks:
      entry(
        'longtask'
      ).length || null,

    resources:
      resources.length,

    scriptBytes:
      bytes(
        (resource) =>
          resource.initiatorType ===
            'script' ||
          /\\.js(?:\\?|$)/i.test(
            resource.name
          )
      ),

    imageBytes:
      bytes(
        (resource) =>
          resource.initiatorType ===
            'img' ||
          /\\.(?:png|jpe?g|webp|avif|gif|svg)(?:\\?|$)/i.test(
            resource.name
          )
      ),

    fontBytes:
      bytes(
        (resource) =>
          /\\.(?:woff2?|ttf|otf)(?:\\?|$)/i.test(
            resource.name
          )
      ),

    cssBytes:
      bytes(
        (resource) =>
          resource.initiatorType ===
            'link' ||
          /\\.css(?:\\?|$)/i.test(
            resource.name
          )
      ),

    documentBytes:
      nav
        ? (
            nav.transferSize ||
            nav.encodedBodySize ||
            0
          )
        : 0,

    thirdPartyResources:
      resources.filter(
        (resource) => {
          try {
            return (
              new URL(
                resource.name
              ).origin !==
              window.location.origin
            );
          } catch (
            error
          ) {
            return false;
          }
        }
      ).length,

    failedRequests:
      resources.filter(
        (resource) =>
          (
            resource.responseStatus ||
            0
          ) >= 400
      ).length,

    oversizedImages,

    renderBlocking:
      resources.filter(
        (resource) =>
          resource.renderBlockingStatus ===
          'blocking'
      ).length
  };

  return {
    width,

    scrollWidth:
      Math.max(
        document.documentElement
          .scrollWidth,
        document.body
          ? document.body.scrollWidth
          : 0
      ),

    overflowing,

    brokenImages,

    clipped,

    smallTargets,

    tinyText,

    unreachable,

    navigable,

    ctas,

    deadControls,

    distortedImages,

    overlapping,

    narrowColumns,

    stickyFooterHeight,

    accessibility,

    performance:
      performanceMeasurement
  };
})()`;

/* -------------------------------------------------------------------------- */
/* LAYOUT SHIFT OBSERVER                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Install before the page is measured.
 *
 * This allows the browser to accumulate layout shift data while the page
 * renders instead of attempting to guess CLS afterwards.
 */
export const OBSERVE_SCRIPT = `(() => {
  if (window.__revoraClsInstalled) {
    return true;
  }

  window.__revoraClsInstalled = true;
  window.__revoraCls = 0;

  try {
    new PerformanceObserver((list) => {
      for (
        const entry of
          list.getEntries()
      ) {
        if (
          !entry.hadRecentInput
        ) {
          window.__revoraCls +=
            entry.value;
        }
      }
    }).observe({
      type:
        'layout-shift',
      buffered: true
    });
  } catch (
    error
  ) {
    window.__revoraCls =
      undefined;
  }

  return true;
})()`;