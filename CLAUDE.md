# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-deck RemdX (React + MDX) presentation: 「Claude Codeによる並列開発のすゝめ」, an LT given at Claude Code Meetup about parallel development with git worktree / git bare clone. Slide content and speaker notes are in Japanese.

Deployed to two places from `main`: **GitHub Pages, served at `naturalclar.dev/slide-claude-code-lt/`, is canonical** — it is what the OGP/Twitter tags in `index.html` point at — published by `.github/workflows/deploy-pages.yml`. Vercel at `claude-code-meetup-lt.vercel.app` still builds and serves the same deck, but is no longer the advertised URL.

`naturalclar.dev` is a custom domain on the owner's *user* Pages site, so every project's Pages moves under it and this repo is reached at `naturalclar.dev/slide-claude-code-lt/`, not at `naturalclar.github.io/...`. The custom domain lives in Pages settings, not in this repo — there is no `CNAME` file here, and the deploy workflow does not need one.

Pages serves from a sub-path, which is why `vite.config.ts` sets `base: './'` — keep asset references relative or they break there while continuing to work on Vercel. The OGP tags are the exception: they must stay **absolute** (`https://naturalclar.dev/slide-claude-code-lt/...`), since crawlers do not resolve relative URLs. Vite leaves `meta content` untouched, so they are not rewritten by `base`.

## Commands

```bash
bun dev         # dev server on :5173 (npm run dev also works)
bun run build   # vite build -> dist/
bun run check:pages  # validate <Note>Page N</Note> markers against slide order
bun run typecheck    # tsc --noEmit
bun run screenshot   # requires `bun dev` running first (see below)
bun run deploy  # vercel --prod
```

CI (`.github/workflows/ci.yml`) runs `check:pages`, `typecheck`, then `build` on pushes to `main` and on every PR. That is the whole safety net — there is no test suite and no linter. Note that `tsc` covers `Components.tsx`, `Themes.tsx` and `vite.config.ts` only: `slides.re.mdx` is typed through `slides.re.mdx.d.ts`, so slide markup itself is never type-checked, and Vite does not typecheck during `build`. Verify visual changes by loading the dev server and paging through the affected slides.

`screenshot` runs `screenshot.mjs`, which drives Playwright against `http://localhost:5173` and writes `public/card.png` — the file the OGP/Twitter `og:image` URL points at, served as `naturalclar.dev/slide-claude-code-lt/card.png`. It exits with a clear message if nothing is serving `:5173`. Regenerate only on a machine with Japanese fonts installed: without them the `ゝ` in the title renders blank and the card silently degrades.

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
- Page markers run `1`–`46` in slide order, one per slide. When adding, removing, or reordering slides, renumber every `<Note>Page N</Note>` from the insertion point onward — `bun run check:pages` enforces this in CI and reports offenders as `file:line`.
- Images live in `public/` and **must be referenced as `./name.png`, never `/name.png`**. These are runtime JSX strings that Vite does not rewrite, so a root-absolute path resolves against the host root and 404s under the GitHub Pages project sub-path. It still works on Vercel, so this breaks on one deploy target only.

### Layout constraints (`styles.css`)

`styles.css` is the fragile part of this repo. It overrides RemdX's own inline styles via `!important` and attribute selectors such as `div[style*="transform: scale"]` and `div[style*="position: relative"][style*="z-index: 0"]`. Consequences:

- RemdX's automatic slide **scaling transform is disabled**. Content does not shrink to fit — a slide that overflows the fixed white card (`calc(100vh - 3rem)`, `overflow: hidden`) is silently clipped. This is why `Components.tsx` sizes things in `vh`/fixed px and why images are given explicit `width`/`height`.
- The page paints a pink→yellow gradient background with a white card on top, forced globally. `Themes.tsx` only swaps the `--background-color`/`--text-color` CSS vars, so the `dark` theme is largely neutralized by these overrides.
- Any `@nkzw/remdx` upgrade can change the emitted inline styles and break these selectors. Check every slide visually after bumping it. The 0.17 → 20 bump was checked this way and the selectors survived it, but that is luck, not a guarantee.

## Dependency notes

- Bun is the package manager (`bun.lockb`); npm scripts work too. React 19, Vite 8, `@nkzw/remdx` 20.
- Keep `@nkzw/remdx` and `@nkzw/vite-plugin-remdx` on the **same version**. They are released in lockstep, and the plugin was previously ranged as `"*"`, which silently resolved it to a different major than the runtime.
- The plugin owns Shiki, so bumping it changes code rendering: on remdx 20 (Shiki 4) fenced code blocks are syntax-highlighted in colour, where remdx 0.17 (Shiki 0.10) rendered them monochrome.

## `docs/ai/`

Japanese background notes on git worktree, git bare clone, and an earlier outline of the talk. These are source material for the slides, not documentation of this codebase.
