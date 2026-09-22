// For every page in dist/: follow the JS that loads immediately (module scripts and their static
// imports, not dynamic import()), check that no heavy library is in it, and measure the initial
// HTML + CSS + JS size gzipped against the 100 KB budget.  Run after `npm run build`.
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const BUDGET = 100 * 1024;
// Strings that only exist inside each library's own code (not in our wrappers that import them).
const HEAVY = {
  'pdf-lib': /PDFObjectCopier|PDFCrossRefStream/,
  'pdfjs-dist': /AnnotationLayer|Setting up fake worker/,
  jszip: /Corrupted zip/,
  qrcode: /getSymbolTotalCodewords|Invalid QR version/,
};

const read = async (p) => readFile(join(dist, p));
const gz = (buf) => gzipSync(buf).length;

async function staticGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const code = (await read(entry)).toString();
  // Static imports only: `import ... from "./x.js"` and `import "./x.js"`, not `import("./x.js")`.
  for (const m of code.matchAll(/(?:^|[;\s}])import\s*(?:[^'"()]*?from\s*)?["']([^"']+\.js)["']/g)) {
    const next = normalize(join(dirname(entry), m[1])).replace(/\\/g, '/');
    await staticGraph(next, seen);
  }
  return seen;
}

const htmlFiles = (await readdir(dist)).filter((f) => f.endsWith('.html'));
const rows = [];
let failed = false;
for (const f of htmlFiles.sort()) {
  const html = (await read(f)).toString();
  const css = [...html.matchAll(/<link rel="stylesheet" href="\/([^"]+)"/g)].map((m) => m[1]);
  const entries = [
    ...[...html.matchAll(/<script type="module" src="\/([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link rel="modulepreload" href="\/([^"]+)"/g)].map((m) => m[1]),
  ];
  const js = new Set();
  for (const e of entries) for (const c of await staticGraph(e)) js.add(c);
  // Inline module scripts can also import chunks.
  for (const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    for (const i of m[1].matchAll(/import\s*(?:[^'"()]*?from\s*)?["']\/?([^"']+\.js)["']/g)) {
      for (const c of await staticGraph(i[1].replace(/^\//, ''))) js.add(c);
    }
  }
  let size = gz(await read(f));
  for (const c of css) size += gz(await read(c));
  const found = [];
  for (const c of js) {
    const buf = await read(c);
    size += gz(buf);
    for (const [name, re] of Object.entries(HEAVY)) if (re.test(buf.toString())) found.push(`${name} (${c})`);
  }
  const over = size > BUDGET;
  if (over || found.length) failed = true;
  rows.push({ page: f.replace('.html', ''), kb: (size / 1024).toFixed(1), chunks: js.size, heavy: found.join(', ') || '-', over });
}

console.log('page'.padEnd(24), 'initial KB (gz)'.padStart(15), 'JS chunks'.padStart(10), '  heavy libs in initial load');
for (const r of rows) {
  console.log(r.page.padEnd(24), `${r.kb}${r.over ? ' !' : ''}`.padStart(15), String(r.chunks).padStart(10), ' ', r.heavy);
}
if (failed) {
  console.log('\nFAILED: a page is over budget or loads a heavy library up front.');
  process.exit(1);
}
console.log('\nAll pages under 100 KB gzipped; no heavy library in any initial load.');
