# TrueFileTools

[![CI](https://github.com/Muhammadirfan382/toolswebsite-/actions/workflows/ci.yml/badge.svg)](https://github.com/Muhammadirfan382/toolswebsite-/actions/workflows/ci.yml)

Sixteen everyday file and calculator tools that run **entirely in the visitor's browser**. Nothing is
uploaded: a picked file is read by JavaScript in the page, processed on the device, and offered back
as a download. There is no backend, no account, no watermark and no file-size quota beyond what the
device can hold in memory.

**Test preview:** <https://muhammadirfan382.github.io/toolswebsite-/> — a `noindex` copy for feedback.
The production site will be <https://truefiletools.com> (see [DEPLOY.md](DEPLOY.md)).

## The tools

| PDF | Images | Calculators | Text & QR |
| --- | --- | --- | --- |
| Merge PDF | Compress Image | Age Calculator | QR Code Generator |
| Compress PDF | Resize Image | Percentage Calculator | Word Counter |
| JPG to PDF | JPG to PNG | GPA Calculator | Character Counter |
| PDF to JPG | PNG to JPG | CGPA Calculator | |
| | | BMI Calculator | |

## How the privacy claim is kept honest

- No `fetch`/`XHR` sends file contents anywhere; the end-to-end tests assert that the only network
  requests a tool makes are same-origin `GET`s for its own static assets, with no request bodies.
- Heavy libraries (pdf-lib, pdf.js, JSZip) are loaded with dynamic `import()` only after the visitor
  picks a file, so a page that is merely visited downloads none of them.
- Everything a tool needs is served from this origin — the Content-Security-Policy in
  [`public/_headers`](public/_headers) is `default-src 'self'` with no third-party hosts.
- Once a page has loaded, the tools keep working offline. The one exception is documented: the PDF
  and ZIP engines are fetched at the moment a file is picked.

## Stack

Astro (static output, no client framework), TypeScript in strict mode, one global stylesheet with
design tokens. Work happens in Web Workers where it helps, each with a main-thread fallback. Target
host is Cloudflare Pages, which applies `public/_headers` and `public/_redirects`.

```
src/
  pages/        one .astro file per route
  components/   shared UI (file drop, result box, progress, tabs)
  layouts/      Base / Page / Tool / Category layouts
  lib/          the actual tool logic: image/, pdf/, calc/, qr/, text-stats.ts …
  data/         tools, presets, limits, ads settings, site settings
  content/      per-tool copy and guide drafts (content collections)
scripts/        build, audit and preview helpers
tests/          unit tests (Vitest) and browser tests (Playwright)
```

Every official figure a tool quotes — passport photo sizes, SMS character limits, social image
dimensions — lives in `src/data/presets.ts` or `src/data/limits.ts` with a `source` field, never
hard-coded in a component. Entries whose sizes are not confirmed stay hidden from the UI.

## Running it

Node 22.12 or newer.

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run build` | Static build into `dist/` |
| `npm run verify` | Type check, unit tests, build, SEO audit, bundle budget, browser tests |
| `npm run test:unit` | Vitest only |
| `npm run test:e2e` | Playwright only (builds first with `npm test`) |
| `npm run audit` | Titles, descriptions, links, sitemap, structured data |
| `npm run check:bundles` | Fails if a page's initial load exceeds the budget |
| `npm run serve:lan` | Serve `dist/` to your network for phone testing |
| `npm run build:share` | `dist-share/`: production output, `noindex`, for a preview deploy |
| `npm run build:portable` | `dist-portable/`: relative links, works under any sub-path |

`npm run verify` is what CI runs on every push; keep it green.

## Deploying

[DEPLOY.md](DEPLOY.md) covers the preview options and the full Cloudflare Pages setup: custom domain
and www redirect, Search Console, Bing, and the post-launch checks. The GitHub Pages preview above is
published by [`.github/workflows/preview.yml`](.github/workflows/preview.yml) on every push to
`master`.

## Status

Phase 1 (the 16 tools, SEO, tests, performance) is complete. The guides system and the ad layer are
scaffolded but inactive — ads are off by default and emit no markup. Still to do before launch, all
tracked in [AUDIT.md](AUDIT.md): register the domain, replace `public/og-default.png` with a designed
share card, fill the `[TODO]` wording in About / Privacy / Terms, set a real author name for guide
bylines, and confirm the ⚠ VERIFY figures against their official sources.
