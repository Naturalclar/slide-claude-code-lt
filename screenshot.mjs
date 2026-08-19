import playwright from "playwright";

// Regenerates the OGP/Twitter card. Writes straight into public/, because that
// is where index.html's meta tags resolve /card.png from -- writing to the repo
// root left the social card silently unchanged.
const URL = "http://localhost:5173";
const OUTPUT = "public/card.png";

const browser = await playwright["chromium"].launch();
// 1280x720 matches the existing card and Playwright's default viewport.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.emulateMedia({ colorScheme: "dark" });

try {
  await page.goto(URL, { waitUntil: "networkidle" });
} catch {
  console.error(`Could not reach ${URL}. Start the dev server first:

  bun dev
`);
  await browser.close();
  process.exit(1);
}

// Wait for the deck to actually paint rather than for a fixed delay: a slow
// first build used to produce a screenshot of a blank page.
await page.waitForSelector("#app h1", { state: "visible" });
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState("networkidle");

await page.screenshot({ path: OUTPUT });
await browser.close();

console.log(`Wrote ${OUTPUT}`);
