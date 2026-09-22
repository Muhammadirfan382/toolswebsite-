/** Percentage calculations. Each returns the value plus human-readable working steps. */
import { fail, fmt, isNum, ok, round, type CalcResult } from './common';

export interface Worked {
  value: number;
  /** Answer sentence, e.g. "15% of 200 is 30". */
  answer: string;
  steps: string[];
  formula: string;
}

const needNumbers = (...ns: number[]) => ns.every(isNum);

/** a) What is X% of Y? */
export function percentOf(x: number, y: number): CalcResult<Worked> {
  if (!needNumbers(x, y)) return fail('Enter both numbers.');
  const value = round((x / 100) * y);
  return ok({
    value,
    answer: `${fmt(x)}% of ${fmt(y)} is ${fmt(value)}`,
    formula: 'Result = (X ÷ 100) × Y',
    steps: [`${fmt(x)} ÷ 100 = ${fmt(x / 100, 6)}`, `${fmt(x / 100, 6)} × ${fmt(y)} = ${fmt(value)}`],
  });
}

/** b) X is what % of Y? */
export function whatPercent(x: number, y: number): CalcResult<Worked> {
  if (!needNumbers(x, y)) return fail('Enter both numbers.');
  if (y === 0) return fail('Y cannot be 0, because you cannot divide by zero.');
  const value = round((x / y) * 100);
  return ok({
    value,
    answer: `${fmt(x)} is ${fmt(value)}% of ${fmt(y)}`,
    formula: 'Percentage = (X ÷ Y) × 100',
    steps: [`${fmt(x)} ÷ ${fmt(y)} = ${fmt(x / y, 6)}`, `${fmt(x / y, 6)} × 100 = ${fmt(value)}%`],
  });
}

/** c) Percentage increase or decrease from X to Y. */
export function percentChange(from: number, to: number): CalcResult<Worked> {
  if (!needNumbers(from, to)) return fail('Enter both numbers.');
  if (from === 0) return fail('The starting value cannot be 0: a change from 0 has no percentage.');
  const diff = to - from;
  const value = round((diff / Math.abs(from)) * 100);
  const word = value > 0 ? 'increase' : value < 0 ? 'decrease' : 'change';
  return ok({
    value,
    answer:
      value === 0
        ? `No change from ${fmt(from)} to ${fmt(to)}`
        : `${fmt(Math.abs(value))}% ${word} from ${fmt(from)} to ${fmt(to)}`,
    formula: 'Change % = ((New − Old) ÷ |Old|) × 100',
    steps: [
      `${fmt(to)} − ${fmt(from)} = ${fmt(diff)}`,
      `${fmt(diff)} ÷ ${fmt(Math.abs(from))} = ${fmt(diff / Math.abs(from), 6)}`,
      `${fmt(diff / Math.abs(from), 6)} × 100 = ${fmt(value)}%`,
    ],
  });
}

/** d) Marks percentage: obtained ÷ total × 100. */
export function marksPercent(obtained: number, total: number): CalcResult<Worked> {
  if (!needNumbers(obtained, total)) return fail('Enter obtained marks and total marks.');
  if (total <= 0) return fail('Total marks must be more than 0.');
  if (obtained < 0) return fail('Obtained marks cannot be negative.');
  if (obtained > total) return fail('Obtained marks cannot be more than total marks.');
  const value = round((obtained / total) * 100);
  return ok({
    value,
    answer: `${fmt(obtained)} out of ${fmt(total)} is ${fmt(value)}%`,
    formula: 'Percentage = (Obtained marks ÷ Total marks) × 100',
    steps: [
      `${fmt(obtained)} ÷ ${fmt(total)} = ${fmt(obtained / total, 6)}`,
      `${fmt(obtained / total, 6)} × 100 = ${fmt(value)}%`,
    ],
  });
}

/** e) Add or subtract X% to/from Y (tax, markup, discount). */
export function addSubtractPercent(
  y: number,
  x: number,
  mode: 'add' | 'subtract',
): CalcResult<Worked & { amount: number }> {
  if (!needNumbers(x, y)) return fail('Enter the amount and the percentage.');
  const amount = round((x / 100) * y);
  const value = round(mode === 'add' ? y + amount : y - amount);
  const sign = mode === 'add' ? '+' : '−';
  return ok({
    value,
    amount,
    answer: `${fmt(y)} ${mode === 'add' ? 'plus' : 'minus'} ${fmt(x)}% is ${fmt(value)}`,
    formula: mode === 'add' ? 'Result = Y + (X ÷ 100 × Y)' : 'Result = Y − (X ÷ 100 × Y)',
    steps: [`${fmt(x)}% of ${fmt(y)} = ${fmt(amount)}`, `${fmt(y)} ${sign} ${fmt(amount)} = ${fmt(value)}`],
  });
}
