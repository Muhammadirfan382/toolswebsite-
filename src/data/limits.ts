/**
 * Platform text limits and reading/speaking speed assumptions.
 * Rule (CLAUDE.md #3): every entry carries `verify: true` until checked against `source`.
 * ⚠ VERIFY each limit against the platform's official documentation before launch.
 */

export interface TextLimit {
  id: string;
  label: string;
  max: number;
  /** Short caveat shown under the bar. */
  note?: string;
  verify: boolean;
  source: string;
}

export const TEXT_LIMITS: TextLimit[] = [
  {
    id: 'x-post',
    label: 'X (Twitter) post',
    max: 280,
    note: 'X counts some characters, such as emoji and links, differently, so treat this as a guide.',
    verify: true, // ⚠ VERIFY
    source: '',
  },
  {
    id: 'meta-title',
    label: 'Page title (SEO)',
    max: 60,
    note: 'Search engines cut titles by pixel width, so about 60 characters is a guideline, not a hard limit.',
    verify: true, // ⚠ VERIFY
    source: '',
  },
  {
    id: 'meta-description',
    label: 'Meta description (SEO)',
    max: 155,
    note: 'A common guideline; search engines may show more or less.',
    verify: true, // ⚠ VERIFY
    source: '',
  },
  {
    id: 'instagram-caption',
    label: 'Instagram caption',
    max: 2200,
    verify: true, // ⚠ VERIFY
    source: '',
  },
];

/**
 * SMS segment sizes. A single message holds 160 GSM-7 characters or 70 Unicode (UCS-2)
 * characters; longer messages are split into parts of 153 or 67.
 */
export const SMS_LIMITS = {
  gsm7Single: 160,
  gsm7Multi: 153,
  ucs2Single: 70,
  ucs2Multi: 67,
  verify: true, // ⚠ VERIFY
  source: '',
} as const;

/**
 * Reading and speaking speeds are ASSUMPTIONS (typical adult averages), not facts about the user.
 * The UI always says "based on ~N words per minute".
 */
export const READING_WPM = 200;
export const SPEAKING_WPM = 130;
