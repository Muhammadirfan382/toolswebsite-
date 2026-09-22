# Project: {{BRAND}} — free everyday online tools

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
- `npm run test`: Playwright tests

## Project notes
- Placeholders `{{BRAND}}`, `{{EMAIL}}` and the domain live in ONE place: `src/data/site.ts`.
  (The domain is `example.com` until replaced, because `{{DOMAIN}}` is not a valid URL.)
- Windows path contains "&": npm scripts call `node node_modules/astro/bin/astro.mjs`
  directly instead of `.bin` shims. Keep it that way.
- `build.format: 'file'` + `trailingSlash: 'never'` so `/about` is served from `about.html`
  on Cloudflare Pages without a trailing-slash redirect.
