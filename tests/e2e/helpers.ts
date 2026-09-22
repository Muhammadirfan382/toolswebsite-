import { expect, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/generated/${name}`, import.meta.url));

/** Add files through the real "Choose files" button (the keyboard/mobile path). */
export async function chooseFiles(page: Page, dropId: string, files: string[]): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.locator(`#${dropId} [data-fd-choose]`).click();
  await (await chooser).setFiles(files);
}

export async function downloadFirst(page: Page, resultId: string): Promise<{ download: Download; bytes: Buffer }> {
  const result = page.locator(`#${resultId}`);
  await expect(result).toBeVisible({ timeout: 30_000 });
  const wait = page.waitForEvent('download');
  await result.locator('.rb-item button').first().click();
  const download = await wait;
  const bytes = await readFile((await download.path())!);
  return { download, bytes };
}

/** Decode image bytes in the page and return size plus the colors at the given points. */
export async function inspectImage(page: Page, bytes: Buffer, points: [number, number][] = []) {
  return page.evaluate(
    async ({ data, points }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const c = document.createElement('canvas');
      c.width = bitmap.width;
      c.height = bitmap.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      return {
        width: bitmap.width,
        height: bitmap.height,
        colors: points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data)),
      };
    },
    { data: Array.from(bytes), points },
  );
}

/** Colors are "close" when each channel is within 40 (JPEG is lossy). */
export const near = (actual: number[], expected: number[]) =>
  expected.every((v, i) => Math.abs((actual[i] ?? 0) - v) <= 40);
