#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HNSWIndex } from '../src/indexing/hnsw-index.ts';

/**
 * Migrate a flat JSON embedding file into an HNSW index bundle.
 * The JSON input must be an array of objects shaped like:
 * `{ id: string, vector: number[] }`.
 */
export async function migrateFromJson(inputPath, outputPath, options = {}) {
	if (typeof inputPath !== 'string' || inputPath.length === 0) {
		throw new Error('Input path is required');
	}
	if (typeof outputPath !== 'string' || outputPath.length === 0) {
		throw new Error('Output path is required');
	}

	const resolvedInput = resolve(process.cwd(), inputPath);
	const resolvedOutput = resolve(process.cwd(), outputPath);
	const raw = await readFile(resolvedInput, 'utf-8');
	const items = JSON.parse(raw);

	if (!Array.isArray(items) || items.length === 0) {
		throw new Error('Input JSON must be a non-empty array of {id, vector} objects');
	}

	const first = items[0];
	if (!Array.isArray(first?.vector) || first.vector.length === 0) {
		throw new Error('First vector in dataset is invalid');
	}
	const dimension = first.vector.length;

	const index = new HNSWIndex(options);
	await index.init(dimension);

	const batch = items.map((item, idx) => {
		if (typeof item?.id !== 'string' || item.id.length === 0) {
			throw new Error(`Item at position ${idx} is missing an id`);
		}
		if (!Array.isArray(item.vector) || item.vector.length !== dimension) {
			throw new Error(`Vector at position ${idx} does not match dimension ${dimension}`);
		}
		return { id: item.id, vector: item.vector.map((v) => Number(v)) };
	});

	await index.addBatch(batch);

	await mkdir(dirname(resolvedOutput), { recursive: true });
	await index.save(resolvedOutput);

	return { count: batch.length, dimension };
}

async function runCli(argv = process.argv) {
	const [, , inputPath, outputPath] = argv;
	if (!inputPath || !outputPath) {
		console.error('Usage: migrate-flat-to-hnsw <input.json> <output-base>');
		process.exitCode = 1;
		return;
	}

	try {
		const result = await migrateFromJson(inputPath, outputPath);
		console.log(
			`brAInwav HNSW migration complete: ${result.count} vectors → ${outputPath} (dim=${result.dimension})`,
		);
	} catch (error) {
		console.error(
			`brAInwav HNSW migration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exitCode = 1;
	}
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.cwd(), process.argv[1]) : '';
if (modulePath === invokedPath) {
	runCli();
}
