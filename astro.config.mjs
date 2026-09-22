// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { SITE } from './src/data/site.ts';

// Draft guides must never reach the sitemap, even in a SHOW_DRAFTS preview build.
const guideDir = new URL('./src/content/guides/', import.meta.url);
const guideMeta = (() => {
  try {
    return readdirSync(guideDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => readFileSync(new URL(f, guideDir), 'utf8'))
      .map((text) => ({
        slug: text.match(/^slug:\s*['"]?([a-z0-9-]+)/m)?.[1],
        category: text.match(/^category:\s*['"]?([a-z]+)/m)?.[1],
        draft: !/^draft:\s*false\s*$/m.test(text),
      }));
  } catch {
    return [];
  }
})();
const draftGuidePaths = new Set(guideMeta.filter((g) => g.draft).map((g) => `/guides/${g.slug}`));
const publishedCategories = new Set(guideMeta.filter((g) => !g.draft).map((g) => g.category));
/** @param {string} path */
const isDraftOnlyPage = (path) => {
  if (draftGuidePaths.has(path)) return true;
  if (path === '/guides') return publishedCategories.size === 0;
  const cat = path.match(/^\/guides\/([a-z]+)$/)?.[1];
  return Boolean(cat && guideMeta.some((g) => g.category === cat) && !publishedCategories.has(cat));
};

export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'never',
  build: {
    // about.html instead of about/index.html, so /about needs no trailing-slash redirect.
    format: 'file',
  },
  vite: {
    build: {
      // Never inline scripts into HTML, so the Content-Security-Policy can be script-src 'self'.
      assetsInlineLimit: 0,
    },
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/dev/') &&
        !/\/404(\.html)?$/.test(page) &&
        !isDraftOnlyPage(new URL(page).pathname.replace(/\/$/, '')),
    }),
  ],
});
