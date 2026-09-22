import { expect, test } from '@playwright/test';
import { chooseFiles, downloadFirst, fixture, inspectImage, near } from './helpers';

test.describe('Compress Image', () => {
  test('reaches a 20 KB target from a deep link and reports it honestly', async ({ page }) => {
    await page.goto('/compress-image?target=20kb');
    await expect(page.locator('input[name="mode"][value="target"]')).toBeChecked();
    await chooseFiles(page, 'ci-drop', [fixture('photo.jpg')]);
    await page.getByRole('button', { name: 'Compress images' }).click();
    const { bytes, download } = await downloadFirst(page, 'ci-result');
    expect(download.suggestedFilename()).toBe('photo-compressed.jpg');
    expect(bytes.length).toBeLessThanOrEqual(20 * 1024);
    await expect(page.locator('#ci-compare')).toBeVisible();
  });

  test('quality mode shows an estimate and compresses a batch', async ({ page }) => {
    await page.goto('/compress-image');
    await chooseFiles(page, 'ci-drop', [fixture('photo.jpg'), fixture('split.webp')]);
    await expect(page.locator('#ci-estimate')).toContainText('about', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Compress images' }).click();
    await expect(page.locator('#ci-result .rb-item')).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Download all as ZIP' })).toBeVisible();
  });

  test('shows specific errors for zero files, corrupt files and HEIC', async ({ page }) => {
    await page.goto('/compress-image');
    await page.getByRole('button', { name: 'Compress images' }).click();
    await expect(page.locator('#ci-errors')).toContainText('Add at least one image');

    await chooseFiles(page, 'ci-drop', [fixture('photo.heic')]);
    await expect(page.locator('#ci-drop [data-fd-error]')).toContainText('HEIC');

    await chooseFiles(page, 'ci-drop', [fixture('corrupt.jpg')]);
    await page.getByRole('button', { name: 'Compress images' }).click();
    await expect(page.locator('#ci-errors')).toContainText('could not be opened');
  });
});

test.describe('Resize Image', () => {
  test('resizes by pixels with the aspect ratio locked', async ({ page }) => {
    await page.goto('/resize-image');
    await chooseFiles(page, 'ri-drop', [fixture('photo.jpg')]);
    await expect(page.locator('#ri-first-size')).toContainText('1600 × 1200');
    await page.getByLabel('Width (px)').fill('400');
    await expect(page.getByLabel('Height (px)')).toHaveValue('300');
    await page.getByRole('button', { name: 'Resize images' }).click();
    const { bytes } = await downloadFirst(page, 'ri-result');
    const img = await inspectImage(page, bytes);
    expect([img.width, img.height]).toEqual([400, 300]);
  });

  test('passport preset from a deep link crops to 413 × 531 and keeps EXIF rotation', async ({ page }) => {
    await page.goto('/resize-image?preset=passport-35x45');
    await expect(page.locator('#ri-preset')).toHaveValue('passport-35x45');
    // rotated.jpg is 200×100 pixels with EXIF "rotate 90° clockwise": upright it is 100×200, red on top.
    await chooseFiles(page, 'ri-drop', [fixture('rotated.jpg')]);
    await expect(page.locator('#ri-first-size')).toContainText('100 × 200');
    await expect(page.locator('#ri-crop')).toBeVisible();
    await page.getByRole('button', { name: 'Resize images' }).click();
    const { bytes } = await downloadFirst(page, 'ri-result');
    expect(bytes[13]).toBe(1); // JFIF density unit = DPI
    expect((bytes[14]! << 8) | bytes[15]!).toBe(300);
    const img = await inspectImage(page, bytes, [[206, 40], [206, 490]]);
    expect([img.width, img.height]).toEqual([413, 531]);
    expect(near(img.colors[0]!, [255, 0, 0])).toBe(true);
    expect(near(img.colors[1]!, [0, 0, 255])).toBe(true);
  });

  test('hides presets that have no official size yet', async ({ page }) => {
    await page.goto('/resize-image');
    const values = await page.locator('#ri-preset option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    expect(values).toContain('instagram-post');
    expect(values).not.toContain('cnic-nadra-photo');
  });

  test('can also compress to a maximum size', async ({ page }) => {
    await page.goto('/resize-image');
    await chooseFiles(page, 'ri-drop', [fixture('photo.jpg')]);
    await page.getByLabel('Also compress to a maximum size').check();
    await page.getByLabel('Maximum size (KB)').fill('30');
    await page.getByRole('button', { name: 'Resize images' }).click();
    const { bytes } = await downloadFirst(page, 'ri-result');
    expect(bytes.length).toBeLessThanOrEqual(30 * 1024);
  });
});

test.describe('Format converters', () => {
  test('PNG to JPG fills transparency with the chosen background', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await chooseFiles(page, 'cv-drop', [fixture('transparent.png')]);
    await page.locator('#cv-bg').fill('#00ff00');
    await page.getByRole('button', { name: 'Convert to JPG' }).click();
    const { bytes, download } = await downloadFirst(page, 'cv-result');
    expect(download.suggestedFilename()).toBe('transparent.jpg');
    expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
    const img = await inspectImage(page, bytes, [[50, 50], [150, 50]]);
    expect(near(img.colors[0]!, [255, 0, 0])).toBe(true);
    expect(near(img.colors[1]!, [0, 255, 0])).toBe(true);
  });

  test('JPG to PNG converts and names the file', async ({ page }) => {
    await page.goto('/jpg-to-png');
    await chooseFiles(page, 'cv-drop', [fixture('split.jpg')]);
    await page.getByRole('button', { name: 'Convert to PNG' }).click();
    const { bytes, download } = await downloadFirst(page, 'cv-result');
    expect(download.suggestedFilename()).toBe('split.png');
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  });

  test('JPG to PNG rejects a PNG with a clear message', async ({ page }) => {
    await page.goto('/jpg-to-png');
    await chooseFiles(page, 'cv-drop', [fixture('transparent.png')]);
    await expect(page.locator('#cv-drop [data-fd-error]')).toContainText('Please choose JPG images');
  });
});
