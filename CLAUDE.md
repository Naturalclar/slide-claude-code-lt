# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-deck RemdX (React + MDX) presentation: 「Claude Codeによる並列開発のすゝめ」, an LT given at Claude Code Meetup about parallel development with git worktree / git bare clone. Slide content and speaker notes are in Japanese. Deployed to Vercel at `claude-code-meetup-lt.vercel.app`.

## Commands

```bash
bun dev         # dev server on :5173 (npm run dev also works)
bun run build   # vite build -> dist/
bun run screenshot   # requires `bun dev` running first (see below)
bun run deploy  # vercel --prod
```

There is no test suite, linter, or typecheck script — TypeScript is not even a declared dependency, and Vite does not typecheck. Verify changes by loading the dev server and paging through the affected slides.

`screenshot` runs `screenshot.mjs`, which drives Playwright against `http://localhost:5173` and writes `card.png` **into the repo root**. The OGP/Twitter meta tags in `index.html` point at `/card.png`, which is served from `public/` — so after regenerating, move the file into `public/card.png` or the social card won't change.

## Architecture

The render chain is small but entirely implicit; nothing imports anything the usual way:

1. `index.html` has an inline module script that imports `@nkzw/remdx/style.css` + `./styles.css` and calls `render(document.getElementById('app'), import('./slides.re.mdx'))`.
2. `@nkzw/vite-plugin-remdx` (registered in `vite.config.ts`) compiles `slides.re.mdx`.
3. `slides.re.mdx` starts with two re-exports:
   ```js
   export { Components } from "./Components.tsx";
   export { Themes } from "./Themes.tsx";
   ```
   RemdX picks these up, which is why every slide can use `<Row>`, `<Column>`, `<Image>` etc. with **no per-slide imports**. Adding a new slide component means adding a key to the `Components` object in `Components.tsx` — nothing else.
4. `slides.re.mdx.d.ts` supplies the TS types for the `.re.mdx` import.

### Slide syntax in `slides.re.mdx`

- `---` on its own line separates slides.
- An optional metadata block may precede a slide's body, terminated by `--`:
  ```
  ---

  transition: none

  --

  # Slide title
  ```
  `transition: none` is used heavily for build-up sequences — several near-identical slides that progressively reveal content, which should feel like one slide.
- `<Note>` renders `display: none`. It carries both the page number (`<Note>Page 12</Note>`) and free-form Japanese speaker notes; a slide often has two or more `<Note>` blocks.
- Page markers currently run `1`–`46` in slide order, one per slide, with no gaps. Nothing validates this, so it drifts easily: when adding, removing, or reordering slides, renumber every `<Note>Page N</Note>` from the insertion point onward.
- Images live in `public/` and are referenced both as `/name.png` and `./name.png`; both resolve.

### Layout constraints (`styles.css`)

`styles.css` is the fragile part of this repo. It overrides RemdX's own inline styles via `!important` and attribute selectors such as `div[style*="transform: scale"]` and `div[style*="position: relative"][style*="z-index: 0"]`. Consequences:

- RemdX's automatic slide **scaling transform is disabled**. Content does not shrink to fit — a slide that overflows the fixed white card (`calc(100vh - 3rem)`, `overflow: hidden`) is silently clipped. This is why `Components.tsx` sizes things in `vh`/fixed px and why images are given explicit `width`/`height`.
- The page paints a pink→yellow gradient background with a white card on top, forced globally. `Themes.tsx` only swaps the `--background-color`/`--text-color` CSS vars, so the `dark` theme is largely neutralized by these overrides.
- Any `@nkzw/remdx` upgrade can change the emitted inline styles and break these selectors. Check every slide visually after bumping it.

## Dependency notes

- `patches/@nkzw__remdx@0.8.0.patch` is **stale**: the dependency is at `0.17.0` and `package.json` declares no `patchedDependencies`, so the patch is not applied. Do not treat it as active behavior.
- Bun is the package manager (`bun.lockb`); npm scripts work too. React 19, Vite 6.

## `docs/ai/`

Japanese background notes on git worktree, git bare clone, and an earlier outline of the talk. These are source material for the slides, not documentation of this codebase.
