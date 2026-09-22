// Copies pdf.js font, character-map, color-profile and decoder files into public/pdfjs/ so PDF
// rendering never fetches from a CDN (and works offline after the page loads).
// Runs automatically before `npm run dev` and `npm run build`.
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../node_modules/pdfjs-dist/', import.meta.url));
const dest = fileURLToPath(new URL('../public/pdfjs/', import.meta.url));
await mkdir(dest, { recursive: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(`${src}${dir}`, `${dest}${dir}`, { recursive: true });
}
console.log('pdf.js assets copied to public/pdfjs/');
