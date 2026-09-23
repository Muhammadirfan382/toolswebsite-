/**
 * Site-wide settings. Every launch placeholder lives here so it can be replaced in one edit.
 * TODO before deploy: set `author` to a real person's name (Phase 3 rule 6).
 */
const DOMAIN = 'truefiletools.com'; // bare hostname, no protocol or slash

export const SITE = {
  brand: 'TrueFileTools',
  domain: DOMAIN,
  url: `https://${DOMAIN}`,
  email: `contact@${DOMAIN}`,
  /** Real person shown as the author of guides (Phase 3 rule 6). */
  author: '{{AUTHOR_NAME}}', // TODO: {{AUTHOR_NAME}}
  privacyLine: 'Files are processed in your browser and never uploaded.',
  defaultOgImage: '/og-default.png',
  themeColorLight: '#1D6B52',
  themeColorDark: '#0F1A16',
} as const;

// Ads settings live in src/data/ads.ts (Phase 4).
