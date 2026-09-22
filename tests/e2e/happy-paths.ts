/** One real task per tool, shared by the smoke, privacy and offline tests. */
import { expect, type Page } from '@playwright/test';
import { chooseFiles, fixture } from './helpers.ts';

export interface HappyPath {
  slug: string;
  /** Uses files (PDF or image) rather than typed input. */
  files?: boolean;
  /** Step 1: provide input (choose files / type). */
  prepare: (page: Page) => Promise<void>;
  /** Step 2: run the tool and check the result. */
  run: (page: Page) => Promise<void>;
}

const resultVisible = (page: Page, id: string) => expect(page.locator(`#${id} .rb-item`).first()).toBeVisible({ timeout: 30_000 });
const fill = (page: Page, selector: string, value: string) => page.locator(selector).fill(value);

export const HAPPY_PATHS: HappyPath[] = [
  {
    slug: 'merge-pdf',
    files: true,
    prepare: async (p) => {
      await chooseFiles(p, 'mp-drop', [fixture('three-pages.pdf'), fixture('two-pages.pdf')]);
      await expect(p.locator('#mp-drop .fd-item').first()).toContainText('pages');
    },
    run: async (p) => {
      await p.getByRole('button', { name: 'Merge PDFs' }).click();
      await resultVisible(p, 'mp-result');
    },
  },
  {
    slug: 'compress-pdf',
    files: true,
    prepare: (p) => chooseFiles(p, 'cp-drop', [fixture('three-pages.pdf')]),
    run: async (p) => {
      await p.getByRole('button', { name: 'Compress PDF' }).click();
      await resultVisible(p, 'cp-result');
    },
  },
  {
    slug: 'jpg-to-pdf',
    files: true,
    prepare: (p) => chooseFiles(p, 'jp-drop', [fixture('split.jpg')]),
    run: async (p) => {
      await p.getByRole('button', { name: 'Create PDF' }).click();
      await resultVisible(p, 'jp-result');
    },
  },
  {
    slug: 'pdf-to-jpg',
    files: true,
    prepare: async (p) => {
      await chooseFiles(p, 'pj-drop', [fixture('two-pages.pdf')]);
      await expect(p.locator('#pj-info')).toContainText('2 pages');
    },
    run: async (p) => {
      await p.getByRole('button', { name: 'Convert to JPG' }).click();
      await expect(p.locator('#pj-result .rb-item')).toHaveCount(2, { timeout: 30_000 });
    },
  },
  {
    slug: 'compress-image',
    files: true,
    prepare: (p) => chooseFiles(p, 'ci-drop', [fixture('photo.jpg'), fixture('split.jpg')]),
    run: async (p) => {
      await p.getByRole('button', { name: 'Compress images' }).click();
      await expect(p.locator('#ci-result .rb-item')).toHaveCount(2, { timeout: 30_000 });
    },
  },
  {
    slug: 'resize-image',
    files: true,
    prepare: async (p) => {
      await chooseFiles(p, 'ri-drop', [fixture('split.jpg')]);
      await expect(p.locator('#ri-first-size')).toContainText('200 × 100');
    },
    run: async (p) => {
      await p.getByLabel('Percentage', { exact: true }).check();
      await p.getByRole('button', { name: 'Resize images' }).click();
      await expect(p.locator('#ri-result .rb-note').first()).toContainText('100 × 50 px', { timeout: 30_000 });
    },
  },
  {
    slug: 'jpg-to-png',
    files: true,
    prepare: (p) => chooseFiles(p, 'cv-drop', [fixture('split.jpg')]),
    run: async (p) => {
      await p.getByRole('button', { name: 'Convert to PNG' }).click();
      await resultVisible(p, 'cv-result');
    },
  },
  {
    slug: 'png-to-jpg',
    files: true,
    prepare: (p) => chooseFiles(p, 'cv-drop', [fixture('transparent.png')]),
    run: async (p) => {
      await p.getByRole('button', { name: 'Convert to JPG' }).click();
      await resultVisible(p, 'cv-result');
    },
  },
  {
    slug: 'age-calculator',
    prepare: async () => {},
    run: async (p) => {
      await fill(p, '#dob', '2000-02-29');
      await fill(p, '#at', '2024-03-01');
      await expect(p.locator('#age-result')).toContainText('24 years, 0 months, 1 day');
    },
  },
  {
    slug: 'percentage-calculator',
    prepare: async () => {},
    run: async (p) => {
      await fill(p, '#of-x', '15');
      await fill(p, '#of-y', '200');
      await expect(p.locator('#panel-of [data-result]')).toContainText('15% of 200 is 30');
    },
  },
  {
    slug: 'cgpa-calculator',
    prepare: async () => {},
    run: async (p) => {
      await p.getByLabel('Semester 1 GPA').fill('3.5');
      await p.getByLabel('Semester 1 credit hours').fill('18');
      await p.getByLabel('Semester 2 GPA').fill('3');
      await p.getByLabel('Semester 2 credit hours').fill('12');
      await expect(p.locator('#cgpa-result')).toContainText('CGPA: 3.30');
    },
  },
  {
    slug: 'gpa-calculator',
    prepare: async () => {},
    run: async (p) => {
      await p.getByLabel('Course 1 credit hours').fill('3');
      await p.getByLabel('Course 1 grade').selectOption('A');
      await p.getByLabel('Course 2 credit hours').fill('4');
      await p.getByLabel('Course 2 grade').selectOption('B+');
      await expect(p.locator('#gpa-result')).toContainText('GPA: 3.60');
    },
  },
  {
    slug: 'bmi-calculator',
    prepare: async () => {},
    run: async (p) => {
      await fill(p, '#h', '170');
      await fill(p, '#w', '65');
      await expect(p.locator('#bmi-result')).toContainText('BMI 22.5: Normal weight');
    },
  },
  {
    slug: 'qr-code-generator',
    prepare: async () => {},
    run: async (p) => {
      await fill(p, '#qr-url', 'example.com');
      await expect(p.locator('#qr-canvas')).toBeVisible({ timeout: 15_000 });
      await expect(p.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
    },
  },
  {
    slug: 'word-counter',
    prepare: async () => {},
    run: async (p) => {
      await fill(p, '#wc-text', 'The quick brown fox jumps over the lazy dog.');
      await expect(p.locator('#s-words')).toHaveText('9');
    },
  },
  {
    slug: 'character-counter',
    prepare: async () => {},
    run: async (p) => {
      await fill(p, '#cc-text', 'Hello 👋🏽 world');
      await expect(p.locator('#c-chars')).toHaveText('13');
    },
  },
];

/** Wait until no request has been in flight for `quietMs` (lazy chunks finished loading). */
export async function waitForNetworkQuiet(page: Page, quietMs = 800, timeoutMs = 15_000): Promise<void> {
  let inflight = 0;
  let last = Date.now();
  const up = () => {
    inflight++;
    last = Date.now();
  };
  const down = () => {
    inflight = Math.max(0, inflight - 1);
    last = Date.now();
  };
  page.on('request', up);
  page.on('requestfinished', down);
  page.on('requestfailed', down);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (inflight === 0 && Date.now() - last >= quietMs) break;
    await page.waitForTimeout(100);
  }
  page.off('request', up);
  page.off('requestfinished', down);
  page.off('requestfailed', down);
}
