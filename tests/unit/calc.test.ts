import { describe, expect, it } from 'vitest';
import { calculateAge, parseDate, addMonths, isLeapYear, type YMD } from '../../src/lib/calc/age';
import {
  addSubtractPercent,
  marksPercent,
  percentChange,
  percentOf,
  whatPercent,
} from '../../src/lib/calc/percentage';
import { cgpa, cgpaToPercent, gpa } from '../../src/lib/calc/gpa';
import { bmi, imperialToMetric } from '../../src/lib/calc/bmi';
import { fmt, num, round } from '../../src/lib/calc/common';
import { GRADE_SCALES } from '../../src/data/presets';

const d = (s: string): YMD => parseDate(s)!;
const value = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!r.ok) throw new Error(`expected ok, got error: ${r.error}`);
  return r.value;
};
const error = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

describe('common', () => {
  it('rounds half away from zero without float errors', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(-1.005, 2)).toBe(-1.01);
    expect(round(2.675, 2)).toBe(2.68);
  });
  it('parses numbers with commas and rejects empty input', () => {
    expect(num('1,234.5')).toBe(1234.5);
    expect(num('')).toBeNaN();
    expect(num('abc')).toBeNaN();
    expect(num(undefined)).toBeNaN();
  });
  it('formats large numbers with grouping', () => {
    expect(fmt(1234567.891)).toBe('1,234,567.89');
  });
});

