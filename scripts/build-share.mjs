// Build for a shareable test deployment (a *.pages.dev link for reviewers), written to dist-share/.
// Same output as the production build — clean URLs, real headers — but it must never be indexed or
// mistaken for the launch site, so every page carries noindex, robots.txt disallows everything and
// the sitemap is left out.
// Usage: npm run build:share   → dist-share/
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const args of [['scripts/copy-pdfjs-assets.mjs'], ['node_modules/astro/bin/astro.mjs', 'build']]) {
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const src = fileURLToPath(new URL('../dist/', import.meta.url));
const out = fileURLToPath(new URL('../dist-share/', import.meta.url));
const SKIP = ['sitemap-index.xml', 'sitemap-0.xml', 'ads.txt'];
const slash = (p) => p.split('\\').join('/');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, {
  recursive: true,
  filter: (from) => !SKIP.some((s) => slash(from).endsWith(`/dist/${s}`)),
});

// Search engines: a test link is not the site.
await writeFile(`${out}robots.txt`, 'User-agent: *\nDisallow: /\n');
const headers = await readFile(`${out}_headers`, 'utf8');
await writeFile(
  `${out}_headers`,
  headers.replace(/^\/\*\r?\n/m, '/*\n  X-Robots-Tag: noindex, nofollow\n'),
);

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) yield* htmlFiles(`${dir}${e.name}/`);
    else if (e.name.endsWith('.html')) yield `${dir}${e.name}`;
  }
}

let pages = 0;
for await (const file of htmlFiles(out)) {
  const html = (await readFile(file, 'utf8'))
    .replace(/\s*<link rel="sitemap"[^>]*>/g, '')
    .replace(/<meta charset="utf-8"\s*\/?>/, '$&<meta name="robots" content="noindex, nofollow">');
  await writeFile(file, html);
  pages++;
}
console.log(`dist-share: ${pages} pages, noindex. Deploy with:`);
console.log('  npx wrangler pages deploy dist-share --project-name everyday-tools-preview');
