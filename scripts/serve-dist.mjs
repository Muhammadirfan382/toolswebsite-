// Minimal static server for dist/ that behaves like Cloudflare Pages for our URLs:
// "/about" serves about.html, "/" serves index.html, unknown paths serve 404.html with status 404,
// and the rules in dist/_headers (Content-Security-Policy etc.) are applied, so tests run under the
// same policy as production. Used by Playwright and Lighthouse.
// Usage: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// DIST_DIR serves another build folder, e.g. the share build: DIST_DIR=dist-share.
const root = fileURLToPath(new URL(`../${process.env.DIST_DIR ?? 'dist'}/`, import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4322);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

/** Parse Cloudflare's _headers format: a path pattern, then indented "Name: value" lines. */
async function loadHeaderRules() {
  let text = '';
  try {
    text = await readFile(join(root, '_headers'), 'utf8');
  } catch {
    return [];
  }
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      // "/_astro/*" becomes /^\/_astro\/.*$/
      const pattern = line
        .trim()
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, '\\$&'))
        .join('.*');
      rules.push({ re: new RegExp(`^${pattern}$`), headers: {} });
    } else if (rules.length) {
      const i = line.indexOf(':');
      rules.at(-1).headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}
const headerRules = await loadHeaderRules();
// Sharing over plain http (a LAN address instead of localhost) needs one production directive
// dropped: "upgrade-insecure-requests" would rewrite every asset URL to https and fail.
const plainHttp = process.env.PLAIN_HTTP === '1' || process.argv.includes('--lan');
const headersFor = (pathname) => {
  const headers = Object.assign(
    {},
    ...headerRules.filter((r) => r.re.test(pathname)).map((r) => r.headers),
  );
  const csp = headers['Content-Security-Policy'];
  if (plainHttp && csp) {
    headers['Content-Security-Policy'] = csp.replace(/;\s*upgrade-insecure-requests/, '');
  }
  return headers;
};

async function tryFile(path) {
  try {
    const s = await stat(path);
    return s.isFile() ? path : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  // Mirror public/_redirects: drop trailing slashes.
  if (pathname.length > 1 && pathname.endsWith('/')) {
    res.writeHead(301, { Location: pathname.slice(0, -1) + url.search });
    return res.end();
  }
  const safe = normalize(pathname).replace(/^([/\\])+/, '');
  if (safe.startsWith('..')) {
    res.writeHead(400);
    return res.end();
  }
  const candidates = pathname === '/' ? ['index.html'] : [safe, `${safe}.html`];
  let file = null;
  for (const c of candidates) if ((file = await tryFile(join(root, c)))) break;
  const status = file ? 200 : 404;
  file ??= join(root, '404.html');
  const body = await readFile(file);
  res.writeHead(status, {
    'Cache-Control': 'no-cache',
    ...headersFor(pathname),
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
  });
  res.end(body);
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
