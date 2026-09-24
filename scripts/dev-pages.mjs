// /dev/* pages are internal previews (component gallery, ad placements). They are useful while
// working and are already noindex and out of the sitemap, but there is no reason to publish them,
// so they are dropped from the build output. Keep them with SHOW_DEV=1.
import { rm } from 'node:fs/promises';

export function dropDevPagesIntegration() {
  return {
    name: 'drop-dev-pages',
    hooks: {
      /** @param {{ dir: URL, logger: { info: (m: string) => void } }} ctx */
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.SHOW_DEV === '1') {
          logger.info('SHOW_DEV=1: keeping /dev pages in the build.');
          return;
        }
        await rm(new URL('./dev/', dir), { recursive: true, force: true });
        logger.info('Removed /dev preview pages from the build (SHOW_DEV=1 keeps them).');
      },
    },
  };
}
