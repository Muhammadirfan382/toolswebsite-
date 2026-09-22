/** Adult BMI. Category thresholds come from src/data/presets.ts (BMI_CATEGORIES). */
import { BMI_CATEGORIES } from '../../data/presets';
import { fail, fmt, isNum, ok, round, type CalcResult } from './common';

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;

export function imperialToMetric(feet: number, inches: number, pounds: number) {
  const totalInches = (isNum(feet) ? feet : 0) * 12 + (isNum(inches) ? inches : 0);
  return { cm: totalInches * CM_PER_INCH, kg: pounds * KG_PER_LB };
}

export interface BmiResult {
  bmi: number;
  category: string;
  categoryId: string;
  healthyMinKg: number;
  healthyMaxKg: number;
  working: string;
}

export function bmi(cm: number, kg: number): CalcResult<BmiResult> {
  if (!isNum(cm) || !isNum(kg)) return fail('Enter your height and weight.');
  if (cm <= 0 || kg <= 0) return fail('Height and weight must be more than 0.');
  if (cm < 50 || cm > 272) return fail('Check your height: it should be between 50 cm and 272 cm (1 ft 8 in to 8 ft 11 in).');
  if (kg < 10 || kg > 650) return fail('Check your weight: it should be between 10 kg and 650 kg (22 lb to 1,433 lb).');
  const m = cm / 100;
  const raw = kg / (m * m);
  const value = round(raw, 1);
  const cat = BMI_CATEGORIES.find((c) => value >= c.min && value < c.max) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1]!;
  const normal = BMI_CATEGORIES.find((c) => c.id === 'normal')!;
  return ok({
    bmi: value,
    category: cat.label,
    categoryId: cat.id,
    healthyMinKg: round(normal.min * m * m, 1),
    healthyMaxKg: round(normal.displayMax * m * m, 1),
    working: `${fmt(kg, 1)} kg ÷ (${fmt(m, 2)} m)² = ${fmt(kg, 1)} ÷ ${fmt(m * m, 4)} = ${fmt(value, 1)}`,
  });
}
