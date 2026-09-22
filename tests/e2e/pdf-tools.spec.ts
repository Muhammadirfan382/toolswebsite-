import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { chooseFiles, downloadFirst, fixture, inspectImage } from './helpers';

const pageSizes = async (bytes: Buffer) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => {
    const { width, height } = p.getSize();
    return [Math.round(width), Math.round(height)];
  });
};

test.describe('Merge PDF', () => {
  test('merges files in order with a page range', async ({ page }) => {
    await page.goto('/merge-pdf');
    await chooseFiles(page, 'mp-drop', [fixture('three-pages.pdf'), fixture('two-pages.pdf')]);
    await expect(page.locator('#mp-drop .fd-item').first()).toContainText('3 pages');
    await expect(page.locator('#mp-drop .pdf-thumb').first()).toHaveAttribute('src', /^data:image\/png/);
    await page.getByLabel('Pages to include from three-pages.pdf').fill('2-3');
    // Move the second file up to test reordering with the keyboard-friendly buttons.
    await page.getByRole('button', { name: 'Move two-pages.pdf up' }).click();
    await page.getByRole('button', { name: 'Merge PDFs' }).click();
    const { bytes, download } = await downloadFirst(page, 'mp-result');
    expect(download.suggestedFilename()).toBe('merged.pdf');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(4); // 2 from two-pages.pdf + pages 2-3 of three-pages.pdf
  });

  test('explains password-protected, damaged and bad ranges', async ({ page }) => {
    await page.goto('/merge-pdf');
    await chooseFiles(page, 'mp-drop', [fixture('encrypted.pdf'), fixture('corrupt.pdf')]);
    await expect(page.locator('#mp-drop')).toContainText('password-protected. Remove the password first');
    await expect(page.locator('#mp-drop')).toContainText('could not be opened');

    await page.goto('/merge-pdf');
    await chooseFiles(page, 'mp-drop', [fixture('three-pages.pdf'), fixture('two-pages.pdf')]);
    await page.getByLabel('Pages to include from two-pages.pdf').fill('1-5');
    await page.getByRole('button', { name: 'Merge PDFs' }).click();
    await expect(page.locator('#mp-errors')).toContainText('Page 5 does not exist. This PDF has 2 pages.');
  });
});

test.describe('Compress PDF', () => {
  test('basic mode keeps a valid PDF and reports the size honestly', async ({ page }) => {
    await page.goto('/compress-pdf');
    await chooseFiles(page, 'cp-drop', [fixture('three-pages.pdf')]);
    await page.getByRole('button', { name: 'Compress PDF' }).click();
    const { bytes } = await downloadFirst(page, 'cp-result');
    expect(await pageSizes(bytes)).toHaveLength(3);
    await expect(page.locator('#cp-result .rb-size')).toContainText('→');
  });

  test('strong mode reaches a target from a deep link', async ({ page }) => {
    await page.goto('/compress-pdf?target=200kb');
    await expect(page.locator('input[name="mode"][value="strong"]')).toBeChecked();
    await expect(page.locator('#cp-target')).toHaveValue('200');
    await expect(page.getByText('Text will no longer be selectable or searchable.')).toBeVisible();
    await chooseFiles(page, 'cp-drop', [fixture('scan.pdf')]);
    await page.getByRole('button', { name: 'Compress PDF' }).click();
    const { bytes } = await downloadFirst(page, 'cp-result');
    expect(bytes.length).toBeLessThanOrEqual(200 * 1024);
    expect(await pageSizes(bytes)).toEqual([[595, 842], [595, 842]]);
  });

  test('rejects a password-protected PDF with a clear message', async ({ page }) => {
    await page.goto('/compress-pdf');
    await chooseFiles(page, 'cp-drop', [fixture('encrypted.pdf')]);
    await expect(page.locator('#cp-errors')).toContainText('password-protected');
  });
});

test.describe('JPG to PDF', () => {
  test('one page per image, upright, on A4', async ({ page }) => {
    await page.goto('/jpg-to-pdf');
    await chooseFiles(page, 'jp-drop', [fixture('rotated.jpg'), fixture('split.jpg'), fixture('split.webp')]);
    await page.getByRole('button', { name: 'Create PDF' }).click();
    const { bytes } = await downloadFirst(page, 'jp-result');
    // rotated.jpg is portrait once EXIF is applied; the split images are landscape.
    expect(await pageSizes(bytes)).toEqual([[595, 842], [842, 595], [842, 595]]);
  });

  test('fit-to-image page size', async ({ page }) => {
    await page.goto('/jpg-to-pdf');
    await chooseFiles(page, 'jp-drop', [fixture('split.jpg')]);
    await page.getByLabel('Page size').selectOption('fit');
    await page.getByLabel('Margin').selectOption('none');
    await page.getByRole('button', { name: 'Create PDF' }).click();
    const { bytes } = await downloadFirst(page, 'jp-result');
    expect(await pageSizes(bytes)).toEqual([[150, 75]]); // 200×100 px at 0.75 pt per px
  });
});

test.describe('PDF to JPG', () => {
  test('renders a page range and offers a ZIP', async ({ page }) => {
    await page.goto('/pdf-to-jpg');
    await chooseFiles(page, 'pj-drop', [fixture('three-pages.pdf')]);
    await expect(page.locator('#pj-info')).toContainText('3 pages');
    await page.getByLabel('Pages', { exact: true }).fill('2-3');
    await page.getByLabel('Resolution').selectOption('72');
    await page.getByRole('button', { name: 'Convert to JPG' }).click();
    await expect(page.locator('#pj-result .rb-item')).toHaveCount(2, { timeout: 30_000 });
    await expect(page.locator('#pj-result .rb-thumb').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download all as ZIP' })).toBeVisible();
    const { bytes, download } = await downloadFirst(page, 'pj-result');
    expect(download.suggestedFilename()).toBe('three-pages-page-2.jpg');
    const img = await inspectImage(page, bytes);
    expect([img.width, img.height]).toEqual([595, 841]);
  });

  test('explains a damaged PDF', async ({ page }) => {
    await page.goto('/pdf-to-jpg');
    await chooseFiles(page, 'pj-drop', [fixture('corrupt.pdf')]);
    await expect(page.locator('#pj-errors')).toContainText('could not be opened');
  });
});
