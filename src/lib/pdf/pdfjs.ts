/**
 * pdf.js loader and page rendering (main thread; pdf.js parses in its own worker).
 * The library, its worker and its assets all come from this site, never a CDN,
 * and are loaded only when the user picks a file.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfJs = typeof import('pdfjs-dist');
let loading: Promise<PdfJs> | null = null;

export function loadPdfjs(): Promise<PdfJs> {
  return (loading ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  }).catch((err) => {
    loading = null;
    throw new Error(`engine unavailable: ${err instanceof Error ? err.message : err}`);
  }));
}

type PdfWorker = InstanceType<PdfJs['PDFWorker']>;
let sharedWorker: PdfWorker | null = null;

export async function openPdf(data: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const lib = await loadPdfjs();
  // One pdf.js worker for the whole visit: it is started when the first file is opened, so later
  // documents (e.g. converting after a preview) do not need the network again.
  sharedWorker ??= new lib.PDFWorker();
  const assetBase = document.querySelector<HTMLMetaElement>('meta[name="asset-base"]')?.content ?? '/';
  const base = new URL(`${assetBase}pdfjs/`, location.href).href;
  return lib.getDocument({
    worker: sharedWorker,
    // pdf.js may transfer the buffer to its worker, so give it a copy.
    data: new Uint8Array(data).slice(),
    cMapUrl: `${base}cmaps/`,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`,
    enableXfa: false,
  }).promise;
}

/**
 * Render one page (1-based) to a canvas. `scale` 1 = 72 DPI.
 * The caller should release the canvas (width = 0) when done, to free memory on phones.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<{ canvas: HTMLCanvasElement; widthPt: number; heightPt: number }> {
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    // Keep canvases within limits phones can handle (about 16.7 megapixels).
    const maxScale = Math.sqrt(16_000_000 / (base.width * base.height));
    const viewport = page.getViewport({ scale: Math.min(scale, maxScale) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return { canvas, widthPt: base.width, heightPt: base.height };
  } finally {
    page.cleanup();
  }
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image. Try a lower DPI.'))), 'image/jpeg', quality),
  );
}

export const releaseCanvas = (c: HTMLCanvasElement) => {
  c.width = 0;
  c.height = 0;
};

/** Small PNG data URL of page 1, for file-list thumbnails. */
export async function firstPageThumbnail(doc: PDFDocumentProxy, widthPx = 96): Promise<string> {
  const page = await doc.getPage(1);
  const scale = widthPx / page.getViewport({ scale: 1 }).width;
  page.cleanup();
  const { canvas } = await renderPage(doc, 1, scale);
  const url = canvas.toDataURL('image/png');
  releaseCanvas(canvas);
  return url;
}
