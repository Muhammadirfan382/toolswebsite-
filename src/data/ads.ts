/**
 * Ads configuration (Phase 4). The owner edits this file.
 *
 * Modes:
 *   off         nothing ad-related is rendered or loaded (default)
 *   placeholder reserved, labelled grey boxes and no scripts: for reviewing layout and speed
 *   live        real AdSense units; only when ADS_ENABLED is true AND a real publisher id is set
 *
 * A build can force a mode for testing:  ADS_MODE=placeholder npm run build
 * Rules (CLAUDE.md Phase 4): never in or above the tool, never between upload and result, never
 * on /embed, /dev, legal or error pages, never loading while a file is processing.
 */

/** Turn on only after AdSense approval (and after the consent message is set up in AdSense). */
export const ADS_ENABLED = false;

/** "ca-pub-" followed by 16 digits, from AdSense → Account → Account information. */
export const ADSENSE_PUB_ID = '{{ADSENSE_PUB_ID}}'; // TODO: {{ADSENSE_PUB_ID}}

export const PUB_ID_VALID = /^ca-pub-\d{16}$/.test(ADSENSE_PUB_ID);

export type AdsMode = 'off' | 'placeholder' | 'live';

function resolveMode(): AdsMode {
  const forced = typeof process !== 'undefined' ? process.env.ADS_MODE : undefined;
  if (forced === 'off' || forced === 'placeholder') return forced;
  if (forced === 'live' || ADS_ENABLED) return PUB_ID_VALID ? 'live' : 'placeholder';
  return 'off';
}

/** Resolved at build time. */
export const ADS_MODE: AdsMode = resolveMode();

export type PageType = 'tool' | 'guide' | 'hub' | 'home';

export interface SlotConfig {
  /** Reserved height in px on phones (< 768px) and on larger screens. The ad never exceeds it. */
  height: { mobile: number; desktop: number };
  /** AdSense ad unit id ("data-ad-slot") created in AdSense → Ads → By ad unit. */
  adUnit: string;
  enabled: boolean;
  /** Tool pages with a result box: show the slot only once a result exists. */
  afterResult?: boolean;
  /** Only render at this minimum viewport width (px). */
  minWidth?: number;
}

/**
 * Placement map. Heights are our reservations (common responsive unit sizes), not official
 * requirements; change them after reviewing /dev/ads-preview.
 */
export const PLACEMENTS: Record<PageType, Record<string, SlotConfig>> = {
  tool: {
    'after-result': { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true, afterResult: true },
    'below-howto': { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
    'in-content-1': { height: { mobile: 280, desktop: 280 }, adUnit: '', enabled: true },
    'sidebar-desktop': { height: { mobile: 0, desktop: 600 }, adUnit: '', enabled: true, minWidth: 1200 },
    'footer-anchor': { height: { mobile: 60, desktop: 90 }, adUnit: '', enabled: false },
  },
  guide: {
    'after-intro-answer': { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
    'in-content-1': { height: { mobile: 280, desktop: 280 }, adUnit: '', enabled: true },
    'in-content-2': { height: { mobile: 280, desktop: 280 }, adUnit: '', enabled: true },
    end: { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
  },
  hub: {
    'after-grid': { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
    end: { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
  },
  home: {
    'after-grid': { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
    end: { height: { mobile: 280, desktop: 250 }, adUnit: '', enabled: true },
  },
};

export function slotConfig(page: PageType, slot: string): SlotConfig | null {
  const c = PLACEMENTS[page]?.[slot];
  return ADS_MODE !== 'off' && c?.enabled ? c : null;
}

/**
 * In-article slots inserted by the rehype plugin (scripts/rehype-ad-slots.mjs), as a fraction of
 * the article: before the first H2 at or after that point.
 */
export const IN_CONTENT: Record<'tool' | 'guide', { slot: string; at: number }[]> = {
  tool: [{ slot: 'in-content-1', at: 0.4 }],
  guide: [
    { slot: 'in-content-1', at: 0.33 },
    { slot: 'in-content-2', at: 0.66 },
  ],
};
