// Sätteri hast plugin (Astro 7's Markdown pipeline): inserts in-article ad slots into tool and
// guide Markdown (Phase 4). Each slot goes right before the first H2 at or after the configured
// fraction of the article, so an ad never splits a paragraph, list or table.
// Registered in astro.config.mjs only when ads are not "off".
// The markup mirrors src/components/AdSlot.astro.
import { fileURLToPath } from 'node:url';
import { ADS_MODE, ADSENSE_PUB_ID, IN_CONTENT, PLACEMENTS } from '../src/data/ads.ts';

function slotNode(page, slot) {
  const c = PLACEMENTS[page]?.[slot];
  if (!c?.enabled) return null;
  const live = ADS_MODE === 'live';
  return {
    type: 'element',
    tagName: 'aside',
    properties: {
      className: ['ad-slot'],
      'data-ad-slot': slot,
      'data-ad-page': page,
      'data-ad-mode': ADS_MODE,
      'aria-label': 'Advertisement',
      style: `--ad-h-m:${c.height.mobile}px;--ad-h-d:${c.height.desktop}px`,
    },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['ad-label'] },
        children: [{ type: 'text', value: 'Advertisement' }],
      },
      live
        ? {
            type: 'element',
            tagName: 'ins',
            properties: {
              className: ['adsbygoogle'],
              'data-ad-client': ADSENSE_PUB_ID,
              'data-ad-slot': c.adUnit,
              'data-ad-format': 'auto',
              'data-full-width-responsive': 'true',
            },
            children: [],
          }
        : {
            type: 'element',
            tagName: 'span',
            properties: { className: ['ad-placeholder'] },
            children: [
              {
                type: 'text',
                value: `${slot} · reserved ${c.height.mobile}px phone / ${c.height.desktop}px desktop`,
              },
            ],
          },
    ],
  };
}

export default function adSlotsPlugin() {
  return {
    name: 'ad-slots',
    before(root, ctx) {
      const path = ctx.fileURL ? fileURLToPath(ctx.fileURL).split('\\').join('/') : '';
      const page = path.includes('/content/guides/') ? 'guide' : path.includes('/content/tools/') ? 'tool' : null;
      if (!page) return;
      const elements = root.children.filter((n) => n.type === 'element');
      if (elements.length < 6) return; // too short for an in-article ad
      let lastUsed = -1;
      for (const { slot, at } of IN_CONTENT[page]) {
        const target = elements.findIndex(
          (n, i) => i >= Math.floor(elements.length * at) && i > lastUsed && n.tagName === 'h2',
        );
        if (target < 0) continue;
        const node = slotNode(page, slot);
        if (!node) continue;
        lastUsed = target;
        ctx.insertBefore(elements[target], node);
      }
    },
  };
}
