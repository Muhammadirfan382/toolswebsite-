/**
 * Platform text limits and reading/speaking speed assumptions.
 * Rule (CLAUDE.md #3): every entry carries `verify: true` until checked against `source`.
 * Entries are added in Prompt 4 (word and character counters).
 */

export interface TextLimit {
  id: string;
  label: string;
  max: number;
  verify: boolean;
  source: string;
}

export const TEXT_LIMITS: TextLimit[] = [];
