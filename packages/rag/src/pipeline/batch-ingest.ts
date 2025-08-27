import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { byChars } from '../chunk';
import type { Chunk } from '../index';

const ingestFilesSchema = z.object({
  pipeline: z.custom<{
    ingest: (...args: unknown[]) => Promise<void>;
  }>((p) => typeof p === 'object' && p !== null && typeof (p as any).ingest === 'function'),
  files: z.array(z.string().min(1)),
  chunkSize: z.number().int().positive().default(300),
  overlap: z.number().int().nonnegative().default(0),
  concurrency: z.number().int().positive().max(10).default(4),
});

export type IngestFilesParams = z.infer<typeof ingestFilesSchema>;

/**
 * Ingest multiple files concurrently using the provided RAG pipeline.
 * Inspired by batch processing in the RAG-Anything project.
 */
export async function ingestFiles(params: IngestFilesParams): Promise<void> {
  const { pipeline, files, chunkSize, overlap, concurrency } = ingestFilesSchema.parse(params);

  const queue = [...files];
  const workers: Promise<void>[] = [];

  async function worker() {
    while (queue.length) {
      const file = queue.shift()!;
      const text = await fs.readFile(file, 'utf8');
      const chunks: Chunk[] = byChars(text, chunkSize, overlap).map((t, i) => ({
        id: `${path.basename(file)}#${i}`,
        text: t,
        source: file,
      }));
      await (pipeline as any).ingest(chunks);
    }
  }

  const workerCount = Math.min(concurrency, files.length);
  for (let i = 0; i < workerCount; i++) workers.push(worker());
  await Promise.all(workers);
}
