/**
 * "Strong" PDF compression: render every page to a JPEG and rebuild the PDF from those images.
 * Text stops being selectable. With a target size, each page is encoded at several qualities while
 * its canvas exists (one page in memory at a time), then the highest uniform quality that fits wins.
 * If nothing fits at this DPI, the next lower DPI is tried.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { canvasToJpeg, openPdf, releaseCanvas, renderPage } from './pdfjs';
import { pdfOp } from './run';

export const DPI_PRESETS = [
  { id: 'high', label: 'High (150 DPI)', dpi: 150 },
  { id: 'medium', label: 'Medium (110 DPI)', dpi: 110 },
  { id: 'low', label: 'Low (72 DPI)', dpi: 72 },
] as const;

const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15];
const FALLBACK_DPIS = [150, 110, 72, 50];

export interface StrongOptions {
  dpi: number;
  /** 0–1; ignored when targetBytes is set. */
  quality: number;
  targetBytes?: number;
}

export interface StrongResult {
  bytes: Uint8Array;
  dpi: number;
  quality: number;
  reachedTarget: boolean;
}

type Progress = (done: number, total: number, label: string) => void;

async function renderAll(
  doc: PDFDocumentProxy,
  dpi: number,
  qualities: number[],
  onProgress: Progress,
): Promise<{ widthPt: number; heightPt: number; jpegs: Blob[] }[]> {
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    onProgress(n - 1, doc.numPages, `Rendering page ${n} of ${doc.numPages} at ${dpi} DPI`);
    const { canvas, widthPt, heightPt } = await renderPage(doc, n, dpi / 72);
    const jpegs: Blob[] = [];
    for (const q of qualities) jpegs.push(await canvasToJpeg(canvas, q));
    releaseCanvas(canvas);
    pages.push({ widthPt, heightPt, jpegs });
  }
  return pages;
}

async function assemble(pages: { widthPt: number; heightPt: number; jpegs: Blob[] }[], qi: number, onProgress: Progress) {
  const input = await Promise.all(
    pages.map(async (p) => ({ bytes: await p.jpegs[qi]!.arrayBuffer(), widthPt: p.widthPt, heightPt: p.heightPt })),
  );
  return (await pdfOp({ op: 'assemble-jpegs', pages: input }, (d, t, l) => onProgress(d, t, l ?? 'Building PDF'))).bytes;
}

export async function strongCompress(file: File, opts: StrongOptions, onProgress: Progress): Promise<StrongResult> {
  const doc = await openPdf(await file.arrayBuffer());
  try {
    if (!opts.targetBytes) {
      const pages = await renderAll(doc, opts.dpi, [opts.quality], onProgress);
      return { bytes: await assemble(pages, 0, onProgress), dpi: opts.dpi, quality: opts.quality, reachedTarget: true };
    }

    const target = opts.targetBytes;
    const dpis = [opts.dpi, ...FALLBACK_DPIS.filter((d) => d < opts.dpi)];
    let smallest: StrongResult | null = null;
    for (const dpi of dpis) {
      const pages = await renderAll(doc, dpi, QUALITY_STEPS, onProgress);
      const overhead = 1500 + pages.length * 400; // PDF structure per page, measured roughly
      for (let qi = 0; qi < QUALITY_STEPS.length; qi++) {
        const estimate = pages.reduce((s, p) => s + p.jpegs[qi]!.size, 0) + overhead;
        const isLast = qi === QUALITY_STEPS.length - 1;
        if (estimate > target && !isLast) continue;
        const bytes = await assemble(pages, qi, onProgress);
        const result = { bytes, dpi, quality: QUALITY_STEPS[qi]!, reachedTarget: bytes.length <= target };
        if (result.reachedTarget) return result;
        if (!smallest || bytes.length < smallest.bytes.length) smallest = result;
        if (isLast) break;
      }
    }
    return smallest!;
  } finally {
    await doc.loadingTask.destroy();
  }
}
