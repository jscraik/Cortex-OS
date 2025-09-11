import { promises as fs } from 'node:fs';
import path from 'node:path';
import { byChars } from '../chunk';
import { discoverFiles, filterPaths } from '../pipeline/file-discovery';
import type { Chunk } from './types';

interface ResolveOptions {
	files: string[];
	root?: string;
	include: string[];
	exclude: string[];
	includePriority: boolean;
}

export async function resolveFileList(opts: ResolveOptions): Promise<string[]> {
	let fileList = opts.files;
	if (opts.root) {
		const discovered = await discoverFiles({
			root: opts.root,
			include: opts.include,
			exclude: opts.exclude,
			includePriority: opts.includePriority,
		});
		fileList = fileList.concat(discovered);
	}
	fileList = filterPaths({
		paths: fileList.map((f) => path.resolve(f)),
		include: opts.include,
		exclude: opts.exclude,
		includePriority: opts.includePriority,
		cwd: opts.root ? path.resolve(opts.root) : undefined,
	});
	return Array.from(new Set(fileList));
}

interface WorkerOptions {
	pipeline: { ingest: (chunks: Chunk[]) => Promise<void> };
	queue: string[];
	chunkSize: number;
	overlap: number;
}

export function createWorker(opts: WorkerOptions) {
	return async function worker(): Promise<void> {
		while (opts.queue.length) {
			const file = opts.queue.shift();
			if (!file) break;
			const text = await fs.readFile(file, 'utf8');
			const chunks: Chunk[] = byChars(text, opts.chunkSize, opts.overlap).map(
				(t, i) => ({
					id: `${path.basename(file)}#${i}`,
					text: t,
					source: file,
				}),
			);
			await opts.pipeline.ingest(chunks);
		}
	};
}

export async function runWorkers(
	worker: () => Promise<void>,
	concurrency: number,
	fileCount: number,
): Promise<void> {
	const workerCount = Math.min(concurrency, fileCount);
	const workers: Promise<void>[] = [];
	for (let i = 0; i < workerCount; i++) workers.push(worker());
	await Promise.all(workers);
}

export type { ResolveOptions, WorkerOptions };
