# Project: TrueFileTools — free everyday online tools

## What this is
A static website of free tools (PDF, image, calculators, QR, text). Every tool runs 100% in the
user's browser. Files are never uploaded to any server. This privacy promise is a core selling point
and must stay true in code.

## Stack (do not change without asking)
- Astro (latest stable), static output (`output: 'static'`), TypeScript strict.
- No React/Vue. Tool logic = plain TypeScript in `<script>` tags or modules under `src/lib/`.
- Styling: one global CSS file with design tokens (CSS custom properties) + small scoped styles.
  No CSS framework.
- Libraries allowed: pdf-lib, pdfjs-dist, browser-image-compression, qrcode, jszip,
  @astrojs/sitemap. Ask before adding anything else.
- Heavy libraries (pdf-lib, pdfjs-dist, jszip) must be loaded with dynamic `import()` only
  when the user picks a file, never on page load.
- Hosting target: Cloudflare Pages (static `dist/`).

## Hard rules
1. No server uploads, no analytics that send file data, no third-party scripts except those
   listed in the Phase 1 plan.
2. Never invent facts: no made-up statistics, user counts, ratings, reviews, testimonials,
   awards or "trusted by X users". No AggregateRating/Review schema.
3. Any official size or rule (ID/passport photo specs, exam photo specs, university CGPA
   formulas, platform character limits) lives in `src/data/presets.ts` or `src/data/limits.ts`
   with a `verify: true` flag and a `source: ''` field. Never hard-code these in components.
4. Every tool page uses the shared `ToolLayout` and must include: unique <title> (≤60 chars),
   meta description (≤155 chars), one H1, canonical URL, Open Graph tags, HowTo + FAQPage +
   BreadcrumbList + SoftwareApplication JSON-LD (no rating fields), 600–1000 words of
   helpful content below the tool, and 4–6 related-tool links.
5. Mobile first. Must work at 360px width. Tap targets ≥ 44px.
6. Performance budget per tool page: HTML+CSS+initial JS < 100 KB gzipped;
   Lighthouse mobile Performance ≥ 90, SEO = 100, Accessibility ≥ 95.
7. Accessibility: labels on every input, visible focus, keyboard-operable drag-and-drop
   alternative (a normal file button), aria-live region for results/errors.
8. Errors are specific and helpful ("This file is password-protected. Unlock it first."),
   never generic.
9. British/American English consistent: use American English.
10. Keep URLs exactly as specified (lowercase, hyphens, no trailing slash in links).

## Commands
- `npm run dev`: local dev
- `npm run build`: production build to dist/
- `npm run test`: build, then Playwright tests (local Edge; CI installs Chromium)
- `npm run test:unit`: Vitest unit tests
- `npm run audit`: SEO / link / accessibility audit of dist/
- `npm run check:bundles`: initial-load budget and lazy-library check
- `npm run verify`: everything above plus the type check (run before every deploy)
- `npm run build:preview`: build that includes draft guides (DRAFT banner, noindex, not in
  sitemap/RSS). For local review only; never deploy it. `npm run dev` also shows drafts.
- `npm run shots -- <tool-slug>`: screenshots of our tool (mobile + desktop, WebP) into
  src/assets/guides/<slug>/ for guide articles. Run `npm run build` first.
- Ads (Phase 4) are off by default. `ADS_MODE=placeholder npm run build` shows reserved grey
  boxes for layout review; live needs ADS_ENABLED plus a real publisher id in src/data/ads.ts.
  Review placements at /dev/ads-preview.
- Deployment steps: DEPLOY.md. Audit results and the VERIFY list: AUDIT.md.

## Project notes
- Brand (`TrueFileTools`), domain (`truefiletools.com`) and contact address live in ONE place:
  `src/data/site.ts`. Never hard-code them anywhere else. `author` there is still a placeholder.
- Windows path contains "&": npm scripts call `node node_modules/astro/bin/astro.mjs`
  directly instead of `.bin` shims. Keep it that way.
- `build.format: 'file'` + `trailingSlash: 'never'` so `/about` is served from `about.html`
  on Cloudflare Pages without a trailing-slash redirect.

## Phase 3 rules
1. Content workflow: every article and every translated page is created with
   draft: true. Only the owner changes it to false after review. Never publish drafts.
2. Every article must add something a generic article doesn't: steps tested on our own
   tools with real screenshots (captured by Playwright from our site), exact settings that
   work, and honest limitations. No filler intros, no "In today's digital world".
3. No invented facts, numbers, studies, quotes, dates, or product features. Any claim about
   other software (Windows, macOS, iOS, Android, Word, Google Docs, Canva, Photoshop,
   iLovePDF, Smallpdf, PDF24, Adobe) must be marked <!-- VERIFY: ... --> so the owner can
   check it against the current version before publishing. Menus and feature names change often.
4. Keyword cannibalization: a guide must not target the same primary keyword as a tool page.
   Guides target "how to / why / what / vs" questions and link to the tool as the solution.
5. Translations: never machine-translate and publish. Translated pages are drafts with a
   review sheet for a native speaker. Localized keywords come from docs/keywords-<lang>.csv
   (provided by the owner from Keyword Planner); if that file doesn't exist, stop and ask.
6. Author and trust: articles show a real author ({{AUTHOR_NAME}}), published and updated
   dates, and a "How we tested" note. No fake author personas.
7. Comparison pages: factual, neutral tone, dated ("Checked on <date>"), no disparaging
   claims, no competitor logos. Every competitor fact carries a VERIFY marker until the
   owner checks it.

## Phase 4 rules
1. Ads never cover, push down or sit inside the tool area, upload button or download
   button. No ads between "upload" and "result". No ads on /embed/*, /dev/*, legal pages,
   error states, or while a file is processing.
2. Every ad slot reserves its height in CSS before the ad loads (CLS must stay < 0.1).
   Ad scripts load after the tool is interactive (after first user interaction or idle).
3. Lighthouse mobile targets from earlier phases still apply WITH ads on. If a placement
   breaks them, the placement is removed, not the target.
4. Consent: ad scripts must not set cookies or load personalized ads for EEA/UK/CH
   visitors before consent via a Google-certified CMP. Never build our own consent banner
   for ads.
5. Server tools are clearly labelled on the page and in the UI BEFORE upload:
   "This tool uploads your file to our server to convert it. Files are deleted after
   <N> minutes." (N set by the owner in src/data/site.ts). Browser-only tools keep their
   "never leaves your device" badge; never show that badge on a server tool.
6. Secrets (API keys, webhook secrets) live only in server environment variables. Never
   in client code, never committed. A pre-commit check blocks accidental keys.
7. No dark patterns: no fake countdowns, no fake "X people bought", no pre-checked
   upsells, cancel as easy as subscribe. Free tools stay free; Pro adds convenience.
8. Affiliate links use rel="sponsored noopener" and every page with one shows a short
   disclosure line linking to /affiliate-disclosure.
9. All prices, limits, file-retention times and credit amounts come from
   src/data/plans.ts, which the owner edits. Never hard-code or invent them.
