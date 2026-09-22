/**
 * Image processing that runs in a Web Worker (OffscreenCanvas) or on the main thread.
 * Decoding uses createImageBitmap with EXIF orientation applied, so photos stay upright.
 * Re-encoding through a canvas drops metadata (location, camera) unless "keep metadata" is on.
 */
import { extractExif, insertExif, setJpegDpi } from './exif';
import type { ProgressFn } from '../worker-utils';

export type OutputType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Conservative limits that work on iPhone Safari as well as desktop browsers. */
export const MAX_CANVAS_PIXELS = 16_777_216; // 4096 × 4096
export const MAX_CANVAS_SIDE = 16_384;

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageJob {
  file: File;
  /** 'original' keeps JPG/PNG/WebP as it is. */
  type: OutputType | 'original';
  /** 0–1, for JPG and WebP. */
  quality: number;
  /** Fill for transparent areas when the output is JPG, and for "fit with padding". */
  background: string;
  resize?: {
    width: number;
    height: number;
    /** stretch = exact size; crop = cut to fill (uses `crop` or center); pad = fit inside with background. */
    fit: 'stretch' | 'crop' | 'pad';
    /** Source rectangle in pixels of the upright image. */
    crop?: CropRect;
  };
  /** Aim for at most this many bytes (binary search on quality, then smaller dimensions). */
  targetBytes?: number;
  keepMetadata?: boolean;
  /** Print resolution to record in the file (JPG only). */
  dpi?: number;
}

export interface ImageResult {
  blob: Blob;
  width: number;
  height: number;
  type: OutputType;
  /** Quality actually used (lossy formats). */
  quality?: number;
  notes: string[];
  /** True when something did not go as asked (target not reached, format changed…). */
  warn: boolean;
}

export class ImageError extends Error {}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function encode(canvas: AnyCanvas, type: OutputType, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new ImageError('The browser could not create the image file. Try a smaller image.'))),
      type,
      quality,
    ),
  );
}

export function typeOf(file: File): OutputType | null {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (t === 'image/jpeg' || /\.jpe?g$/.test(n)) return 'image/jpeg';
  if (t === 'image/png' || /\.png$/.test(n)) return 'image/png';
  if (t === 'image/webp' || /\.webp$/.test(n)) return 'image/webp';
  return null;
}

export const extensionFor = (t: OutputType) => (t === 'image/jpeg' ? 'jpg' : t === 'image/png' ? 'png' : 'webp');

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    /* older browsers may reject the options; try the fallbacks below */
  }
  try {
    return await createImageBitmap(file);
  } catch {
    /* fall through */
  }
  // Main thread only: an <img> element applies EXIF orientation in current browsers.
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } catch {
      /* fall through to the error */
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  throw new ImageError(
    `"${file.name}" could not be opened. The file may be damaged, or it is not really a JPG, PNG or WebP image.`,
  );
}

/** Scale (w, h) down to fit the canvas limits. */
export function fitCanvasLimits(w: number, h: number): { w: number; h: number; scaled: boolean } {
  let scale = 1;
  if (w * h > MAX_CANVAS_PIXELS) scale = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
  if (Math.max(w, h) * scale > MAX_CANVAS_SIDE) scale = MAX_CANVAS_SIDE / Math.max(w, h);
  if (scale >= 1) return { w, h, scaled: false };
  return { w: Math.max(1, Math.floor(w * scale)), h: Math.max(1, Math.floor(h * scale)), scaled: true };
}

/** Where to draw the source image for the requested fit. */
export function layout(
  srcW: number,
  srcH: number,
  outW: number,
  outH: number,
  fit: 'stretch' | 'crop' | 'pad',
  crop?: CropRect,
): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
  if (fit === 'stretch') return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: outW, dh: outH };
  if (fit === 'pad') {
    const s = Math.min(outW / srcW, outH / srcH);
    const dw = Math.round(srcW * s);
    const dh = Math.round(srcH * s);
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: Math.round((outW - dw) / 2), dy: Math.round((outH - dh) / 2), dw, dh };
  }
  if (crop) return { sx: crop.x, sy: crop.y, sw: crop.w, sh: crop.h, dx: 0, dy: 0, dw: outW, dh: outH };
  // Center crop to the output aspect ratio.
  const target = outW / outH;
  let sw = srcW;
  let sh = srcH;
  if (srcW / srcH > target) sw = srcH * target;
  else sh = srcW / target;
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: 0, dy: 0, dw: outW, dh: outH };
}

