// Guards the styles.css overrides against silent breakage.
//
// styles.css cannot target RemdX by class, because RemdX renders its
// containers with inline styles and no classes or data attributes at all. The
// overrides therefore match on inline style strings, e.g.
// div[style*="transform: scale"]. If a RemdX upgrade changes the shape of
// those strings, the selectors stop matching and the deck quietly loses its
// white card, its gradient, or its disabled scaling -- with a green build.
//
// This serves the real build and asserts both that each selector still finds
// something and that the resulting page actually looks the way it should.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = "dist";
const PORT = 4317;
const SLIDES = 46;

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  const target = path.endsWith("/") ? join(file, "index.html") : file;
  try {
    await stat(target);
    res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404).end();
  }
});

// Each selector styles.css relies on, with what it must still match.
const SELECTORS = [
  { selector: '[style*="background-color: var(--background-color)"]', min: 1, styles: "the gradient background" },
  { selector: 'div[style*="position: relative"][style*="z-index: 0"]', min: 1, styles: "the slide container" },
  { selector: 'div[style*="position: relative"][style*="z-index: 0"] > *', min: 1, styles: "the white card" },
  { selector: 'div[style*="transform: scale"]', min: 1, styles: "the disabled scale transform" },
];

const failures = [];

await new Promise((resolve) => server.listen(PORT, resolve));
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  const counts = await page.evaluate(
    (sels) => sels.map((s) => document.querySelectorAll(s).length),
    SELECTORS.map(({ selector }) => selector),
  );
  SELECTORS.forEach(({ selector, min, styles }, index) => {
    if (counts[index] < min) {
      failures.push(`${selector}\n      matches ${counts[index]} elements, expected at least ${min} — ${styles} is no longer applied`);
    }
  });

  // The selectors can still match while the result looks wrong, so check what
  // actually got painted.
  const painted = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("div")].filter((element) => {
      const style = getComputedStyle(element);
      return style.backgroundColor === "rgb(255, 255, 255)" && style.borderRadius !== "0px";
    });
    const scaled = [...document.querySelectorAll('div[style*="transform: scale"]')].filter(
      (element) => getComputedStyle(element).transform !== "none",
    );
    return {
      cards: cards.length,
      scaled: scaled.length,
      bodyBackground: getComputedStyle(document.body).backgroundImage,
    };
  });

  if (painted.cards < SLIDES) {
    failures.push(`only ${painted.cards} of ${SLIDES} slides render the white card`);
  }
  if (painted.scaled > 0) {
    failures.push(`${painted.scaled} element(s) still carry a scale transform — content will not fit the fixed card`);
  }
  if (!painted.bodyBackground.includes("gradient")) {
    failures.push(`body has no gradient background (got ${painted.bodyBackground})`);
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error("styles.css no longer matches what RemdX renders:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nRemdX likely changed its inline styles. Compare styles.css against the" +
      "\nrendered DOM and update the selectors, then page through the deck.",
  );
  process.exit(1);
}

console.log(`styles.css OK: all selectors match, ${SLIDES} white cards, no scale transform, gradient present.`);
