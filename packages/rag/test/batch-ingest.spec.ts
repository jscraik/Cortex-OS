import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Chunk, Embedder } from '../src/index';
import { type Pipeline, RAGPipeline } from '../src/index';
import { createWorker, resolveFileList, runWorkers } from '../src/lib/batch-ingest';
import { ingestFiles } from '../src/pipeline/batch-ingest';
import { memoryStore } from '../src/store/memory';

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

		const pipeline: Pipeline = new RAGPipeline({
			embedder,
			store: memoryStore(),
		});
		await ingestFiles({ pipeline, files: [file1, file2], concurrency: 2 });

		const result = await pipeline.retrieve('query', 5);
		expect(result.citations.length).toBe(2);

		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe('batch-ingest helpers', () => {
	it('resolveFileList discovers files', async () => {
		const dir = await fs.mkdtemp(join(tmpdir(), 'rag-resolve-'));
		const file = join(dir, 'a.txt');
		await fs.writeFile(file, 'x');
		const files = await resolveFileList({
			files: [],
			root: dir,
			include: ['*.txt'],
			exclude: [],
			includePriority: false,
		});
		expect(files).toContain(file);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('createWorker and runWorkers process queue', async () => {
		const dir = await fs.mkdtemp(join(tmpdir(), 'rag-worker-'));
		const file = join(dir, 'a.txt');
		await fs.writeFile(file, 'hello');
		const queue = [file];
		const results: Chunk[] = [];
		const pipeline = {
			ingest: async (chunks: Chunk[]) => {
				results.push(...chunks);
			},
		};
		const worker = createWorker({ pipeline, queue, chunkSize: 5, overlap: 0 });
		await runWorkers(worker, 2, queue.length);
		expect(results.length).toBe(1);
		await fs.rm(dir, { recursive: true, force: true });
	});
});
