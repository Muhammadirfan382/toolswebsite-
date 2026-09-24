// Makes dist/ portable so it can be hosted under any path (for example a shared preview link):
// links become relative, and the pdf.js character maps (only needed for Chinese/Japanese/Korean
// PDFs, 169 files) are left out to stay within file-count limits.
// Usage: npm run build:portable   → dist-portable/
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Build first, with hashed assets in /assets (hosts such as the artifact service reserve "_" paths).
const root = fileURLToPath(new URL('../', import.meta.url));
const assetsDir = 'assets'; // hosts such as GitHub Pages and the artifact service reserve "_" paths
for (const args of [['scripts/copy-pdfjs-assets.mjs'], ['node_modules/astro/bin/astro.mjs', 'build']]) {
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ASSETS_DIR: assetsDir } });
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
for (const dir of [assetsDir]) {
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

// Vite writes the site root into the JS too: lazily imported chunks are fetched as "/" + name, and
// workers as new URL("/assets/x.js", import.meta.url). Both 404 when the copy is hosted under a
// sub-path (a GitHub Pages project site, say), which silently breaks every tool that loads a library
// on demand. Resolve chunks against the page's <meta name="asset-base"> and workers against the
// chunk's own URL instead.
const PRELOAD_BASE = /function\(([a-zA-Z_$]+)\)\{return`\/`\+\1\}/;
let patchedChunkBase = 0;
let patchedWorkers = 0;
const rehash = new Map(); // old basename → new basename, so a patched file gets a fresh URL
for await (const file of textFiles(out)) {
  if (!/\.(js|mjs)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  let next = text.replace(
    PRELOAD_BASE,
    (_, arg) =>
      `function(${arg}){return new URL(${arg},new URL(document.querySelector('meta[name="asset-base"]')?.content||'/',location.href)).href}`,
  );
  if (next !== text) patchedChunkBase++;
  const workerFixed = next.replace(new RegExp('`/' + assetsDir + '/([^`]+)`', 'g'), '`./$1`');
  if (workerFixed !== next) patchedWorkers++;
  next = workerFixed;
  if (next === text) continue;
  await writeFile(file, next);
  // The patch lands after Vite hashed the file name, so the URL would keep serving a visitor's
  // cached pre-patch copy (GitHub Pages caches for 10 minutes). Give patched files a new name.
  const name = slash(file).split('/').pop();
  const suffix = createHash('sha256').update(next).digest('hex').slice(0, 8);
  rehash.set(name, name.replace(/(\.[a-z]+)$/, `.p${suffix}$1`));
}
for (const [from, to] of rehash) {
  await cp(`${out}${assetsDir}/${from}`, `${out}${assetsDir}/${to}`);
  await rm(`${out}${assetsDir}/${from}`);
}
if (rehash.size) {
  for await (const file of textFiles(out)) {
    const text = await readFile(file, 'utf8');
    let next = text;
    for (const [from, to] of rehash) next = next.split(from).join(to);
    if (next !== text) await writeFile(file, next);
  }
}
console.log(
  `sub-path fixes: ${patchedChunkBase} chunk loader(s), ${patchedWorkers} worker URL file(s), ${rehash.size} renamed.`,
);

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
// Opened from a folder the pages render but no script runs: a module script is blocked by CORS on a
// file:// origin. Ship the instructions and a one-click local server next to them.
for (const extra of ['HOW-TO-OPEN.txt', 'start-windows.cmd']) {
  await cp(fileURLToPath(new URL(`portable-extras/${extra}`, import.meta.url)), `${out}${extra}`);
}
console.log(`dist-portable: ${pages} pages rewritten, plus HOW-TO-OPEN.txt and start-windows.cmd.`);
