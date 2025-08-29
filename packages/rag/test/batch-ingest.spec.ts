import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RAGPipeline, type Pipeline } from '../src/index';
import { memoryStore } from '../src/store/memory';
import { ingestFiles } from '../src/pipeline/batch-ingest';
import type { Embedder } from '../src/index';

const embedder: Embedder = {
  async embed(texts) {
    return texts.map((t) => [t.length]);
  },
};

describe('ingestFiles', () => {
  it('ingests multiple files', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'rag-batch-'));
    const file1 = join(dir, 'a.txt');
    const file2 = join(dir, 'b.txt');
    await fs.writeFile(file1, 'hello');
    await fs.writeFile(file2, 'world!');

    const pipeline: Pipeline = new RAGPipeline({ embedder, store: memoryStore() });
    await ingestFiles({ pipeline, files: [file1, file2], concurrency: 2 });

    const results = await pipeline.retrieve('query', 5);
    expect(results.length).toBe(2);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
