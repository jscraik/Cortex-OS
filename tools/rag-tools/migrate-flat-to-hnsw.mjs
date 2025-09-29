#!/usr/bin/env node
// Minimal migration utility: build an HNSW index from a JSON file of {id, vector} entries
// Usage:
// node tools/migrate-flat-to-hnsw.mjs --input=./vectors.json --out=./index/hnsw --space=cosine --M=16 --efConstruction=200 --efSearch=64

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export async function loadHnswIndex() {
	const mod = await import('../src/indexing/hnsw-index.js');
	return mod.HNSWIndex;
}

function parseArgs() {
	const args = process.argv.slice(2);
	const cfg = {
		input: null,
		out: './hnsw-index',
		space: 'cosine',
		M: 16,
		efConstruction: 200,
		efSearch: 64,
	};
	for (const a of args) {
		if (a.startsWith('--input=')) cfg.input = a.split('=')[1];
		else if (a.startsWith('--out=')) cfg.out = a.split('=')[1];
		else if (a.startsWith('--space=')) cfg.space = a.split('=')[1];
		else if (a.startsWith('--M=')) cfg.M = parseInt(a.split('=')[1], 10);
		else if (a.startsWith('--efConstruction=')) cfg.efConstruction = parseInt(a.split('=')[1], 10);
		else if (a.startsWith('--efSearch=')) cfg.efSearch = parseInt(a.split('=')[1], 10);
	}
	if (!cfg.input) {
		console.error('Missing --input=<path to JSON containing array of {id, vector}>');
		process.exit(1);
	}
	return cfg;
}

export async function migrateFromJson(input, out, opts = {}) {
	const raw = JSON.parse(readFileSync(input, 'utf-8'));
	if (!Array.isArray(raw) || raw.length === 0 || !raw[0].vector) {
		throw new Error('Input must be a non-empty array of objects with { id, vector }');
	}
	const dim = raw[0].vector.length;
	const HNSWIndex = await loadHnswIndex();
	const idx = new HNSWIndex({
		space: opts.space ?? 'cosine',
		M: opts.M ?? 16,
		efConstruction: opts.efConstruction ?? 200,
		efSearch: opts.efSearch ?? 64,
	});
	await idx.init(dim);
	await idx.addBatch(raw);
	mkdirSync(dirname(out), { recursive: true });
	await idx.save(out);
	return out;
}

async function main() {
	const cfg = parseArgs();
	await migrateFromJson(cfg.input, cfg.out, cfg);
	console.log(`Saved HNSW index to base: ${cfg.out} (.bin + .meta.json)`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
