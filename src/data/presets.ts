/**
 * Official or platform-defined sizes, scales and formulas.
 * Rule (CLAUDE.md #3): every entry carries `verify: true` until checked against `source`.
 * Components read these values from here and never hard-code them.
 * ⚠ VERIFY every entry before launch; fill `source` with the official URL you checked.
 */

/* ------------------------------------------------------------------ */
/* Image presets (Prompt 6)                                            */
/* ------------------------------------------------------------------ */

export interface ImagePreset {
  id: string;
  label: string;
  group: 'social' | 'documents';
  /** Pixel size. Leave undefined while the official figure is unknown; the UI hides the preset. */
  widthPx?: number;
  heightPx?: number;
  /** Physical size, for print and ID presets. */
  widthMm?: number;
  heightMm?: number;
  maxKB?: number;
  verify: boolean;
  source: string;
}

export const IMAGE_PRESETS: ImagePreset[] = [];

/* ------------------------------------------------------------------ */
/* GPA grade scales                                                    */
/* ------------------------------------------------------------------ */

export interface GradeScale {
  id: string;
  label: string;
  grades: { grade: string; points: number }[];
  verify: boolean;
  source: string;
}

export const GRADE_SCALES: GradeScale[] = [
  {
    id: 'letter-4',
    label: 'Standard 4.0 letter scale',
    grades: [
      { grade: 'A', points: 4.0 },
      { grade: 'A-', points: 3.7 },
      { grade: 'B+', points: 3.3 },
      { grade: 'B', points: 3.0 },
      { grade: 'B-', points: 2.7 },
      { grade: 'C+', points: 2.3 },
      { grade: 'C', points: 2.0 },
      { grade: 'C-', points: 1.7 },
      { grade: 'D+', points: 1.3 },
      { grade: 'D', points: 1.0 },
      { grade: 'F', points: 0 },
    ],
    verify: true, // ⚠ VERIFY: common US-style scale; many institutions differ (e.g. A+ = 4.0 or 4.3)
    source: '',
  },
];

/* ------------------------------------------------------------------ */
/* CGPA → percentage formulas                                          */
/* percentage = (CGPA − subtract) × multiply                           */
/* ------------------------------------------------------------------ */

export interface CgpaFormulaPreset {
  id: string;
  label: string;
  /** Which CGPA scale this formula expects (4, 5 or 10). */
  scale: 4 | 5 | 10;
  subtract: number;
  multiply: number;
  verify: boolean;
  source: string;
}

export const CGPA_SCALES = [4, 5, 10] as const;

export const CGPA_FORMULA_PRESETS: CgpaFormulaPreset[] = [
  {
    id: 'proportion-4',
    label: 'Simple proportion on a 4.0 scale (CGPA ÷ 4 × 100)',
    scale: 4,
    subtract: 0,
    multiply: 25,
    verify: true, // ⚠ VERIFY: plain arithmetic, not an official rule of any university
    source: '',
  },
  {
    id: 'proportion-5',
    label: 'Simple proportion on a 5.0 scale (CGPA ÷ 5 × 100)',
    scale: 5,
    subtract: 0,
    multiply: 20,
    verify: true, // ⚠ VERIFY
    source: '',
  },
  {
    id: 'times-9-5',
    label: 'CGPA × 9.5 (used by some 10-point systems)',
    scale: 10,
    subtract: 0,
    multiply: 9.5,
    verify: true, // ⚠ VERIFY: check which board/university uses this before naming it
    source: '',
  },
  {
    id: 'minus-0-75-times-10',
    label: '(CGPA − 0.75) × 10 (used by some 10-point systems)',
    scale: 10,
    subtract: 0.75,
    multiply: 10,
    verify: true, // ⚠ VERIFY
    source: '',
  },
  {
    id: 'proportion-10',
    label: 'Simple proportion on a 10-point scale (CGPA × 10)',
    scale: 10,
    subtract: 0,
    multiply: 10,
    verify: true, // ⚠ VERIFY
    source: '',
  },
];

/* ------------------------------------------------------------------ */
/* Adult BMI categories (WHO)                                          */
/* ------------------------------------------------------------------ */

export interface BmiCategory {
  id: 'underweight' | 'normal' | 'overweight' | 'obese';
  label: string;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound. */
  max: number;
  /** Upper bound as usually written, e.g. 24.9. */
  displayMax: number;
}

/** ⚠ VERIFY against the WHO adult BMI classification before launch. */
export const BMI_CATEGORIES_META = { verify: true, source: '' };

export const BMI_CATEGORIES: BmiCategory[] = [
  { id: 'underweight', label: 'Underweight', min: 0, max: 18.5, displayMax: 18.4 },
  { id: 'normal', label: 'Normal weight', min: 18.5, max: 25, displayMax: 24.9 },
  { id: 'overweight', label: 'Overweight', min: 25, max: 30, displayMax: 29.9 },
  { id: 'obese', label: 'Obese', min: 30, max: Infinity, displayMax: Infinity },
];

/* ------------------------------------------------------------------ */
/* QR code printing guidance (general rules of thumb, not standards)   */
/* ------------------------------------------------------------------ */

export const QR_PRINT_GUIDE = {
  /** Smallest printed side length commonly recommended for phone scanning. */
  minSizeCm: 2,
  /** Rough rule: scanning distance ≈ this many times the code's width. */
  distanceRatio: 10,
  /** Minimum color contrast ratio before we warn that a code may not scan. */
  minContrast: 4,
  verify: true, // ⚠ VERIFY: industry rules of thumb; test-print before large runs
  source: '',
} as const;
