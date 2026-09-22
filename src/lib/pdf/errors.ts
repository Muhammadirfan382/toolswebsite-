/** Turn pdf.js / pdf-lib errors into specific, actionable messages. */
export function pdfErrorMessage(err: unknown, fileName: string): string {
  const name = err instanceof Error ? err.name : '';
  const msg = err instanceof Error ? err.message : String(err);
  if (name === 'PasswordException' || /encrypt|password/i.test(msg)) {
    return `"${fileName}" is password-protected. Remove the password first, then try again.`;
  }
  if (name === 'InvalidPDFException' || /invalid pdf|no pdf header|failed to parse|expected/i.test(msg)) {
    return `"${fileName}" could not be opened. It may be damaged or not really a PDF.`;
  }
  if (/memory|allocation|array buffer/i.test(msg)) {
    return `"${fileName}" is too large for your device to process. Close other tabs or try a smaller file.`;
  }
  return `"${fileName}" could not be processed (${msg}).`;
}
