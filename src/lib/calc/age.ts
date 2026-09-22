/**
 * Age calculation on calendar dates (no time zones: dates are handled as UTC days).
 *
 * Month arithmetic clamps to the end of the month: 31 Jan + 1 month = 28/29 Feb.
 * So a 29 February birthday falls on 28 February in non-leap years.
 */
import { fail, ok, type CalcResult } from './common';

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Parse "YYYY-MM-DD" strictly (rejects 2023-02-30). */
export function parseDate(s: string | null | undefined): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? '').trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function toISO({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const toDays = ({ y, m, d }: YMD) => Date.UTC(y, m - 1, d) / DAY_MS;

export function compare(a: YMD, b: YMD): number {
  return toDays(a) - toDays(b);
}

export function daysBetween(a: YMD, b: YMD): number {
  return toDays(b) - toDays(a);
}

/** Add whole months, clamping the day to the target month's length. */
export function addMonths(date: YMD, months: number): YMD {
  const total = date.y * 12 + (date.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

export function weekday(date: YMD): string {
  return WEEKDAYS[new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()] as string;
}

export function todayLocal(now = new Date()): YMD {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  weeksRemainderDays: number;
  totalDays: number;
  totalHours: number;
  bornOn: string;
  nextBirthday: YMD;
  nextBirthdayWeekday: string;
  daysToNextBirthday: number;
  /** Age they will turn on the next birthday. */
  turning: number;
  isBirthdayToday: boolean;
}

export function calculateAge(dob: YMD, at: YMD): CalcResult<AgeResult> {
  if (compare(dob, at) > 0) {
    return fail('The date of birth is after the "age at" date. Check both dates.');
  }
  // Whole months completed since birth.
  let totalMonths = (at.y - dob.y) * 12 + (at.m - dob.m);
  if (compare(addMonths(dob, totalMonths), at) > 0) totalMonths--;
  const anchor = addMonths(dob, totalMonths);
  const days = daysBetween(anchor, at);
  const totalDays = daysBetween(dob, at);

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const isBirthdayToday = months === 0 && days === 0 && totalDays > 0;
  const turning = isBirthdayToday ? years : years + 1;
  const nextBirthday = addMonths(dob, turning * 12);

  return ok({
    years,
    months,
    days,
    totalMonths,
    totalWeeks: Math.floor(totalDays / 7),
    weeksRemainderDays: totalDays % 7,
    totalDays,
    totalHours: totalDays * 24,
    bornOn: weekday(dob),
    nextBirthday,
    nextBirthdayWeekday: weekday(nextBirthday),
    daysToNextBirthday: daysBetween(at, nextBirthday),
    turning,
    isBirthdayToday,
  });
}
