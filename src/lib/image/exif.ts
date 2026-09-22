/**
 * Minimal JPEG EXIF handling for "Keep metadata": copy the EXIF (APP1) segment from the
 * original JPEG into the new one. Pixels are already rotated upright when decoded, so the
 * Orientation tag is reset to 1 to avoid a double rotation.
 */

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8;

/** Returns a copy of the EXIF APP1 segment (marker included) with Orientation set to 1, or null. */
export function extractExif(bytes: Uint8Array): Uint8Array | null {
  if (!isJpeg(bytes)) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    if (marker === 0xda || marker === 0xd9) return null; // start of scan / end of image
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (marker === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 && bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66) {
      const segment = bytes.slice(i, i + 2 + len);
      resetOrientation(segment);
      return segment;
    }
    i += 2 + len;
  }
  return null;
}

/** Find tag 0x0112 in IFD0 and set it to 1 (top-left). Safe no-op on unexpected data. */
function resetOrientation(seg: Uint8Array): void {
  const tiff = 10; // FF E1 len(2) "Exif\0\0"
  if (seg.length < tiff + 8) return;
  const little = seg[tiff] === 0x49; // "II"
  const view = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  try {
    const ifd0 = tiff + u32(tiff + 4);
    const count = u16(ifd0);
    for (let k = 0; k < count; k++) {
      const entry = ifd0 + 2 + k * 12;
      if (u16(entry) === 0x0112) {
        view.setUint16(entry + 8, 1, little);
        return;
      }
    }
  } catch {
    /* malformed EXIF: leave as is */
  }
}

/** Insert an APP1 segment right after SOI of a JPEG blob. */
export async function insertExif(jpeg: Blob, exif: Uint8Array): Promise<Blob> {
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  if (!isJpeg(bytes)) return jpeg;
  // Skip an existing JFIF APP0 so APP1 follows it, as most readers expect.
  let at = 2;
  if (bytes[2] === 0xff && bytes[3] === 0xe0) at = 4 + ((bytes[4]! << 8) | bytes[5]!);
  return new Blob([bytes.slice(0, at), exif as BlobPart, bytes.slice(at)] as BlobPart[], { type: 'image/jpeg' });
}

/**
 * Set the print resolution in a JPEG's JFIF header (APP0), so it prints at the intended
 * physical size. Returns the blob unchanged if there is no JFIF header.
 */
export async function setJpegDpi(jpeg: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  const isJfif =
    isJpeg(bytes) && bytes[2] === 0xff && bytes[3] === 0xe0 &&
    bytes[6] === 0x4a && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46 && bytes[10] === 0x00;
  if (!isJfif) return jpeg;
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  bytes[13] = 1; // units: dots per inch
  bytes[14] = d >> 8;
  bytes[15] = d & 255;
  bytes[16] = d >> 8;
  bytes[17] = d & 255;
  return new Blob([bytes], { type: 'image/jpeg' });
}

/** EXIF Orientation of a JPEG (1–8), or 1 when absent or unreadable. */
export function jpegOrientation(bytes: Uint8Array): number {
  const seg = extractExifRaw(bytes);
  if (!seg) return 1;
  const tiff = 10;
  const little = seg[tiff] === 0x49;
  const view = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  try {
    const ifd0 = tiff + view.getUint32(tiff + 4, little);
    const count = view.getUint16(ifd0, little);
    for (let k = 0; k < count; k++) {
      const entry = ifd0 + 2 + k * 12;
      if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little) || 1;
    }
  } catch {
    /* malformed */
  }
  return 1;
}

/** The EXIF APP1 segment as-is (no changes), or null. */
function extractExifRaw(bytes: Uint8Array): Uint8Array | null {
  if (!isJpeg(bytes)) return null;
  let i = 2;
  while (i + 10 <= bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1]!;
    if (marker === 0xda || marker === 0xd9) return null;
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (marker === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78) return bytes.subarray(i, i + 2 + len);
    i += 2 + len;
  }
  return null;
}
