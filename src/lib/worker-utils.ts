/**
 * Run heavy work in a Web Worker so the page stays responsive, with a main-thread fallback.
 *
 * Page side:
 *   const out = await runTask({
 *     createWorker: () => new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' }),
 *     fallback: (input, onProgress) => doWork(input, onProgress),
 *     input, onProgress: (done, total) => progress.set(done, total),
 *   });
 *
 * Worker side (x.worker.ts):
 *   import { exposeWorker } from './worker-utils';
 *   exposeWorker(doWork);
 */

export type ProgressFn = (done: number, total: number, label?: string) => void;
export type TaskHandler<TIn, TOut> = (input: TIn, onProgress: ProgressFn) => Promise<TOut> | TOut;

export type WorkerMessage<TOut> =
  | { type: 'progress'; done: number; total: number; label?: string }
  | { type: 'result'; result: TOut }
  | { type: 'error'; message: string };

interface WorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent) => void) | null;
}

/** Call inside a worker module to serve one handler. */
export function exposeWorker<TIn, TOut>(
  handler: TaskHandler<TIn, TOut>,
  getTransfer?: (result: TOut) => Transferable[],
): void {
  const scope = globalThis as unknown as WorkerScope;
  scope.onmessage = async (event: MessageEvent) => {
    const post = (msg: WorkerMessage<TOut>, transfer: Transferable[] = []) =>
      scope.postMessage(msg, transfer);
    try {
      const result = await handler(event.data as TIn, (done, total, label) =>
        post({ type: 'progress', done, total, label }),
      );
      post({ type: 'result', result }, getTransfer?.(result) ?? []);
    } catch (err) {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };
}

export interface RunTaskOptions<TIn, TOut> {
  /** Omit to always run on the main thread. */
  createWorker?: () => Worker;
  /** Same work, run on the main thread when workers are unavailable or fail to start. */
  fallback: TaskHandler<TIn, TOut>;
  input: TIn;
  transfer?: Transferable[];
  onProgress?: ProgressFn;
  signal?: AbortSignal;
}

export function workersSupported(): boolean {
  return typeof Worker !== 'undefined';
}

export async function runTask<TIn, TOut>(opts: RunTaskOptions<TIn, TOut>): Promise<TOut> {
  const { createWorker, fallback, input, transfer = [], onProgress = () => {}, signal } = opts;
  signal?.throwIfAborted();

  let worker: Worker | undefined;
  if (createWorker && workersSupported()) {
    try {
      worker = createWorker();
    } catch {
      worker = undefined; // e.g. module workers unsupported → fall back below
    }
  }
  if (!worker) return fallback(input, onProgress);

  const w = worker;
  return new Promise<TOut>((resolve, reject) => {
    let started = false;
    const cleanup = () => {
      w.terminate();
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    w.onmessage = (event: MessageEvent<WorkerMessage<TOut>>) => {
      started = true;
      const msg = event.data;
      if (msg.type === 'progress') onProgress(msg.done, msg.total, msg.label);
      else if (msg.type === 'result') {
        cleanup();
        resolve(msg.result);
      } else {
        cleanup();
        reject(new Error(msg.message));
      }
    };
    w.onerror = (event) => {
      event.preventDefault();
      cleanup();
      if (!started) {
        // The worker script itself failed to load: do the work on the main thread instead.
        Promise.resolve(fallback(input, onProgress)).then(resolve, reject);
      } else {
        reject(new Error(event.message || 'The background task stopped unexpectedly.'));
      }
    };
    w.postMessage(input, transfer);
  });
}
