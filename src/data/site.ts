/**
 * Site-wide settings. Every launch placeholder lives here so it can be replaced in one edit.
 * TODO before deploy: replace brand, DOMAIN and email with real values.
 */
const DOMAIN = 'example.com'; // TODO: {{DOMAIN}} — bare hostname, no protocol or slash

export const SITE = {
  brand: '{{BRAND}}', // TODO: {{BRAND}}
  domain: DOMAIN,
  url: `https://${DOMAIN}`,
  email: '{{EMAIL}}', // TODO: {{EMAIL}}
  /** Real person shown as the author of guides (Phase 3 rule 6). */
  author: '{{AUTHOR_NAME}}', // TODO: {{AUTHOR_NAME}}
  privacyLine: 'Files are processed in your browser and never uploaded.',
  defaultOgImage: '/og-default.png',
  themeColorLight: '#1D6B52',
  themeColorDark: '#0F1A16',
} as const;

/** Ads are off in Phase 1. When false, <AdSlot> renders nothing at all. */
export const ADS_ENABLED = false;
