/** Run image jobs in a worker when OffscreenCanvas is available, otherwise on the main thread. */
import { runTask, type ProgressFn } from '../worker-utils';
import { processImage, ImageError, type ImageJob, type ImageResult } from './core';

const workerCanDraw = () => typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined';

export function runImageJob(job: ImageJob, onProgress?: ProgressFn): Promise<ImageResult> {
  return runTask({
    createWorker: workerCanDraw()
      ? () => new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
      : undefined,
    fallback: processImage,
    input: job,
    onProgress,
  });
}

/** Turn any thrown error into a message a person can act on. */
export function imageErrorMessage(err: unknown, file: File): string {
  if (err instanceof ImageError) return err.message;
  const msg = err instanceof Error ? err.message : String(err);
  if (/could not be opened|not really/.test(msg)) return msg;
  if (/memory|allocation|too large/i.test(msg)) {
    return `"${file.name}" is too large for your device to process. Close other tabs or try a smaller image.`;
  }
  return `"${file.name}" could not be processed. The file may be damaged. (${msg})`;
}

export interface BatchOutcome {
  results: { file: File; result: ImageResult }[];
  errors: string[];
}

/** Process files one at a time (keeps memory low on phones), reporting overall progress. */
export async function runBatch(
  files: File[],
  makeJob: (file: File) => ImageJob,
  onProgress: (done: number, total: number, label: string) => void,
): Promise<BatchOutcome> {
  const results: BatchOutcome['results'] = [];
  const errors: string[] = [];
  for (const [i, file] of files.entries()) {
    onProgress(i, files.length, `Image ${i + 1} of ${files.length}: ${file.name}`);
    try {
      results.push({ file, result: await runImageJob(makeJob(file)) });
    } catch (err) {
      errors.push(imageErrorMessage(err, file));
    }
  }
  onProgress(files.length, files.length, 'Done');
  return { results, errors };
}
