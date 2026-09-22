// Minimal static server for dist/ that behaves like Cloudflare Pages for our URLs:
// "/about" serves about.html, "/" serves index.html, unknown paths serve 404.html with status 404.
// Used by Playwright and Lighthouse. Usage: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
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
  let pathname = decodeURIComponent(url.pathname);
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
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
