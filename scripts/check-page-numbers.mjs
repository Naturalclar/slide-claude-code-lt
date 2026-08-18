// Verifies that every slide in slides.re.mdx carries exactly one
// <Note>Page N</Note> marker and that N matches the slide's position.
// Nothing else enforces this, and the numbering has silently drifted before.
import { readFileSync } from "node:fs";

const FILE = "slides.re.mdx";
const lines = readFileSync(FILE, "utf8").split("\n");

// Split into slides on a bare `---`, ignoring separators inside code fences.
const slides = [[]];
let inFence = false;
for (const [index, line] of lines.entries()) {
  if (line.startsWith("```")) inFence = !inFence;
  if (!inFence && line.trim() === "---") {
    slides.push([]);
    continue;
  }
  slides.at(-1).push({ line, number: index + 1 });
}

const errors = [];
slides.forEach((slide, index) => {
  const expected = index + 1;
  const markers = slide.flatMap(({ line, number }) => {
    const match = line.match(/<Note>Page (\d+)<\/Note>/);
    return match ? [{ found: Number(match[1]), number }] : [];
  });

  if (markers.length === 0) {
    errors.push(`slide ${expected}: missing <Note>Page ${expected}</Note>`);
    return;
  }
  if (markers.length > 1) {
    errors.push(
      `slide ${expected}: ${markers.length} page markers (lines ${markers
        .map(({ number }) => number)
        .join(", ")}), expected 1`,
    );
    return;
  }

  const [{ found, number }] = markers;
  if (found !== expected) {
    errors.push(
      `${FILE}:${number}: says "Page ${found}" but this is slide ${expected}`,
    );
  }
});

if (errors.length > 0) {
  console.error(`Page marker check failed (${slides.length} slides):\n`);
  for (const error of errors) console.error(`  ${error}`);
  console.error(
    `\nRenumber the <Note>Page N</Note> markers so they match slide order.`,
  );
  process.exit(1);
}

console.log(`Page markers OK: ${slides.length} slides, numbered 1-${slides.length}.`);
