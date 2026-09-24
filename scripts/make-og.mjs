// Writes public/og-default.png: the 1200x630 card shown when a link to the site is shared.
// Rendered in a real browser so the brand wordmark and text are properly typeset, then committed
// as a PNG (this script is not part of the build).
// Usage: node scripts/make-og.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { SITE } from '../src/data/site.ts';

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  :root { --green: #1d6b52; --deep: #0f1a16; --mint: #a7d8c4; }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; flex-direction: column; justify-content: center;
    gap: 28px; padding: 84px 96px; background: var(--deep); color: #fff;
    font-family: "Segoe UI", system-ui, sans-serif;
    background-image: radial-gradient(1100px 500px at 88% -12%, rgba(29,107,82,.75), transparent 70%);
  }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 700; letter-spacing: -0.5px; }
  .brand svg { flex: none; }
  h1 { font-size: 76px; line-height: 1.05; font-weight: 800; letter-spacing: -2px; max-width: 16ch; }
  h1 em { color: var(--mint); font-style: normal; }
  .note {
    align-self: flex-start; display: flex; align-items: center; gap: 12px;
    padding: 14px 26px; border: 1px solid rgba(167,216,196,.45); border-radius: 999px;
    background: rgba(167,216,196,.10); color: var(--mint); font-size: 28px; font-weight: 600;
  }
  .row { display: flex; gap: 14px; flex-wrap: wrap; font-size: 24px; color: rgba(255,255,255,.72); }
  .row span { padding: 8px 18px; border-radius: 10px; background: rgba(255,255,255,.07); }
</style>
<div class="brand">
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a7d8c4" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
  ${SITE.brand}
</div>
<h1>Free tools for <em>PDFs, images</em> and everyday math</h1>
<div class="note">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
  Runs in your browser — your files never leave your device
</div>
<div class="row">
  <span>Merge PDF</span><span>Compress PDF</span><span>Compress Image</span><span>Resize Image</span>
  <span>QR Codes</span><span>GPA &amp; BMI</span><span>Word Counter</span>
</div>`;

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`public/og-default.png written (1200x630) for ${SITE.brand}.`);
