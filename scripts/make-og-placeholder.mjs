// Writes public/og-default.png: a plain 1200x630 placeholder (brand green, light card, lock mark).
// Replace with a designed image before launch. Run: node scripts/make-og-placeholder.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1200, H = 630;
const green = [0x1d, 0x6b, 0x52], light = [0xe3, 0xf1, 0xea], white = [255, 255, 255];
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x < x1 && y >= y0 && y < y1;

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    let c = green;
    if (inRect(x, y, 100, 100, 1100, 530)) c = light;
    // Lock body + shackle in the card
    if (inRect(x, y, 520, 300, 680, 440)) c = green;
    const dx = x - 600, dy = y - 300, r = Math.hypot(dx, dy);
    if (y <= 300 && r >= 45 && r <= 70) c = green;
    if (inRect(x, y, 530, 250, 555, 300) || inRect(x, y, 645, 250, 670, 300)) c = green;
    if (inRect(x, y, 590, 350, 610, 400)) c = white;
    const o = y * (W * 3 + 1) + 1 + x * 3;
    raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2];
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(new URL('../public/og-default.png', import.meta.url), png);
console.log(`og-default.png written (${png.length} bytes)`);
