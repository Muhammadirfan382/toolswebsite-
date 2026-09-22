// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/data/site.ts';

export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'never',
  build: {
    // about.html instead of about/index.html, so /about needs no trailing-slash redirect.
    format: 'file',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/dev/') && !/\/404(\.html)?$/.test(page),
    }),
  ],
});
