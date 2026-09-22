/** Demo task for /dev/components: CRC-32 of files, read in chunks so progress can be reported. */
import type { ProgressFn } from '../worker-utils';

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const CHUNK = 256 * 1024;

export async function checksumFiles(
  files: File[],
  onProgress: ProgressFn,
): Promise<{ name: string; crc: string }[]> {
  const total = files.reduce((s, f) => s + f.size, 0);
  let done = 0;
  const out: { name: string; crc: string }[] = [];
  for (const file of files) {
    let crc = 0xffffffff;
    for (let offset = 0; offset < file.size; offset += CHUNK) {
      const bytes = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
      for (const b of bytes) crc = (TABLE[(crc ^ b) & 0xff] as number) ^ (crc >>> 8);
      done += bytes.length;
      onProgress(done, total, `Reading ${file.name}`);
    }
    out.push({ name: file.name, crc: ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0') });
  }
  return out;
}
