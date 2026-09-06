/**
 * LAYER 2 GRADING — scores the measurements collected by scripts/visual-qa.py
 * using the app's own grader, so tooling and product can never disagree.
 *
 * Usage: bun scripts/visual-grade.ts [/tmp/visual-qa.json]
 */
import { readFileSync } from "node:fs";
import { gradeVisual, type ViewportMeasurement } from "../src/lib/builder/visual";

const file = process.argv[2] ?? "/tmp/visual-qa.json";
const pages = JSON.parse(readFileSync(file, "utf8")) as {
  url: string;
  measurements: ViewportMeasurement[];
}[];

let failures = 0;
for (const page of pages) {
  const report = gradeVisual(page.measurements);
  console.log(
    `\n${page.url} — ${report.score}/100 ${report.passed ? "PASS" : "FAIL"} (${report.widths.length} widths)`,
  );
  for (const finding of report.findings)
    console.log(`  [${finding.severity}] ${finding.width}px ${finding.key}: ${finding.detail}`);
  if (!report.passed) failures += 1;
}

process.exit(failures ? 1 : 0);
