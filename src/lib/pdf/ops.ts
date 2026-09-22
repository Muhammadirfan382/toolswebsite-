/**
 * PDF writing with pdf-lib. Environment-agnostic, so it runs in a Web Worker
 * (see pdf.worker.ts) or on the main thread as a fallback.
 */
import type { ProgressFn } from '../worker-utils';

type PdfLib = typeof import('pdf-lib');
let lib: Promise<PdfLib> | null = null;
const loadPdfLib = () => (lib ??= import('pdf-lib'));

export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
} as const;
export const MARGINS = { none: 0, small: 18, large: 54 } as const; // points (0, 0.25 in, 0.75 in)

export type PdfOp =
  | { op: 'merge'; files: { name: string; bytes: ArrayBuffer; pages: number[] }[] }
  | { op: 'basic-compress'; name: string; bytes: ArrayBuffer }
  | {
      op: 'images-to-pdf';
      images: { bytes: ArrayBuffer; type: 'jpg' | 'png' }[];
      pageSize: keyof typeof PAGE_SIZES | 'fit';
      orientation: 'auto' | 'portrait' | 'landscape';
      margin: keyof typeof MARGINS;
    }
  | { op: 'assemble-jpegs'; pages: { bytes: ArrayBuffer; widthPt: number; heightPt: number }[] };

export interface PdfOpResult {
  bytes: Uint8Array;
  /** Extra info, e.g. which basic-compress method won. */
  note?: string;
}

async function load(PDFDocument: PdfLib['PDFDocument'], bytes: ArrayBuffer, name: string) {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Keep the file name so the page can show a specific message.
    throw new Error(`${/encrypt/i.test(msg) ? 'encrypted' : 'invalid pdf'}: ${name}: ${msg}`);
  }
}

export async function runPdfOp(req: PdfOp, onProgress: ProgressFn = () => {}): Promise<PdfOpResult> {
  const { PDFDocument } = await loadPdfLib();

  if (req.op === 'merge') {
    const out = await PDFDocument.create();
    const total = req.files.reduce((s, f) => s + f.pages.length, 0);
    let done = 0;
    for (const f of req.files) {
      const src = await load(PDFDocument, f.bytes, f.name);
      const copied = await out.copyPages(src, f.pages);
      for (const page of copied) {
        out.addPage(page);
        onProgress(++done, total, `Adding page ${done} of ${total}`);
      }
    }
    return { bytes: await out.save({ useObjectStreams: true }) };
  }

  if (req.op === 'basic-compress') {
    const original = req.bytes.byteLength;
    onProgress(0, 2, 'Re-saving with object streams');
    const doc = await load(PDFDocument, req.bytes, req.name);
    const resaved = await doc.save({ useObjectStreams: true });
    onProgress(1, 2, 'Removing unused objects');
    // Copying pages into a new document leaves behind objects nothing refers to.
    const fresh = await PDFDocument.create();
    const pages = await fresh.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => fresh.addPage(p));
    const rebuilt = await fresh.save({ useObjectStreams: true });
    onProgress(2, 2, 'Done');
    // The rebuilt copy can drop bookmarks and form fields, so prefer the re-save unless the
    // rebuild is clearly smaller (at least 5%).
    const useRebuilt = rebuilt.length < resaved.length * 0.95;
    const best = useRebuilt ? rebuilt : resaved;
    if (best.length >= original) {
      return { bytes: new Uint8Array(req.bytes), note: 'already-optimized' };
    }
    return { bytes: best, note: useRebuilt ? 'rebuilt' : 'resaved' };
  }

  if (req.op === 'images-to-pdf') {
    const out = await PDFDocument.create();
    for (const [i, img] of req.images.entries()) {
      const embedded = img.type === 'jpg' ? await out.embedJpg(img.bytes) : await out.embedPng(img.bytes);
      const margin = MARGINS[req.margin];
      let pageW: number;
      let pageH: number;
      if (req.pageSize === 'fit') {
        // 1 image pixel = 0.75 pt (96 DPI), plus margins.
        pageW = embedded.width * 0.75 + margin * 2;
        pageH = embedded.height * 0.75 + margin * 2;
      } else {
        const [w, h] = PAGE_SIZES[req.pageSize];
        const landscape =
          req.orientation === 'landscape' || (req.orientation === 'auto' && embedded.width > embedded.height);
        [pageW, pageH] = landscape ? [h, w] : [w, h];
      }
      const page = out.addPage([pageW, pageH]);
      const boxW = pageW - margin * 2;
      const boxH = pageH - margin * 2;
      const scale = Math.min(boxW / embedded.width, boxH / embedded.height);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      page.drawImage(embedded, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
      onProgress(i + 1, req.images.length, `Adding image ${i + 1} of ${req.images.length}`);
    }
    return { bytes: await out.save({ useObjectStreams: true }) };
  }

  // assemble-jpegs: rebuild a document from page images (strong compression).
  const out = await PDFDocument.create();
  for (const [i, p] of req.pages.entries()) {
    const img = await out.embedJpg(p.bytes);
    const page = out.addPage([p.widthPt, p.heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
    onProgress(i + 1, req.pages.length, `Building page ${i + 1} of ${req.pages.length}`);
  }
  return { bytes: await out.save({ useObjectStreams: true }) };
}
