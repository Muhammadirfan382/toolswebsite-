import type { APIRoute } from 'astro';
import { SITE } from '../../data/site';
import { getPublishedGuides, guidePath } from '../../lib/guides';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0 feed of published guides only (never drafts, even in preview builds). */
export const GET: APIRoute = async ({ site }) => {
  const guides = await getPublishedGuides();
  const items = guides
    .map((g) => {
      const url = new URL(guidePath(g), site).href;
      return `    <item>
      <title>${esc(g.data.h1 ?? g.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(g.data.description)}</description>
      <pubDate>${g.data.publishedAt.toUTCString()}</pubDate>
      <category>${esc(g.data.category)}</category>
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${SITE.brand} guides`)}</title>
    <link>${new URL('/guides', site).href}</link>
    <atom:link href="${new URL('/guides/rss.xml', site).href}" rel="self" type="application/rss+xml" />
    <description>Practical guides for PDFs, images, QR codes and writing, tested with our free browser tools.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
