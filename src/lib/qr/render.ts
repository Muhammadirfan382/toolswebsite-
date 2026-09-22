/**
 * Draw QR codes on a canvas and as SVG. The `qrcode` package is loaded on first use only.
 * We draw modules ourselves so colors, margin and a centre logo are fully under our control.
 */

export type ErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  size: number;
  get(row: number, col: number): boolean;
}

export interface QrOptions {
  sizePx: number;
  /** Quiet zone in modules. */
  margin: number;
  foreground: string;
  background: string;
  level: ErrorLevel;
  logo?: HTMLImageElement | ImageBitmap | null;
  /** Logo width as a fraction of the whole image (max 0.2). */
  logoScale?: number;
}

type QrLib = typeof import('qrcode');
let lib: Promise<QrLib> | null = null;
const loadLib = () => (lib ??= import('qrcode').then((m) => ((m as unknown as { default?: QrLib }).default ?? m)));

export class QrTooLongError extends Error {}

export async function makeMatrix(text: string, level: ErrorLevel): Promise<QrMatrix> {
  const QR = await loadLib();
  try {
    const qr = QR.create(text, { errorCorrectionLevel: level });
    const { size, data } = qr.modules;
    return { size, get: (r, c) => data[r * size + c] === 1 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/too big|amount of data/i.test(msg)) {
      throw new QrTooLongError(
        `This is too much content for one QR code at error correction ${level}. Shorten the text${level !== 'L' ? ' or choose a lower error correction level' : ''}.`,
      );
    }
    throw err;
  }
}

/** Pixel edges for module i, so neighboring modules meet exactly (no hairline gaps). */
const edge = (i: number, total: number, px: number) => Math.round((i * px) / total);

export function drawToCanvas(canvas: HTMLCanvasElement, m: QrMatrix, o: QrOptions): void {
  const px = o.sizePx;
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = o.foreground;
  const total = m.size + o.margin * 2;
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.get(r, c)) continue;
      const x0 = edge(c + o.margin, total, px);
      const y0 = edge(r + o.margin, total, px);
      ctx.fillRect(x0, y0, edge(c + o.margin + 1, total, px) - x0, edge(r + o.margin + 1, total, px) - y0);
    }
  }
  if (o.logo) {
    const { x, y, w, h, pad } = logoBox(o, px);
    ctx.fillStyle = o.background;
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
    ctx.drawImage(o.logo, x, y, w, h);
  }
}

/** Centered logo box inside a square of side `px`. Round to whole pixels for canvas output. */
function logoBox(o: QrOptions, px: number, round = true) {
  const r = (n: number) => (round ? Math.round(n) : +n.toFixed(3));
  const scale = Math.min(0.2, o.logoScale ?? 0.2);
  const logo = o.logo!;
  const lw = 'naturalWidth' in logo ? logo.naturalWidth : logo.width;
  const lh = 'naturalHeight' in logo ? logo.naturalHeight : logo.height;
  const box = px * scale;
  const ratio = lw / lh;
  const w = r(ratio >= 1 ? box : box * ratio);
  const h = r(ratio >= 1 ? box / ratio : box);
  return { x: r((px - w) / 2), y: r((px - h) / 2), w, h, pad: r(px * 0.01) };
}

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** SVG with one path for all modules. A logo is embedded as a data URL image. */
export function toSvg(m: QrMatrix, o: QrOptions, logoDataUrl?: string): string {
  const total = m.size + o.margin * 2;
  let d = '';
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.get(r, c)) d += `M${c + o.margin} ${r + o.margin}h1v1h-1z`;
    }
  }
  let logo = '';
  if (o.logo && logoDataUrl) {
    const { x, y, w, h, pad } = logoBox(o, total, false);
    logo =
      `<rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" fill="${escAttr(o.background)}"/>` +
      `<image href="${escAttr(logoDataUrl)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${o.sizePx}" height="${o.sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${escAttr(o.background)}"/>` +
    `<path d="${d}" fill="${escAttr(o.foreground)}"/>` +
    logo +
    `</svg>`
  );
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image file.'))), type, quality),
  );
}
