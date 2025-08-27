import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { byChars } from '../chunk';
import type { Chunk } from '../index';
import { discoverFiles, filterPaths } from './file-discovery';

const ingestFilesSchema = z
  .object({
    pipeline: z.custom<{
      ingest: (...args: unknown[]) => Promise<void>;
    }>((p) => typeof p === 'object' && p !== null && typeof (p as any).ingest === 'function'),
    files: z.array(z.string()).default([]),
    root: z.string().optional(),
    include: z.array(z.string()).default(['**/*']),
    exclude: z.array(z.string()).default([]),
    includePriority: z.boolean().default(false),
    chunkSize: z.number().int().positive().default(300),
    overlap: z.number().int().nonnegative().default(0),
    concurrency: z.number().int().positive().max(10).default(4),
  })
  .refine((v) => v.files.length > 0 || v.root, {
    message: 'files or root is required',
    path: ['files'],
  });

export type IngestFilesParams = z.infer<typeof ingestFilesSchema>;

/**
 * Ingest multiple files concurrently using the provided RAG pipeline.
 * Inspired by batch processing in the RAG-Anything project.
 */
export async function ingestFiles(params: IngestFilesParams): Promise<void> {
  const {
    pipeline,
    files,
    root,
    include,
    exclude,
    includePriority,
    chunkSize,
    overlap,
    concurrency,
  } = ingestFilesSchema.parse(params);

  let fileList = files;
  if (root) {
    const discovered = await discoverFiles({ root, include, exclude, includePriority });
    fileList = fileList.concat(discovered);
  }

  fileList = filterPaths({
    paths: fileList.map((f) => path.resolve(f)),
    include,
    exclude,
    includePriority,
    cwd: root ? path.resolve(root) : undefined,
  });

  const uniqueFiles = Array.from(new Set(fileList));
  const queue = [...uniqueFiles];
  const workers: Promise<void>[] = [];

  async function worker() {
    while (queue.length) {
      const file = queue.shift();
      if (!file) break;
      const text = await fs.readFile(file, 'utf8');
      const chunks: Chunk[] = byChars(text, chunkSize, overlap).map((t, i) => ({
        id: `${path.basename(file)}#${i}`,
        text: t,
        source: file,
      }));
      await (pipeline as any).ingest(chunks);
    }
  }

  const workerCount = Math.min(concurrency, uniqueFiles.length);
  for (let i = 0; i < workerCount; i++) workers.push(worker());
  await Promise.all(workers);
}
