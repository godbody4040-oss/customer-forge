/**
 * LAYER 2 RUNNER — measures a real rendered page in a real browser.
 *
 * Usage: node scripts/visual-qa.mjs http://localhost:8080/s/<slug> [more urls]
 *
 * It loads each URL at every width Revora judges, runs the shared measurement
 * snippet from src/lib/builder/visual.ts, grades the numbers with the same code
 * the app uses, and prints the verdict. Nothing here invents a score: with no
 * measurements, the report says the site has not been checked.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error("Give at least one URL to check.");
  process.exit(1);
}

// The grader is TypeScript, so it is imported through the app's own tooling when
// available and otherwise evaluated from source via bun.
const { VIEWPORTS, MEASURE_SCRIPT, gradeVisual } = await import(
  pathToFileURL(new URL("../src/lib/builder/visual.ts", import.meta.url).pathname).href
).catch(() => {
  throw new Error(
    "Run this with bun so TypeScript sources can be imported: bun scripts/visual-qa.mjs <url>",
  );
});

void readFileSync;

const browser = await chromium.launch();
let failures = 0;

for (const url of urls) {
  const measurements = [];
  for (const width of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height: 1800 } });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(300);
      measurements.push(await page.evaluate(MEASURE_SCRIPT));
    } catch (error) {
      console.error(`could not load ${url} at ${width}px:`, error.message);
    } finally {
      await context.close();
    }
  }

  const report = gradeVisual(measurements);
  console.log(`\n${url} — ${report.score}/100 ${report.passed ? "PASS" : "FAIL"}`);
  for (const finding of report.findings)
    console.log(`  [${finding.severity}] ${finding.width}px ${finding.key}: ${finding.detail}`);
  if (!report.passed) failures += 1;
}

await browser.close();
process.exit(failures ? 1 : 0);
