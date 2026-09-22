/**
 * Playwright global setup: creates small test files in tests/fixtures/generated/.
 * Images are drawn with a real browser canvas; nothing is downloaded from the internet.
 */
import { chromium, type FullConfig } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generatePdfs } from './pdf-fixtures';

export const FIXTURES = fileURLToPath(new URL('./generated/', import.meta.url));

export default async function generate(config: FullConfig): Promise<void> {
  await mkdir(FIXTURES, { recursive: true });
  const channel = config.projects[0]?.use.channel;
  const browser = await chromium.launch({ channel });
  const page = await browser.newPage();

  const images = await page.evaluate(async () => {
    const toBytes = async (c: HTMLCanvasElement, type: string, q?: number) =>
      Array.from(new Uint8Array(await (await new Promise<Blob>((r) => c.toBlob((b) => r(b!), type, q))).arrayBuffer()));
    const canvas = (w: number, h: number) => Object.assign(document.createElement('canvas'), { width: w, height: h });

    // A busy "photo" that compresses poorly, so target-size code has work to do.
    const photo = canvas(1600, 1200);
    const p = photo.getContext('2d')!;
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 3000; i++) {
      p.fillStyle = `hsl(${rand() * 360},70%,${30 + rand() * 40}%)`;
      p.fillRect(rand() * 1600, rand() * 1200, 20 + rand() * 120, 20 + rand() * 120);
    }

    // Left half red, right half blue: lets tests check orientation after rotation.
    const split = canvas(200, 100);
    const s = split.getContext('2d')!;
    s.fillStyle = '#ff0000';
    s.fillRect(0, 0, 100, 100);
    s.fillStyle = '#0000ff';
    s.fillRect(100, 0, 100, 100);

    // Left half opaque red, right half fully transparent.
    const transparent = canvas(200, 100);
    const t = transparent.getContext('2d')!;
    t.fillStyle = '#ff0000';
    t.fillRect(0, 0, 100, 100);

    return {
      photo: await toBytes(photo, 'image/jpeg', 0.95),
      split: await toBytes(split, 'image/jpeg', 0.95),
      transparent: await toBytes(transparent, 'image/png'),
      webp: await toBytes(split, 'image/webp', 0.9),
    };
  });
  await browser.close();

  const u8 = (a: number[]) => Uint8Array.from(a);
  await writeFile(`${FIXTURES}photo.jpg`, u8(images.photo));
  await writeFile(`${FIXTURES}split.jpg`, u8(images.split));
  await writeFile(`${FIXTURES}transparent.png`, u8(images.transparent));
  await writeFile(`${FIXTURES}split.webp`, u8(images.webp));
  await writeFile(`${FIXTURES}rotated.jpg`, withOrientation(u8(images.split), 6));
  // Not an image at all, but named like one.
  await writeFile(`${FIXTURES}corrupt.jpg`, new TextEncoder().encode('this is not really a jpeg'));
  await writeFile(`${FIXTURES}photo.heic`, new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]));
  await writeFile(`${FIXTURES}notes.txt`, 'Hello world. This is a test file for the word counter.');
  await generatePdfs(FIXTURES, u8(images.split), u8(images.photo));
}

/** Insert an EXIF APP1 segment with the given Orientation tag right after SOI. */
function withOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0];
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = body.length + 2;
  const app1 = [0xff, 0xe1, len >> 8, len & 255, ...body];
  const out = new Uint8Array(jpeg.length + app1.length);
  out.set(jpeg.subarray(0, 2));
  out.set(app1, 2);
  out.set(jpeg.subarray(2), 2 + app1.length);
  return out;
}
