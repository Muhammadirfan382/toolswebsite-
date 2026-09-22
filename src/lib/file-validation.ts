/** Pure helpers for checking files against an `accept` string and size limit. */
import { formatBytes } from './format';

/** Split an accept string such as "image/jpeg,.png,image/*" into lowercase tokens. */
export function parseAccept(accept: string): string[] {
  return accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function matchesAccept(file: { name: string; type: string }, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export interface ValidationOptions {
  tokens: string[];
  /** Human description of accepted types, e.g. "PDF files". */
  acceptLabel: string;
  maxBytes: number;
}

/** Returns a specific error message, or null when the file is acceptable. */
export function validateFile(
  file: { name: string; type: string; size: number },
  { tokens, acceptLabel, maxBytes }: ValidationOptions,
): string | null {
  if (!matchesAccept(file, tokens)) {
    return `"${file.name}" is not a supported file type. Please choose ${acceptLabel}.`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty (0 bytes). It may not have finished downloading; try saving it again.`;
  }
  if (file.size > maxBytes) {
    return `"${file.name}" is ${formatBytes(file.size)}, which is over the ${formatBytes(maxBytes)} limit per file.`;
  }
  return null;
}

/** Move an item within an array, returning a new array. Out-of-range moves return a copy. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}
