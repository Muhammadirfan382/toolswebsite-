/**
 * Proves the privacy promise:
 * 1. No request ever carries data or leaves this site while a tool is used.
 * 2. With the network switched off after the page (and, for file tools, the file) is loaded,
 *    every tool still produces its result.
 */
import { expect, test, type Request } from '@playwright/test';
import { HAPPY_PATHS, waitForNetworkQuiet } from './happy-paths';

for (const tool of HAPPY_PATHS) {
  test(`${tool.slug}: no file or text data is sent anywhere`, async ({ page, baseURL }) => {
    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));
    await page.goto(`/${tool.slug}`);
    await tool.prepare(page);
    await tool.run(page);

    const origin = new URL(baseURL!).origin;
    for (const r of requests) {
      const url = new URL(r.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') continue;
      expect(url.origin, `request to another site: ${r.url()}`).toBe(origin);
      expect(r.method(), `non-GET request: ${r.method()} ${r.url()}`).toBe('GET');
      expect(r.postData(), `request with a body: ${r.url()}`).toBeNull();
      // Only static files: pages, scripts, styles, fonts, pdf.js assets.
      expect(url.pathname, `unexpected request: ${r.url()}`).toMatch(
        /^\/($|[a-z0-9-]+$|_astro\/|pdfjs\/|favicon\.svg$|og-default\.png$)/,
      );
    }
  });

  test(`${tool.slug}: works offline after loading`, async ({ page, context }) => {
    await page.goto(`/${tool.slug}`);
    await waitForNetworkQuiet(page); // idle-time loads (e.g. the QR library) finish
    await tool.prepare(page);
    await waitForNetworkQuiet(page); // engines loaded when the file was picked
    await context.setOffline(true);

    const attempted: string[] = [];
    page.on('request', (r) => {
      if (!/^(data|blob):/.test(r.url())) attempted.push(r.url());
    });
    await tool.run(page);
    await context.setOffline(false);
    // Anything the page tried to fetch while offline must be optional (e.g. a worker script that
    // has a main-thread fallback), since the result above was produced without the network.
    for (const url of attempted) expect(new URL(url).pathname).toMatch(/^\/(_astro\/|pdfjs\/|favicon\.svg$)/);
  });
}

test('ZIP download works offline once files were picked', async ({ page, context }) => {
  const multi = HAPPY_PATHS.find((t) => t.slug === 'compress-image')!;
  await page.goto('/compress-image');
  await multi.prepare(page);
  await waitForNetworkQuiet(page);
  await context.setOffline(true);
  await multi.run(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  expect((await download).suggestedFilename()).toBe('compressed-images.zip');
});
