/** Page count and first-page thumbnail per PDF file, cached so re-renders are instant. */
import { firstPageThumbnail, openPdf } from './pdfjs';
import { pdfErrorMessage } from './errors';

export type PdfInfo = { ok: true; pages: number; thumb: string } | { ok: false; error: string };

const cache = new WeakMap<File, Promise<PdfInfo>>();

export function pdfInfo(file: File): Promise<PdfInfo> {
  let p = cache.get(file);
  if (!p) {
    p = (async (): Promise<PdfInfo> => {
      try {
        const doc = await openPdf(await file.arrayBuffer());
        try {
          return { ok: true, pages: doc.numPages, thumb: await firstPageThumbnail(doc) };
        } finally {
          await doc.loadingTask.destroy();
        }
      } catch (err) {
        return { ok: false, error: pdfErrorMessage(err, file.name) };
      }
    })();
    cache.set(file, p);
  }
  return p;
}
