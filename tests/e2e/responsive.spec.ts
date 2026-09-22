/**
 * Every page at common device widths: no sideways scrolling, no tap target under 44px,
 * no text smaller than 12px. Screenshots go to test-results/responsive/ for a visual check.
 */
import { expect, test } from '@playwright/test';

const WIDTHS = [
  { name: 'small-phone', width: 320, height: 640 },
  { name: 'phone', width: 375, height: 812 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = [
  '/', '/pdf-tools', '/image-tools', '/calculators', '/text-tools',
  '/merge-pdf', '/compress-pdf', '/jpg-to-pdf', '/pdf-to-jpg',
  '/compress-image', '/resize-image', '/jpg-to-png', '/png-to-jpg',
  '/age-calculator', '/percentage-calculator', '/cgpa-calculator', '/gpa-calculator', '/bmi-calculator',
  '/qr-code-generator', '/word-counter', '/character-counter',
  '/about', '/privacy-policy', '/terms', '/contact', '/no-such-page',
];

for (const size of WIDTHS) {
  test.describe(`${size.name} (${size.width}px)`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const path of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path);
        const report = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const visible = (el: Element) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden], .visually-hidden');
          };
          const overflowing = [...document.querySelectorAll('body *')]
            .filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('.tablist'))
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${el.className} right=${Math.round(el.getBoundingClientRect().right)}`);
          const smallTargets = [...document.querySelectorAll('a, button, select, input:not([type=checkbox]):not([type=radio]), summary, textarea')]
            .filter((el) => visible(el) && !el.closest('.breadcrumbs li:last-child, .prose, .faq details p, .rb-list'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              // Inline text links inside paragraphs are exempt (WCAG 2.5.8 inline exception).
              if (el.tagName === 'A' && el.closest('p, li') && getComputedStyle(el).display === 'inline') return false;
              return r.height < 43.5;
            })
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" h=${Math.round(el.getBoundingClientRect().height)}`);
          const tinyText = [...document.querySelectorAll('body *')]
            .filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
            .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()} ${getComputedStyle(el).fontSize}`);
          return { scrollWidth: document.documentElement.scrollWidth, vw, overflowing, smallTargets, tinyText };
        });
        await page.screenshot({ path: `test-results/responsive/${size.name}${path === '/' ? '/home' : path}.png`, fullPage: true });
        expect(report.scrollWidth, `sideways scroll: ${report.overflowing.join('; ')}`).toBeLessThanOrEqual(report.vw);
        expect(report.smallTargets, 'tap targets under 44px').toEqual([]);
        expect(report.tinyText, 'text under 12px').toEqual([]);
      });
    }
  });
}
