// Static SEO / link / accessibility audit of the built site (dist/).
// Run after `npm run build`:  node scripts/audit-dist.mjs   (exits 1 if anything fails)
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const site = (await readFile(new URL('../src/data/site.ts', import.meta.url), 'utf8')).match(/DOMAIN = '([^']+)'/)[1];
const origin = `https://${site}`;
const { TOOLS, CATEGORIES } = await import('../src/data/tools.ts');

const problems = [];
const fail = (page, msg) => problems.push(`${page}: ${msg}`);

async function walk(dir, prefix = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === '_astro' || e.name === 'pdfjs') continue;
      out.push(...(await walk(`${dir}${e.name}/`, `${prefix}${e.name}/`)));
    } else if (e.name.endsWith('.html')) out.push(`${prefix}${e.name}`);
  }
  return out;
}

const files = await walk(dist);
const pathOf = (f) => (f === 'index.html' ? '/' : `/${f.replace(/\.html$/, '')}`);
const pages = new Map();
for (const f of files) pages.set(pathOf(f), await readFile(`${dist}${f}`, 'utf8'));
const exists = (p) => pages.has(p) || /\.(png|svg|xml|txt|ico)$/.test(p);

const titles = new Map();
const descriptions = new Map();
const linkedFrom = new Map(); // path -> Set of pages linking to it

for (const [path, html] of pages) {
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const get = (re) => (html.match(re) ?? [])[1];
  const title = get(/<title>([^<]*)<\/title>/)?.replace(/&amp;/g, '&');
  const desc = get(/<meta name="description" content="([^"]*)"/)?.replace(/&amp;/g, '&');
  if (!title) fail(path, 'missing <title>');
  if (!desc) fail(path, 'missing meta description');
  if (!noindex) {
    if (title && title.length > 60) fail(path, `title is ${title.length} chars (> 60)`);
    if (desc && desc.length > 155) fail(path, `description is ${desc.length} chars (> 155)`);
    if (titles.has(title)) fail(path, `duplicate title with ${titles.get(title)}`);
    if (descriptions.has(desc)) fail(path, `duplicate description with ${descriptions.get(desc)}`);
    titles.set(title, path);
    descriptions.set(desc, path);

    const canonical = get(/<link rel="canonical" href="([^"]+)"/);
    const expected = path === '/' ? `${origin}/` : `${origin}${path}`;
    if (canonical !== expected) fail(path, `canonical ${canonical} should be ${expected}`);
    for (const lang of ['en', 'x-default']) {
      if (!html.includes(`hreflang="${lang}" href="${expected}"`)) fail(path, `missing hreflang ${lang}`);
    }
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
      if (!html.includes(`property="${prop}"`)) fail(path, `missing ${prop}`);
    }
    if (!html.includes('name="twitter:card"')) fail(path, 'missing twitter:card');
  }
  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1s !== 1) fail(path, `${h1s} <h1> elements (expected 1)`);
  if (!/<html lang="en"/.test(html)) fail(path, 'missing <html lang="en">');

  // JSON-LD must parse and never contain ratings or reviews.
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try {
      const data = JSON.parse(m[1]);
      if (/"(aggregateRating|ratingValue|review|reviewRating)"/i.test(m[1])) fail(path, 'JSON-LD contains rating/review fields');
      if (data['@type'] === 'BreadcrumbList') {
        const last = data.itemListElement.at(-1).item;
        const expected = path === '/' ? `${origin}/` : `${origin}${path}`;
        if (last !== expected) fail(path, `breadcrumb ends at ${last}, expected ${expected}`);
      }
    } catch (err) {
      fail(path, `invalid JSON-LD: ${err.message}`);
    }
  }

  // Internal links: must exist, no trailing slash, no .html.
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#?]*)(?:[?#][^"]*)?"/g)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (href !== '/' && href.endsWith('/')) fail(path, `link with trailing slash: ${href}`);
    if (href.endsWith('.html')) fail(path, `link to .html: ${href}`);
    if (!exists(href)) fail(path, `broken link: ${href}`);
    if (!linkedFrom.has(href)) linkedFrom.set(href, new Set());
    linkedFrom.get(href).add(path);
  }

  // Images need alt text; inline SVGs must be hidden from screen readers or titled.
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) fail(path, `img without alt: ${m[0].slice(0, 80)}`);
  for (const m of html.matchAll(/<svg\b[^>]*>/g)) {
    if (!/aria-hidden="true"|role="img"/.test(m[0]) && !/<title>/.test(html.slice(m.index, m.index + 300))) {
      fail(path, `svg without aria-hidden or title: ${m[0].slice(0, 80)}`);
    }
  }
}

// Every tool: >= 4 related links, linked from home, its category page and the footer (i.e. every page).
for (const t of TOOLS) {
  const p = `/${t.slug}`;
  const html = pages.get(p);
  if (!html) {
    fail(p, 'tool page missing');
    continue;
  }
  const related = html.match(/<section class="related"[\s\S]*?<\/section>/)?.[0] ?? '';
  const relatedLinks = new Set([...related.matchAll(/href="(\/[^"]+)"/g)].map((m) => m[1]));
  if (relatedLinks.size < 4) fail(p, `only ${relatedLinks.size} related-tool links`);
  const from = linkedFrom.get(p) ?? new Set();
  const cat = CATEGORIES.find((c) => c.id === t.category).path;
  if (!from.has('/')) fail(p, 'not linked from the home page');
  if (!from.has(cat)) fail(p, `not linked from ${cat}`);
  if (!/<footer[\s\S]*href="\/about"/.test(html) || !pages.get('/about').includes(`href="${p}"`)) fail(p, 'not linked from the footer');
  const words = html
    .match(/<article class="prose tool-content"[^>]*>([\s\S]*?)<\/article>/)?.[1]
    .replace(/<[^>]+>/g, ' ')
    .match(/[A-Za-z0-9'’-]+/g)?.length ?? 0;
  if (words < 600) fail(p, `article has ${words} words (< 600)`);
  for (const type of ['BreadcrumbList', 'HowTo', 'FAQPage', 'SoftwareApplication']) {
    if (!html.includes(`"@type":"${type}"`)) fail(p, `missing ${type} JSON-LD`);
  }
}

// Sitemap: every indexable page, nothing under /dev/.
const sitemap = await readFile(`${dist}sitemap-0.xml`, 'utf8');
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
for (const [path, html] of pages) {
  const url = path === '/' ? `${origin}/` : `${origin}${path}`;
  const indexable = !/<meta name="robots" content="noindex/.test(html);
  if (indexable && !locs.has(url)) fail(path, 'missing from sitemap');
  if (!indexable && locs.has(url)) fail(path, 'noindex page is in the sitemap');
}
for (const loc of locs) if (loc.includes('/dev/')) fail(loc, '/dev page in sitemap');

const robots = await readFile(`${dist}robots.txt`, 'utf8');
if (!robots.includes(`Sitemap: ${origin}/sitemap-index.xml`)) fail('/robots.txt', 'sitemap line missing');

console.log(`Audited ${pages.size} pages, ${locs.size} sitemap URLs, ${TOOLS.length} tools.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('No problems found.');