function draw(bitmap: ImageBitmap, outW: number, outH: number, job: ImageJob, type: OutputType, scale = 1): AnyCanvas {
  const w = Math.max(1, Math.round(outW * scale));
  const h = Math.max(1, Math.round(outH * scale));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new ImageError('Your browser ran out of memory for this image. Close other tabs or try a smaller image.');
  const fit = job.resize?.fit ?? 'stretch';
  if (type === 'image/jpeg' || fit === 'pad') {
    ctx.fillStyle = job.background || '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const l = layout(bitmap.width, bitmap.height, w, h, fit, job.resize?.crop);
  ctx.drawImage(bitmap, l.sx, l.sy, l.sw, l.sh, l.dx, l.dy, l.dw, l.dh);
  return canvas;
}

const LOSSY = (t: OutputType) => t !== 'image/png';

export async function processImage(job: ImageJob, onProgress: ProgressFn = () => {}): Promise<ImageResult> {
  const inputType = typeOf(job.file);
  if (!inputType) throw new ImageError(`"${job.file.name}" is not a JPG, PNG or WebP image.`);
  const notes: string[] = [];
  let warn = false;
  let type: OutputType = job.type === 'original' ? inputType : job.type;

  onProgress(0, 3, 'Opening image');
  const bitmap = await decode(job.file);
  try {
    let outW = job.resize?.width ?? bitmap.width;
    let outH = job.resize?.height ?? bitmap.height;
    const limited = fitCanvasLimits(outW, outH);
    if (limited.scaled) {
      notes.push(
        `This image was too large for your device's browser (${outW} × ${outH} px), so it was reduced to ${limited.w} × ${limited.h} px.`,
      );
      warn = true;
      outW = limited.w;
      outH = limited.h;
    }

    onProgress(1, 3, 'Processing');
    let canvas = draw(bitmap, outW, outH, job, type);
    let quality = LOSSY(type) ? job.quality : undefined;
    let blob = await encode(canvas, type, job.quality);

    // Some browsers (e.g. Safari) cannot encode WebP and silently return PNG.
    if (blob.type !== type) {
      notes.push(`Your browser cannot save ${extensionFor(type).toUpperCase()} files, so this was saved as ${blob.type === 'image/png' ? 'PNG' : blob.type}.`);
      warn = true;
      type = (blob.type as OutputType) || 'image/png';
    }

    if (job.targetBytes && blob.size > job.targetBytes) {
      onProgress(2, 3, 'Finding the best quality for the target size');
      const r = await hitTarget(bitmap, outW, outH, job, type, job.targetBytes);
      canvas = r.canvas;
      blob = r.blob;
      quality = r.quality;
      if (r.scale < 1) {
        notes.push(`To reach the target size, the image was also reduced to ${r.width} × ${r.height} px.`);
      }
      if (blob.size > job.targetBytes) {
        notes.push(`Could not get below the target. The smallest result was ${Math.ceil(blob.size / 1024)} KB.`);
        warn = true;
      }
      outW = r.width;
      outH = r.height;
    }

    if (job.keepMetadata) {
      if (inputType === 'image/jpeg' && type === 'image/jpeg') {
        const exif = extractExif(new Uint8Array(await job.file.arrayBuffer()));
        if (exif) blob = await insertExif(blob, exif);
        else notes.push('The original photo had no metadata to keep.');
      } else {
        notes.push('Metadata can only be kept when both the original and the result are JPG.');
      }
    }

    if (job.dpi && type === 'image/jpeg') blob = await setJpegDpi(blob, job.dpi);

    onProgress(3, 3, 'Done');
    return { blob, width: outW, height: outH, type, quality, notes, warn };
  } finally {
    bitmap.close();
  }
}

async function hitTarget(
  bitmap: ImageBitmap,
  outW: number,
  outH: number,
  job: ImageJob,
  type: OutputType,
  target: number,
): Promise<{ blob: Blob; canvas: AnyCanvas; quality?: number; scale: number; width: number; height: number }> {
  let scale = 1;
  let best: { blob: Blob; canvas: AnyCanvas; quality?: number; scale: number } | null = null;
  for (let round = 0; round < 10; round++) {
    const canvas = draw(bitmap, outW, outH, job, type, scale);
    if (!LOSSY(type)) {
      const blob = await encode(canvas, type, 1);
      best = !best || blob.size < best.blob.size ? { blob, canvas, scale } : best;
      if (blob.size <= target) break;
      scale *= Math.max(0.3, Math.sqrt(target / blob.size) * 0.95);
    } else {
      // First try quality alone (down to 10). Once the size has to shrink, keep quality at 50 or
      // more: a slightly smaller image looks far better than a heavily compressed one.
      const floor = round === 0 ? 0.1 : 0.5;
      const lowest = await encode(canvas, type, floor);
      if (!best || lowest.size < best.blob.size) best = { blob: lowest, canvas, quality: floor, scale };
      if (lowest.size <= target) {
        // Highest quality that still fits (binary search, 7 steps).
        let lo = floor;
        let hi = 0.95;
        let fit = { blob: lowest, q: floor };
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2;
          const b = await encode(canvas, type, mid);
          if (b.size <= target) {
            fit = { blob: b, q: mid };
            lo = mid;
          } else hi = mid;
        }
        best = { blob: fit.blob, canvas, quality: Math.round(fit.q * 100) / 100, scale };
        break;
      }
      scale *= Math.max(0.3, Math.sqrt(target / lowest.size) * 0.95);
    }
    if (Math.min(outW, outH) * scale < 16) break;
  }
  const b = best!;
  return { ...b, width: Math.max(1, Math.round(outW * b.scale)), height: Math.max(1, Math.round(outH * b.scale)) };
}

/** Read an image's upright size without keeping it decoded. */
export async function readSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await decode(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
