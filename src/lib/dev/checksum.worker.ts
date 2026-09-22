import { exposeWorker } from '../worker-utils';
import { checksumFiles } from './checksum';

exposeWorker(checksumFiles);
