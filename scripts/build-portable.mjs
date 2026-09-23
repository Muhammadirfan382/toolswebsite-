// Makes dist/ portable so it can be hosted under any path (for example a shared preview link):
// links become relative, and the pdf.js character maps (only needed for Chinese/Japanese/Korean
// PDFs, 169 files) are left out to stay within file-count limits.
// Usage: npm run build:portable   → dist-portable/
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Build first, with hashed assets in /assets (hosts such as the artifact service reserve "_" paths).
const root = fileURLToPath(new URL('../', import.meta.url));
for (const args of [['scripts/copy-pdfjs-assets.mjs'], ['node_modules/astro/bin/astro.mjs', 'build']]) {
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ASSETS_DIR: 'assets' } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const src = fileURLToPath(new URL('../dist/', import.meta.url));
const out = fileURLToPath(new URL('../dist-portable/', import.meta.url));
const SKIP = ['pdfjs/cmaps', '_headers', '_redirects', 'sitemap-index.xml', 'sitemap-0.xml', 'robots.txt', 'ads.txt'];
const slash = (p) => p.split('\\').join('/');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, {
  recursive: true,
  filter: (from) => !SKIP.some((s) => slash(from).includes(`/dist/${s}`)),
});

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) yield* htmlFiles(`${dir}${e.name}/`);
    else if (e.name.endsWith('.html')) yield `${dir}${e.name}`;
  }
}

// Some hosts reserve names starting with "_": rename those files and fix every reference.
const renames = new Map();
for (const dir of ['assets']) {
  let entries = [];
  try {
    entries = await readdir(out + dir);
  } catch {
    continue;
  }
  for (const name of entries) {
    if (!name.startsWith('_')) continue;
    const renamed = `u${name}`;
    await cp(`${out}${dir}/${name}`, `${out}${dir}/${renamed}`);
    await rm(`${out}${dir}/${name}`);
    renames.set(`${dir}/${name}`, `${dir}/${renamed}`);
  }
}

async function* textFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) yield* textFiles(`${dir}${e.name}/`);
    else if (/\.(html|css|js|mjs)$/.test(e.name)) yield `${dir}${e.name}`;
  }
}
if (renames.size) {
  for await (const file of textFiles(out)) {
    let text = await readFile(file, 'utf8');
    let changed = false;
    for (const [from, to] of renames) {
      const base = from.split('/').pop();
      if (text.includes(base)) {
        text = text.split(base).join(to.split('/').pop());
        changed = true;
      }
    }
    if (changed) await writeFile(file, text);
  }
  console.log(`renamed ${renames.size} file(s) starting with "_".`);
}

// Clean URLs need host-side rewriting, so a portable copy links to the real .html file names instead.
const pageSet = new Set();
for await (const file of htmlFiles(out)) pageSet.add(slash(file.slice(out.length)).replace(/\.html$/, ''));

let pages = 0;
for await (const file of htmlFiles(out)) {
  const depth = slash(file.slice(out.length)).split('/').length - 1; // 0 for pages at the root
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  const pageFile = (path) => {
    const suffix = (path.match(/[#?].*$/) ?? [''])[0];
    const clean = path.slice(0, path.length - suffix.length).replace(/\/$/, '') || 'index';
    return pageSet.has(clean) ? `${clean}.html${suffix}` : path;
  };
  const html = (await readFile(file, 'utf8'))
    // Root-absolute references become relative to this page.
    .replace(/(href|src)="\/(?!\/)([^"]*)"/g, (_, attr, path) => `${attr}="${prefix}${pageFile(path)}"`)
    .replace('<meta name="asset-base" content="/"', `<meta name="asset-base" content="${prefix || './'}"`)
    // A shared test copy must not claim to be the real site, and must not be indexed.
    .replace(/\s*<link rel="(canonical|alternate|sitemap)"[^>]*>/g, '')
    .replace(/<meta charset="utf-8"\s*\/?>/, '$&<meta name="robots" content="noindex, nofollow">');
  await writeFile(file, html);
  pages++;
}
console.log(`dist-portable: ${pages} pages rewritten.`);
