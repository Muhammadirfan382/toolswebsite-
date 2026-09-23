import type { APIRoute } from 'astro';
import { ADSENSE_PUB_ID, PUB_ID_VALID } from '../data/ads';

/**
 * /ads.txt, generated from src/data/ads.ts. "f08c47fec0942fa0" is Google's certification
 * authority ID, the value AdSense itself shows in its ads.txt snippet (AdSense → Sites → ads.txt).
 * ⚠ VERIFY: compare this line with the snippet AdSense gives you before going live.
 */
export const GET: APIRoute = () => {
  const body = PUB_ID_VALID
    ? `google.com, ${ADSENSE_PUB_ID.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
    : '# No ad network yet. Set ADSENSE_PUB_ID in src/data/ads.ts after AdSense approval.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
