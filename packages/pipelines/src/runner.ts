import { Worker } from 'node:worker_threads';
import { PipelineManifest } from './manifest.js';
import { isAllowed } from './allowlist.js';

export async function runPipeline(manifest: unknown, input: unknown, timeoutMs = 30000): Promise<unknown> {
  const parsed = PipelineManifest.parse(manifest);
  if (!isAllowed(parsed.id)) {
    throw new Error(`Pipeline ${parsed.id} not allowed`);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(parsed.entry, { workerData: input });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Pipeline timed out'));
    }, timeoutMs);
    worker.on('message', (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
