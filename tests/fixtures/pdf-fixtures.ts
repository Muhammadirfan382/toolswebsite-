/** PDF test files, generated with pdf-lib (no downloads). */
import { writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function textPdf(pages: number, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595.28, 841.89]); // A4
    page.drawText(`${label} page ${i}`, { x: 72, y: 760, size: 28, font, color: rgb(0.1, 0.1, 0.1) });
  }
  return doc.save();
}

/** A "scanned" document: each page is one big photo. */
async function scanPdf(jpeg: Uint8Array, pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(jpeg);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  return doc.save();
}

/** A minimal PDF with a Standard security handler, so readers ask for a password. */
function encryptedPdf(): Uint8Array {
  const hex = (n: number, seed: number) =>
    Array.from({ length: n }, (_, i) => ((i * 37 + seed) % 256).toString(16).padStart(2, '0')).join('');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
    `<< /Filter /Standard /V 1 /R 2 /O <${hex(32, 7)}> /U <${hex(32, 99)}> /P -4 >>`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Encrypt 4 0 R /ID [<${hex(16, 1)}> <${hex(16, 1)}>] >>\n`;
  out += `startxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

export async function generatePdfs(dir: string, _smallJpeg: Uint8Array, photoJpeg: Uint8Array): Promise<void> {
  await writeFile(`${dir}three-pages.pdf`, await textPdf(3, 'Alpha'));
  await writeFile(`${dir}two-pages.pdf`, await textPdf(2, 'Beta'));
  await writeFile(`${dir}scan.pdf`, await scanPdf(photoJpeg, 2));
  await writeFile(`${dir}encrypted.pdf`, encryptedPdf());
  await writeFile(`${dir}corrupt.pdf`, new TextEncoder().encode('%PDF-1.7\nthis file is broken'));
}
