/** Trigger a browser download for a Blob. The object URL is revoked shortly after. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  // Some browsers start the download asynchronously; keep the URL alive briefly.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Make names unique for a ZIP: "a.jpg", "a.jpg" → "a.jpg", "a (2).jpg". */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  });
}

/** Bundle files into a ZIP. jszip is loaded only when this is called. */
export async function zipBlobs(
  files: readonly { name: string; blob: Blob }[],
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const names = uniqueNames(files.map((f) => f.name));
  files.forEach((f, i) => zip.file(names[i] as string, f.blob));
  // Most outputs (JPG, PNG, PDF) are already compressed; STORE avoids wasted work.
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) =>
    onProgress?.(meta.percent),
  );
}
