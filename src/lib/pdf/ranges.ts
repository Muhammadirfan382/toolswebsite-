/**
 * Parse page ranges like "1-3, 5, 8-" into zero-based page indexes.
 * Empty input means all pages. "8-" means page 8 to the end.
 */
export type RangeResult = { ok: true; pages: number[] } | { ok: false; error: string };

export function parsePageRange(input: string, pageCount: number): RangeResult {
  const text = input.trim();
  if (text === '' || /^all$/i.test(text)) return { ok: true, pages: Array.from({ length: pageCount }, (_, i) => i) };
  const pages: number[] = [];
  for (const raw of text.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(\d+)\s*(?:[-–]\s*(\d*))?$/.exec(part);
    if (!m) return { ok: false, error: `"${part}" is not a page or range. Use numbers like 1-3, 5.` };
    const start = Number(m[1]);
    const end = m[2] === undefined ? start : m[2] === '' ? pageCount : Number(m[2]);
    if (start < 1 || end < 1) return { ok: false, error: 'Page numbers start at 1.' };
    if (start > end) return { ok: false, error: `"${part}" goes backwards. Write ranges from low to high, like ${end}-${start}.` };
    if (end > pageCount) {
      return { ok: false, error: `Page ${end} does not exist. This PDF has ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}.` };
    }
    for (let p = start; p <= end; p++) pages.push(p - 1);
  }
  if (pages.length === 0) return { ok: false, error: 'Enter at least one page number.' };
  return { ok: true, pages };
}
