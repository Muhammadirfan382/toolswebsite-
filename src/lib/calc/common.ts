/** Shared helpers for calculators. */

export type CalcResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): CalcResult<T> => ({ ok: true, value });
export const fail = <T = never>(error: string): CalcResult<T> => ({ ok: false, error });

/** Round half away from zero to `dp` decimals, avoiding 1.005 → 1.00 float errors. */
export function round(n: number, dp = 2): number {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** dp;
  return Math.sign(n) * Math.round((Math.abs(n) * f) * (1 + Number.EPSILON)) / f;
}

/** Format a number for display: grouping commas, up to `dp` decimals, no trailing zeros. */
export function fmt(n: number, dp = 2): string {
  return round(n, dp).toLocaleString('en-US', { maximumFractionDigits: dp });
}

/** Parse user input; returns NaN for empty or non-numeric text. Accepts "1,234.5". */
export function num(input: string | null | undefined): number {
  if (input === null || input === undefined) return NaN;
  const cleaned = String(input).replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

export const isNum = (n: number): boolean => Number.isFinite(n);
