import { describe, expect, it } from 'vitest';
import { parsePageRange } from '../../src/lib/pdf/ranges';
import { pdfErrorMessage } from '../../src/lib/pdf/errors';

const pages = (input: string, count: number) => {
  const r = parsePageRange(input, count);
  if (!r.ok) throw new Error(r.error);
  return r.pages;
};
const error = (input: string, count: number) => {
  const r = parsePageRange(input, count);
  return r.ok ? null : r.error;
};

describe('page ranges', () => {
  it('treats empty input or "all" as every page', () => {
    expect(pages('', 3)).toEqual([0, 1, 2]);
    expect(pages('ALL', 2)).toEqual([0, 1]);
  });
  it('parses single pages, ranges and open ends', () => {
    expect(pages('1-3,5', 6)).toEqual([0, 1, 2, 4]);
    expect(pages(' 2 , 4 - 5 ', 5)).toEqual([1, 3, 4]);
    expect(pages('4-', 6)).toEqual([3, 4, 5]);
    expect(pages('2–3', 3)).toEqual([1, 2]); // en dash
  });
  it('keeps the order and repeats the user asked for', () => {
    expect(pages('3,1,1', 3)).toEqual([2, 0, 0]);
  });
  it('rejects invalid input with specific messages', () => {
    expect(error('abc', 3)).toMatch(/not a page or range/);
    expect(error('0', 3)).toMatch(/start at 1/);
    expect(error('5-2', 6)).toMatch(/backwards/);
    expect(error('1-9', 3)).toMatch(/Page 9 does not exist. This PDF has 3 pages/);
    expect(error(',', 3)).toMatch(/at least one/);
  });
});

describe('PDF error messages', () => {
  it('explains password-protected and damaged files', () => {
    const pw = Object.assign(new Error('No password given'), { name: 'PasswordException' });
    expect(pdfErrorMessage(pw, 'a.pdf')).toBe('"a.pdf" is password-protected. Remove the password first, then try again.');
    const bad = Object.assign(new Error('Invalid PDF structure.'), { name: 'InvalidPDFException' });
    expect(pdfErrorMessage(bad, 'b.pdf')).toMatch(/could not be opened/);
  });
});
