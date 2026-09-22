/**
 * Official or platform-defined sizes (photos, IDs, exam forms, social images) and CGPA formulas.
 * Rule (CLAUDE.md #3): every entry carries `verify: true` until checked against `source`.
 * Components read sizes from here and never hard-code them.
 * Entries are added in Prompt 3 (CGPA formulas) and Prompt 6 (image presets).
 */

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

export interface CgpaFormulaPreset {
  id: string;
  label: string;
  /** Human-readable formula shown to the user. */
  formula: string;
  verify: boolean;
  source: string;
}

export const IMAGE_PRESETS: ImagePreset[] = [];

export const CGPA_FORMULA_PRESETS: CgpaFormulaPreset[] = [];
