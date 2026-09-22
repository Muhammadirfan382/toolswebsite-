import { exposeWorker } from '../worker-utils';
import { runPdfOp } from './ops';

exposeWorker(runPdfOp, (result) => [result.bytes.buffer as ArrayBuffer]);
