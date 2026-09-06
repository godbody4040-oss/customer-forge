"""LAYER 2 MEASURING — loads real pages in a real browser and records what it sees.

Usage:  python3 scripts/visual-qa.py <url> [more urls]

For every width Revora judges, it runs the shared measurement snippet from
src/lib/builder/visual.ts and writes the raw numbers to /tmp/visual-qa.json.
Grading is NOT done here: `bun scripts/visual-grade.ts` scores the same numbers
with the exact code the app uses, so a claim about how a page looks always comes
from one grader.
"""

import asyncio
import json
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
SOURCE = (ROOT / "src/lib/builder/visual.ts").read_text()

WIDTHS = [int(n) for n in re.search(r"VIEWPORTS = \[([^\]]+)\]", SOURCE).group(1).split(",") if n.strip().isdigit()]
SNIPPET = SOURCE.split("export const MEASURE_SCRIPT = `", 1)[1].rsplit("`;", 1)[0]


async def main(urls):
    out = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for url in urls:
            page_results = []
            for width in WIDTHS:
                context = await browser.new_context(viewport={"width": width, "height": 1800})
                page = await context.new_page()
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(400)
                    page_results.append(await page.evaluate(SNIPPET))
                except Exception as error:  # noqa: BLE001 - reported, never hidden
                    print(f"could not load {url} at {width}px: {error}", file=sys.stderr)
                finally:
                    await context.close()
            out.append({"url": url, "measurements": page_results})
        await browser.close()
    Path("/tmp/visual-qa.json").write_text(json.dumps(out))
    print(f"measured {sum(len(item['measurements']) for item in out)} viewport(s) -> /tmp/visual-qa.json")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Give at least one URL to check.", file=sys.stderr)
        raise SystemExit(1)
    asyncio.run(main(sys.argv[1:]))
