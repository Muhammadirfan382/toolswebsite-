# Phase 1 audit

Run everything with `npm run verify` (type check, unit tests, build, SEO audit, bundle budget, Playwright).
Last full run: 2026-09-22, all green.

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript / Astro | `npm run check` | 0 errors, 0 warnings |
| Unit tests (Vitest) | `npm run test:unit` | 80 passed |
| SEO + links + a11y markup | `npm run audit` | 27 pages, 25 sitemap URLs, 16 tools, no problems |
| Initial-load budget | `npm run check:bundles` | all pages ≤ 25.7 KB gzipped (budget 100 KB); no pdf-lib, pdf.js, jszip or qrcode in any initial load |
| End-to-end (Playwright) | `npm run test` | 86 passed (run with the production `_headers`, incl. the CSP) |
| Content table | `python scripts/content-report.py` | every tool: title ≤ 60, description ≤ 155, 600+ words, 6–8 FAQs |

What `npm run audit` checks on every page of `dist/`: unique title and description, lengths, one H1,
`lang="en"`, canonical URL, `hreflang` en + x-default, Open Graph and Twitter tags, JSON-LD parses and has
no rating/review fields, breadcrumbs end at the page URL, no broken internal links, no trailing slashes or
`.html` in links, every `<img>` has alt text, every inline SVG is `aria-hidden` or titled, every tool has
≥ 4 related links and is linked from home, its category page and the footer, 600+ article words and all
four JSON-LD types, sitemap contains every indexable page and nothing under `/dev/`, robots.txt points to
the sitemap.

Playwright covers: every tool at 360 px and 1280 px (no console errors, no sideways scroll, one real task),
the privacy test (every request is a same-origin GET for a static file, none has a body), the offline test
(network switched off before processing; every tool still produces its result, including ZIP download),
plus detailed image and PDF tests with generated fixtures.

## Lighthouse (mobile, production build)

| Page | Perf | A11y | Best practices | SEO | LCP (ms) | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| / | 100 | 100 | 100 | 100 | 1304 | 0 |
| /pdf-tools | 100 | 100 | 100 | 100 | 908 | 0 |
| /image-tools | 99 | 100 | 100 | 100 | 1112 | 0 |
| /calculators | 100 | 100 | 100 | 100 | 907 | 0 |
| /text-tools | 100 | 100 | 100 | 100 | 906 | 0 |
| /merge-pdf | 99 | 100 | 100 | 100 | 1600 | 0 |
| /compress-pdf | 96 | 100 | 100 | 100 | 2286 | 0 |
| /jpg-to-pdf | 100 | 100 | 100 | 100 | 1558 | 0 |
| /pdf-to-jpg | 100 | 100 | 100 | 100 | 1433 | 0 |
| /compress-image | 100 | 100 | 100 | 100 | 1544 | 0 |
| /resize-image | 99 | 100 | 100 | 100 | 1556 | 0 |
| /jpg-to-png | 100 | 100 | 100 | 100 | 1568 | 0 |
| /png-to-jpg | 100 | 100 | 100 | 100 | 1477 | 0 |
| /age-calculator | 100 | 100 | 100 | 100 | 1403 | 0 |
| /percentage-calculator | 100 | 100 | 100 | 100 | 1450 | 0 |
| /cgpa-calculator | 100 | 100 | 100 | 100 | 1409 | 0 |
| /gpa-calculator | 100 | 100 | 100 | 100 | 1426 | 0 |
| /bmi-calculator | 100 | 100 | 100 | 100 | 1407 | 0 |
| /qr-code-generator | 99 | 100 | 100 | 100 | 1590 | 0 |
| /word-counter | 100 | 100 | 100 | 100 | 1443 | 0 |
| /character-counter | 100 | 100 | 100 | 100 | 1358 | 0 |
| /about, /privacy-policy, /terms, /contact | 100 | 100 | 100 | 100 | ~905 | 0 |

Measured locally with Lighthouse 13.5 in headless Microsoft Edge against `scripts/serve-dist.mjs`.
Real-world numbers on Cloudflare will differ slightly; re-check with PageSpeed Insights after launch.

## Offline behavior (important design note)

CLAUDE.md requires pdf-lib, pdf.js and jszip to load only when the user picks a file. So:

- Calculators, word/character counters: work offline as soon as the page has loaded.
- QR generator: its small library is fetched when the page is idle after loading, then works offline.
- Image tools: work offline after loading (the worker has a main-thread fallback).
- PDF tools and "Download all as ZIP": their engines download **when a file is picked**. From then on
  everything works offline. If the connection is lost before a file is picked, the page shows a clear
  "could not load, check your connection" message.

## Ads (Phase 4, not live)

Three modes in `src/data/ads.ts`: `off` (default, no ad markup at all), `placeholder` (reserved
labelled boxes, no scripts) and `live` (needs ADS_ENABLED plus a real `ca-pub-…` id).

Lighthouse mobile, three tool pages, ads off vs placeholder boxes:

| Page | Perf off | Perf placeholder | CLS both |
| --- | --- | --- | --- |
| /merge-pdf | 99 | 99 | 0.000 |
| /compress-image | 99 | 98 | 0.000 |
| /percentage-calculator | 100 | 100 | 0.000 |

Real ad performance can only be measured once AdSense approves the site and serves real units.

## Items to verify before launch (⚠ VERIFY)

Official or platform figures, all in `src/data/presets.ts` / `src/data/limits.ts` with `verify: true` and
an empty `source`:

1. Social image presets: Instagram post 1080×1080, story 1080×1920, YouTube thumbnail 1280×720,
   Facebook cover 820×312, LinkedIn banner 1584×396, X header 1500×500, WhatsApp profile (square).
2. Passport photo 35×45 mm (300 DPI) and US passport/visa 2×2 in (600×600 px).
3. CNIC / NADRA photo, SSC and UPSC photo and signature: **empty and hidden** until you add dimensions,
   max KB and the official source.
4. GPA 4.0 letter scale (A 4.0 … F 0).
5. CGPA-to-percentage formulas: ÷4×100, ÷5×100, ×9.5, (−0.75)×10, ×10 — labeled "used by some",
   not attributed to any university.
6. WHO adult BMI categories (18.5 / 25 / 30).
7. Text limits: X post 280, page title ~60, meta description ~155, Instagram caption 2,200.
8. SMS: 160 / 153 (GSM-7) and 70 / 67 (Unicode).
9. QR print guidance: minimum 2 × 2 cm, distance ≈ 10 × width, contrast warning below 4:1.

Content sentences that depend on these are marked `<!-- VERIFY -->` in `src/content/tools/`
(bmi-calculator, character-counter, qr-code-generator, resize-image ×3).

## Placeholders to fill (TODO)

- `src/data/site.ts`: `author` — a real person for guide bylines (brand, domain and email are set).
- `/about`: who runs the site.
- `/privacy-policy`: last-updated date, hosting provider, operator name/country.
- `/terms`: last-updated date, governing law / country.
- `public/og-default.png`: generated by `node scripts/make-og.mjs` (brand card, 1200×630). Re-run it
  if the brand or tagline changes; replace it with hand-made artwork if you want something richer.
