/**
 * Screenshots of our own tools for guide articles.
 *   npm run build              (once, so dist/ is current)
 *   npm run shots -- merge-pdf (or any tool slug; several slugs allowed)
 *
 * For each tool it opens the page from dist/, performs the standard steps from
 * tests/e2e/happy-paths.ts with the generated fixture files, and saves numbered WebP images for
 * mobile and desktop into src/assets/guides/<slug>/:
 *   01-empty-<device>.webp, 02-input-<device>.webp, 03-result-<device>.webp
 * WebP conversion happens in the browser (canvas), so no extra image library is needed.
 */
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import generateFixtures, { FIXTURES } from '../tests/fixtures/generate.ts';
import { HAPPY_PATHS } from '../tests/e2e/happy-paths.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const PORT = 4390;
const DEVICES = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  { name: 'desktop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
] as const;
const channel = process.env.CI ? undefined : (process.env.PW_CHANNEL ?? 'msedge');

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (slugs.length === 0) {
  fail(`Usage: npm run shots -- <tool-slug> [more slugs]\nTools: ${HAPPY_PATHS.map((h) => h.slug).join(', ')}`);
}
const unknown = slugs.filter((s) => !HAPPY_PATHS.some((h) => h.slug === s));
if (unknown.length) fail(`Unknown tool slug: ${unknown.join(', ')}`);
if (!existsSync(`${root}dist/index.html`)) fail('dist/ is missing. Run `npm run build` first.');

if (!existsSync(`${FIXTURES}photo.jpg`) || !existsSync(`${FIXTURES}three-pages.pdf`)) {
  console.log('Generating fixture files…');
  await generateFixtures({ projects: [{ use: { channel } }] } as never);
}

const server = spawn(process.execPath, ['scripts/serve-dist.mjs', String(PORT)], { cwd: root, stdio: 'ignore' });
const base = `http://localhost:${PORT}`;
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch({ channel });

/** PNG screenshot of the tool area → WebP (quality 0.8), converted in the page. */
async function shoot(page: Page): Promise<Buffer> {
  const area = page.locator('.tool-area');
  await area.scrollIntoViewIfNeeded();
  const png = await area.screenshot({ animations: 'disabled' });
  const webp = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, png.toString('base64'));
  return Buffer.from(webp);
}

try {
  for (const slug of slugs) {
    const steps = HAPPY_PATHS.find((h) => h.slug === slug)!;
    const outDir = `${root}src/assets/guides/${slug}/`;
    await mkdir(outDir, { recursive: true });
    const saved: string[] = [];
    for (const device of DEVICES) {
      const context = await browser.newContext({ viewport: device.viewport, deviceScaleFactor: device.deviceScaleFactor });
      const page = await context.newPage();
      await page.goto(`${base}/${slug}`);
      const save = async (name: string) => {
        const file = `${name}-${device.name}.webp`;
        await writeFile(outDir + file, await shoot(page));
        saved.push(file);
      };
      await save('01-empty');
      await steps.prepare(page);
      await save('02-input');
      await steps.run(page);
      await page.waitForTimeout(300); // let result animations settle
      await save('03-result');
      await context.close();
    }
    console.log(`\n${slug}: saved ${saved.length} screenshots to src/assets/guides/${slug}/`);
    for (const f of saved) console.log(`  ![DESCRIBE WHAT THE READER SEES](../../assets/guides/${slug}/${f})`);
  }
} finally {
  await browser.close();
  server.kill();
}