describe('age calculator', () => {
  it('parses dates strictly', () => {
    expect(parseDate('2023-02-29')).toBeNull();
    expect(parseDate('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 });
    expect(parseDate('')).toBeNull();
    expect(parseDate('2024-13-01')).toBeNull();
  });

  it('knows leap years', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
  });

  it('clamps month addition to month end', () => {
    expect(addMonths(d('2024-01-31'), 1)).toEqual({ y: 2024, m: 2, d: 29 });
    expect(addMonths(d('2023-01-31'), 1)).toEqual({ y: 2023, m: 2, d: 28 });
    expect(addMonths(d('2023-11-15'), 3)).toEqual({ y: 2024, m: 2, d: 15 });
  });

  it('calculates a simple age', () => {
    const r = value(calculateAge(d('1990-05-15'), d('2024-09-22')));
    expect([r.years, r.months, r.days]).toEqual([34, 4, 7]);
    expect(r.bornOn).toBe('Tuesday');
    expect(r.nextBirthday).toEqual({ y: 2025, m: 5, d: 15 });
    expect(r.turning).toBe(35);
  });

  it('counts totals', () => {
    const r = value(calculateAge(d('2024-01-01'), d('2024-12-31')));
    expect(r.totalDays).toBe(365);
    expect(r.totalWeeks).toBe(52);
    expect(r.weeksRemainderDays).toBe(1);
    expect(r.totalHours).toBe(365 * 24);
    expect(r.totalMonths).toBe(11);
  });

  it('handles 29 February birthdays in non-leap years (observed on 28 February)', () => {
    const dob = d('2000-02-29');
    const before = value(calculateAge(dob, d('2001-02-27')));
    expect([before.years, before.months]).toEqual([0, 11]);
    const on = value(calculateAge(dob, d('2001-02-28')));
    expect([on.years, on.months, on.days]).toEqual([1, 0, 0]);
    expect(on.isBirthdayToday).toBe(true);
    const leap = value(calculateAge(dob, d('2024-02-29')));
    expect([leap.years, leap.months, leap.days]).toEqual([24, 0, 0]);
    const next = value(calculateAge(dob, d('2024-03-01')));
    expect(next.nextBirthday).toEqual({ y: 2025, m: 2, d: 28 });
    expect(next.daysToNextBirthday).toBe(364);
  });

  it('handles end-of-month births', () => {
    const r = value(calculateAge(d('2023-01-31'), d('2023-03-01')));
    expect([r.years, r.months, r.days]).toEqual([0, 1, 1]);
  });

  it('reports birthday today with a 0-day countdown', () => {
    const r = value(calculateAge(d('2000-09-22'), d('2024-09-22')));
    expect(r.isBirthdayToday).toBe(true);
    expect(r.daysToNextBirthday).toBe(0);
    expect(r.turning).toBe(24);
  });

  it('handles the same day as birth (age 0)', () => {
    const r = value(calculateAge(d('2024-09-22'), d('2024-09-22')));
    expect([r.years, r.months, r.days, r.totalDays]).toEqual([0, 0, 0, 0]);
    expect(r.isBirthdayToday).toBe(false);
    expect(r.nextBirthday).toEqual({ y: 2025, m: 9, d: 22 });
  });

  it('rejects a birth date after the "age at" date', () => {
    expect(error(calculateAge(d('2025-01-01'), d('2024-01-01')))).toMatch(/after/);
  });

  it('copes with very long spans', () => {
    const r = value(calculateAge(d('0001-01-01'), d('9999-12-31')));
    expect(r.years).toBe(9998);
  });
});

describe('percentage calculator', () => {
  it('X% of Y', () => {
    expect(value(percentOf(15, 200)).value).toBe(30);
    expect(value(percentOf(0, 200)).value).toBe(0);
    expect(value(percentOf(-10, 50)).value).toBe(-5);
    expect(value(percentOf(33.333, 1e12)).value).toBe(333330000000);
    expect(error(percentOf(NaN, 5))).toMatch(/Enter/);
  });
  it('X is what % of Y', () => {
    expect(value(whatPercent(30, 200)).value).toBe(15);
    expect(value(whatPercent(1, 3)).value).toBe(33.33);
    expect(error(whatPercent(5, 0))).toMatch(/zero/);
  });
  it('percentage change', () => {
    expect(value(percentChange(50, 75)).value).toBe(50);
    expect(value(percentChange(80, 60)).value).toBe(-25);
    expect(value(percentChange(-50, -25)).value).toBe(50);
    expect(value(percentChange(10, 10)).answer).toMatch(/No change/);
    expect(error(percentChange(0, 10))).toMatch(/cannot be 0/);
  });
  it('marks percentage', () => {
    expect(value(marksPercent(450, 500)).value).toBe(90);
    expect(value(marksPercent(0, 500)).value).toBe(0);
    expect(value(marksPercent(1, 3)).steps.length).toBe(2);
    expect(error(marksPercent(501, 500))).toMatch(/more than total/);
    expect(error(marksPercent(-1, 500))).toMatch(/negative/);
    expect(error(marksPercent(10, 0))).toMatch(/more than 0/);
  });
  it('add or subtract a percentage', () => {
    const add = value(addSubtractPercent(200, 15, 'add'));
    expect([add.amount, add.value]).toEqual([30, 230]);
    const sub = value(addSubtractPercent(200, 15, 'subtract'));
    expect(sub.value).toBe(170);
    expect(value(addSubtractPercent(100, 150, 'subtract')).value).toBe(-50);
  });
});

describe('GPA calculator', () => {
  const scale = GRADE_SCALES[0]!.grades;
  it('computes a credit-weighted GPA', () => {
    const r = value(gpa([{ credits: 3, grade: 'A' }, { credits: 4, grade: 'B+' }, { credits: 2, grade: 'C' }], scale));
    // (12 + 13.2 + 4) / 9 = 3.244…
    expect(r.value).toBe(3.24);
    expect(r.totalCredits).toBe(9);
  });
  it('skips blank rows and rejects empty input', () => {
    expect(value(gpa([{ credits: 3, grade: 'A' }, { credits: NaN, grade: 'B' }], scale)).value).toBe(4);
    expect(error(gpa([], scale))).toMatch(/at least one/);
    expect(error(gpa([{ credits: 0, grade: 'A' }], scale))).toMatch(/0/);
    expect(error(gpa([{ credits: -3, grade: 'A' }], scale))).toMatch(/negative/);
  });
  it('uses an edited grade mapping', () => {
    const custom = scale.map((g) => (g.grade === 'A' ? { ...g, points: 4.3 } : g));
    expect(value(gpa([{ credits: 3, grade: 'A' }], custom)).value).toBe(4.3);
  });
  it('handles huge credit values', () => {
    expect(value(gpa([{ credits: 1e9, grade: 'B' }, { credits: 1e9, grade: 'A' }], scale)).value).toBe(3.5);
  });
});

describe('CGPA calculator', () => {
  it('weights semester GPAs by credits', () => {
    const r = value(cgpa([{ points: 3.5, credits: 18 }, { points: 3.0, credits: 12 }], 4));
    // (63 + 36) / 30 = 3.3
    expect(r.value).toBe(3.3);
  });
  it('rejects a GPA above the scale', () => {
    expect(error(cgpa([{ points: 4.5, credits: 18 }], 4))).toMatch(/above the 4 scale/);
    expect(value(cgpa([{ points: 9.1, credits: 20 }], 10)).value).toBe(9.1);
  });
  it('converts to percentage with an editable formula', () => {
    expect(value(cgpaToPercent(8, { subtract: 0, multiply: 9.5 })).value).toBe(76);
    expect(value(cgpaToPercent(8, { subtract: 0.75, multiply: 10 })).value).toBe(72.5);
    expect(value(cgpaToPercent(3.2, { subtract: 0, multiply: 25 })).value).toBe(80);
    expect(value(cgpaToPercent(0.5, { subtract: 0.75, multiply: 10 })).value).toBe(0);
    expect(error(cgpaToPercent(NaN, { subtract: 0, multiply: 9.5 }))).toMatch(/CGPA/);
  });
});

describe('BMI calculator', () => {
  it('computes metric BMI and category', () => {
    const r = value(bmi(170, 65));
    expect(r.bmi).toBe(22.5);
    expect(r.categoryId).toBe('normal');
    expect(r.healthyMinKg).toBe(53.5);
    expect(r.healthyMaxKg).toBe(72);
  });
  it('places category boundaries correctly', () => {
    // 18.5 exactly → normal; 25 → overweight; 30 → obese
    expect(value(bmi(100, 18.5)).categoryId).toBe('normal');
    expect(value(bmi(100, 18.4)).categoryId).toBe('underweight');
    expect(value(bmi(100, 25)).categoryId).toBe('overweight');
    expect(value(bmi(100, 30)).categoryId).toBe('obese');
  });
  it('converts imperial units', () => {
    const { cm, kg } = imperialToMetric(5, 7, 150);
    expect(cm).toBeCloseTo(170.18, 2);
    expect(kg).toBeCloseTo(68.04, 2);
    expect(value(bmi(cm, kg)).bmi).toBe(23.5);
  });
  it('rejects zero, negative, empty and implausible values', () => {
    expect(error(bmi(0, 60))).toMatch(/more than 0/);
    expect(error(bmi(-170, 60))).toMatch(/more than 0/);
    expect(error(bmi(NaN, 60))).toMatch(/Enter/);
    expect(error(bmi(170, 5000))).toMatch(/weight/);
    expect(error(bmi(1700, 60))).toMatch(/height/);
  });
});
