import { exposeWorker } from '../worker-utils';
import { processImage } from './core';

exposeWorker(processImage);
