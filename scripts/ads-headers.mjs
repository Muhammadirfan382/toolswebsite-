// Build step (Astro integration): in "live" ads mode, rewrite dist/_headers so the
// Content-Security-Policy allows Google's ad and consent (Privacy & messaging) scripts.
// In "off" and "placeholder" modes the strict policy from public/_headers is kept unchanged.
//
// ⚠ VERIFY before going live: Google recommends a nonce-based "strict CSP" for its ad code; a
// static site cannot issue nonces, so this is a host allowlist. Check it against Google's
// current guidance (AdSense Help, search "Content Security Policy") and watch the browser
// console for CSP violations on the first day ads are live.
import { readFile, writeFile } from 'node:fs/promises';

const GOOGLE_ADS = [
  'https://pagead2.googlesyndication.com', // AdSense script (adsbygoogle.js)
  'https://*.googlesyndication.com', // ad rendering (tpc.googlesyndication.com, etc.)
  'https://*.doubleclick.net', // ad serving and click tracking
  'https://*.google.com', // adservice.google.com, www.google.com
  'https://*.gstatic.com', // Google static assets
  'https://*.googletagservices.com', // tag services used by ad code
  'https://*.adtrafficquality.google', // invalid-traffic checks (ep1.adtrafficquality.google, etc.)
  'https://fundingchoicesmessages.google.com', // Google Privacy & messaging (consent, a certified CMP)
].join(' ');

export const LIVE_CSP = [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' ${GOOGLE_ADS}`,
  "style-src 'self' 'unsafe-inline' https://*.gstatic.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' data: blob: ${GOOGLE_ADS}`,
  `frame-src ${GOOGLE_ADS}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/** @param {string} mode */
export function adsHeadersIntegration(mode) {
  return {
    name: 'ads-headers',
    hooks: {
      /** @param {{ dir: URL }} opts */
      'astro:build:done': async ({ dir }) => {
        if (mode !== 'live') return;
        const file = new URL('_headers', dir);
        const text = await readFile(file, 'utf8');
        const strict = text.match(/^\s+Content-Security-Policy: (.+)$/m)?.[1];
        if (!strict) throw new Error('ads-headers: no Content-Security-Policy found in _headers');
        const updated =
          text.replace(`Content-Security-Policy: ${strict}`, `Content-Security-Policy: ${LIVE_CSP}`) +
          // Embeds never show ads: detach the ad CSP and restore the strict one there.
          `\n/embed/*\n  ! Content-Security-Policy\n  Content-Security-Policy: ${strict}\n`;
        await writeFile(file, updated);
      },
    },
  };
}
