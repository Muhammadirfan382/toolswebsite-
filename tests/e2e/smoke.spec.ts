/** Every tool page at phone and desktop width: loads without console errors, no sideways scroll, one real task works. */
import { expect, test } from '@playwright/test';
import { HAPPY_PATHS } from './happy-paths';

for (const width of [360, 1280]) {
  test.describe(`smoke at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 360 ? 780 : 900 } });

    for (const tool of HAPPY_PATHS) {
      test(tool.slug, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto(`/${tool.slug}`);
        await expect(page.locator('h1')).toHaveCount(1);
        await tool.prepare(page);
        await tool.run(page);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
        expect(errors, 'console errors').toEqual([]);
      });
    }
  });
}

test('home, category, legal and 404 pages render without errors at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text());
  });
  for (const path of ['/', '/pdf-tools', '/image-tools', '/calculators', '/text-tools', '/about', '/privacy-policy', '/terms', '/contact', '/no-such-page']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
  }
  await page.goto('/');
  await page.getByLabel('Search tools').fill('compress');
  await expect(page.locator('#search-status')).toHaveText('2 tools found.');
  expect(errors).toEqual([]);
});
