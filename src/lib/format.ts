/** Formatting helpers shared by tools. 1 KB = 1024 bytes, matching how most upload forms count. */

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  // parseFloat drops trailing zeros: "5.00" → 5, "1.50" → 1.5
  if (kb < 1024) return `${kb < 10 ? parseFloat(kb.toFixed(1)) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${parseFloat(mb < 10 ? mb.toFixed(2) : mb.toFixed(1))} MB`;
}

/**
 * Size change from `before` to `after` as a whole percentage.
 * Positive = smaller (saved), negative = larger.
 */
export function percentSaved(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round((1 - after / before) * 100);
}

export function describeSizeChange(before: number, after: number): string {
  const pct = percentSaved(before, after);
  if (pct > 0) return `${pct}% smaller`;
  if (pct < 0) return `${-pct}% larger`;
  return 'about the same size';
}

/** Replace a file's extension, e.g. ("photo.jpeg", "png") → "photo.png". */
export function withExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'file';
  return `${base}.${ext}`;
}
