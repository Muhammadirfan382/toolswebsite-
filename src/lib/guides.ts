/**
 * Guide helpers. Drafts are visible only in `npm run dev` or a preview build with SHOW_DRAFTS=1;
 * production builds never contain them (Phase 3 rule 1).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { READING_WPM } from '../data/limits';

export type Guide = CollectionEntry<'guides'>;

export const SHOW_DRAFTS = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

let cache: Promise<Guide[]> | null = null;

/** Guides that should be built: published ones, plus drafts in dev/preview builds. Newest first. */
export function getVisibleGuides(): Promise<Guide[]> {
  return (cache ??= getCollection('guides', (g) => SHOW_DRAFTS || !g.data.draft).then(async (list) => {
    await checkCannibalization(list);
    return list.sort((a, b) => b.data.updatedAt.getTime() - a.data.updatedAt.getTime());
  }));
}

/** Published guides only (for RSS, sitemaps and the header link). */
export async function getPublishedGuides(): Promise<Guide[]> {
  return (await getVisibleGuides()).filter((g) => !g.data.draft);
}

export const guidePath = (g: Guide) => `/guides/${g.data.slug}`;

export function readingMinutes(g: Guide): number {
  const words = (g.body ?? '').replace(/<!--[\s\S]*?-->/g, '').match(/[\p{L}\p{N}'’-]+/gu)?.length ?? 0;
  return Math.max(1, Math.round(words / READING_WPM));
}

export function formatDate(d: Date, locale = 'en-US'): string {
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Guides related to this one: same related tools first, then same category. */
export function relatedGuides(current: Guide, all: Guide[], limit = 4): Guide[] {
  const score = (g: Guide) =>
    g.data.relatedTools.filter((t) => current.data.relatedTools.includes(t)).length * 2 +
    (g.data.category === current.data.category ? 1 : 0);
  return all
    .filter((g) => g.id !== current.id)
    .map((g) => ({ g, s: score(g) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.g);
}

/** Phase 3 rule 4: a guide must not target a tool page's primary keyword. Fails the build if it does. */
async function checkCannibalization(guides: Guide[]): Promise<void> {
  const tools = await getCollection('tools');
  const owned = new Map(tools.map((t) => [t.data.primaryKeyword.trim().toLowerCase(), t.id]));
  for (const g of guides) {
    const tool = owned.get(g.data.primaryKeyword.trim().toLowerCase());
    if (tool) {
      throw new Error(
        `Guide "${g.data.slug}" targets "${g.data.primaryKeyword}", which is the primary keyword of /${tool}. ` +
          'Target a how-to / why / what / vs question instead and link to the tool.',
      );
    }
  }
}
