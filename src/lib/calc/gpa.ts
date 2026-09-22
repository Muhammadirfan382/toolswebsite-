/** GPA and CGPA: credit-weighted averages. */
import { fail, fmt, isNum, ok, round, type CalcResult } from './common';

export interface WeightedRow {
  /** Grade points (GPA) or a semester GPA (CGPA). */
  points: number;
  credits: number;
}

export interface WeightedResult {
  value: number;
  totalCredits: number;
  totalQualityPoints: number;
  rowsUsed: number;
  formula: string;
  working: string;
}

/**
 * Σ(points × credits) ÷ Σ credits. Rows where either value is blank are skipped.
 * `maxPoints` rejects values above the scale (e.g. a GPA of 4.5 on a 4.0 scale).
 */
export function weightedAverage(
  rows: WeightedRow[],
  opts: { maxPoints?: number; label: 'grade points' | 'GPA' },
): CalcResult<WeightedResult> {
  const used = rows.filter((r) => isNum(r.points) && isNum(r.credits));
  if (used.length === 0) return fail('Add at least one row with credit hours and a grade.');
  for (const [i, r] of used.entries()) {
    if (r.credits < 0) return fail(`Row ${i + 1}: credit hours cannot be negative.`);
    if (r.points < 0) return fail(`Row ${i + 1}: ${opts.label} cannot be negative.`);
    if (opts.maxPoints !== undefined && r.points > opts.maxPoints) {
      return fail(`Row ${i + 1}: ${opts.label} ${fmt(r.points)} is above the ${fmt(opts.maxPoints)} scale.`);
    }
  }
  const totalCredits = used.reduce((s, r) => s + r.credits, 0);
  if (totalCredits === 0) return fail('Total credit hours are 0. Enter credit hours for at least one row.');
  const totalQualityPoints = used.reduce((s, r) => s + r.points * r.credits, 0);
  const value = round(totalQualityPoints / totalCredits, 2);
  return ok({
    value,
    totalCredits,
    totalQualityPoints: round(totalQualityPoints, 2),
    rowsUsed: used.length,
    formula: `${opts.label === 'GPA' ? 'CGPA' : 'GPA'} = Σ(${opts.label} × credits) ÷ Σ credits`,
    working: `${fmt(totalQualityPoints)} ÷ ${fmt(totalCredits)} = ${fmt(value)}`,
  });
}

export interface GradeMapping {
  grade: string;
  points: number;
}

export function gpa(rows: { credits: number; grade: string }[], scale: GradeMapping[]) {
  const lookup = new Map(scale.map((g) => [g.grade, g.points]));
  return weightedAverage(
    rows.map((r) => ({ credits: r.credits, points: lookup.has(r.grade) ? (lookup.get(r.grade) as number) : NaN })),
    { label: 'grade points' },
  );
}

export function cgpa(rows: WeightedRow[], scaleMax: number) {
  return weightedAverage(rows, { maxPoints: scaleMax, label: 'GPA' });
}

/** percentage = (cgpa − subtract) × multiply, capped to 0–100. */
export function cgpaToPercent(
  value: number,
  formula: { subtract: number; multiply: number },
): CalcResult<{ value: number; working: string }> {
  if (!isNum(value)) return fail('Enter a CGPA first.');
  if (!isNum(formula.subtract) || !isNum(formula.multiply)) return fail('Enter both numbers in the formula.');
  const raw = (value - formula.subtract) * formula.multiply;
  const clamped = Math.min(100, Math.max(0, raw));
  const working =
    formula.subtract === 0
      ? `${fmt(value)} × ${fmt(formula.multiply, 4)} = ${fmt(raw)}%`
      : `(${fmt(value)} − ${fmt(formula.subtract)}) × ${fmt(formula.multiply, 4)} = ${fmt(raw)}%`;
  return ok({ value: round(clamped), working: clamped !== raw ? `${working} (limited to 0–100%)` : working });
}
