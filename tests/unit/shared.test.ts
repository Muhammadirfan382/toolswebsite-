import { describe, expect, it } from 'vitest';
import { describeSizeChange, formatBytes, percentSaved, withExtension } from '../../src/lib/format';
import { matchesAccept, moveItem, parseAccept, validateFile } from '../../src/lib/file-validation';
import { uniqueNames } from '../../src/lib/download';
import { breadcrumbList, faqPage, softwareApplication, toJsonLd } from '../../src/lib/schema';

describe('format', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(20 * 1024)).toBe('20 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(1.25 * 1024 * 1024)).toBe('1.25 MB');
    expect(formatBytes(-1)).toBe('—');
  });
  it('describes size changes honestly', () => {
    expect(percentSaved(1000, 250)).toBe(75);
    expect(describeSizeChange(1000, 250)).toBe('75% smaller');
    expect(describeSizeChange(1000, 1200)).toBe('20% larger');
    expect(describeSizeChange(1000, 1000)).toBe('about the same size');
    expect(percentSaved(0, 10)).toBe(0);
  });
  it('replaces extensions', () => {
    expect(withExtension('photo.jpeg', 'png')).toBe('photo.png');
    expect(withExtension('archive.tar.gz', 'zip')).toBe('archive.tar.zip');
    expect(withExtension('noext', 'jpg')).toBe('noext.jpg');
  });
});

describe('file validation', () => {
  const tokens = parseAccept('image/jpeg, .PNG ,image/webp');
  it('matches by MIME type or extension', () => {
    expect(matchesAccept({ name: 'a.jpg', type: 'image/jpeg' }, tokens)).toBe(true);
    expect(matchesAccept({ name: 'a.png', type: '' }, tokens)).toBe(true);
    expect(matchesAccept({ name: 'a.gif', type: 'image/gif' }, tokens)).toBe(false);
    expect(matchesAccept({ name: 'x', type: 'image/gif' }, parseAccept('image/*'))).toBe(true);
  });
  it('returns specific messages', () => {
    const opts = { tokens, acceptLabel: 'JPG, PNG or WebP images', maxBytes: 1024 };
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 10 }, opts)).toMatch(/not a supported file type/);
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: 0 }, opts)).toMatch(/empty/);
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: 2048 }, opts)).toMatch(/over the 1 KB limit/);
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: 100 }, opts)).toBeNull();
  });
  it('moves items', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('download helpers', () => {
  it('makes ZIP entry names unique', () => {
    expect(uniqueNames(['a.jpg', 'A.jpg', 'a.jpg', 'b'])).toEqual(['a.jpg', 'A (2).jpg', 'a (3).jpg', 'b']);
  });
});

describe('JSON-LD', () => {
  it('builds breadcrumbs with absolute URLs', () => {
    const b = breadcrumbList([{ name: 'Home', path: '/' }, { name: 'PDF', path: '/pdf-tools' }], 'https://example.com');
    expect((b.itemListElement as { item: string }[])[1]!.item).toBe('https://example.com/pdf-tools');
  });
  it('never includes rating fields', () => {
    const s = JSON.stringify([softwareApplication({ name: 'x', description: 'y', url: 'https://e.com/x' }), faqPage([{ q: 'q', a: 'a' }])]);
    expect(s).not.toMatch(/"(aggregateRating|ratingValue|review|reviewRating)"/i);
  });
  it('escapes </script> in JSON-LD', () => {
    expect(toJsonLd({ a: '</script>' })).not.toContain('</script>');
  });
});
