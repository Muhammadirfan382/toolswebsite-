/** Run pdf-lib operations in a Web Worker, with a main-thread fallback. */
import { runTask, type ProgressFn } from '../worker-utils';
import { loadPdfLib, runPdfOp, type PdfOp, type PdfOpResult } from './ops';
import { pdfErrorMessage } from './errors';

export function pdfOp(req: PdfOp, onProgress?: ProgressFn): Promise<PdfOpResult> {
  return runTask({
    createWorker: () => new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' }),
    fallback: runPdfOp,
    input: req,
    onProgress,
  });
}

/** Messages from ops.ts look like "encrypted: name.pdf: …"; map them to friendly text. */
export function opErrorMessage(err: unknown, fallbackName: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /^(encrypted|invalid pdf): (.+?): /.exec(msg);
  if (m) return pdfErrorMessage(new Error(m[1]), m[2]!);
  return pdfErrorMessage(err, fallbackName);
}

/**
 * Called when the user picks files: loads pdf-lib now, so the tool still works if the
 * connection drops before they press the button. (pdf.js loads for the file preview.)
 */
export function warmUpPdfEngines(): void {
  void loadPdfLib().catch(() => {});
}

export const pdfBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' });

/** Big files are slow on phones; say so up front. */
export function largeFileWarning(file: File, pages?: number): string | null {
  const big = file.size > 100 * 1024 * 1024;
  const many = (pages ?? 0) > 300;
  if (!big && !many) return null;
  return `"${file.name}" is ${big ? 'over 100 MB' : `${pages} pages`}. It will work, but may be slow on a phone.`;
}
