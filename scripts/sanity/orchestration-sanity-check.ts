#!/usr/bin/env -S tsx
/*
Non-fatal orchestration sanity check.
- Verifies model catalog file presence and parse-ability
- Prints optional env hints for Frontier and Ollama
This script should be safe to run in CI and local dev.
*/

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function checkJson(pathLike: string) {
	const out = { path: pathLike, exists: false, validJson: false, error: '' };
	try {
		out.exists = existsSync(pathLike);
		if (out.exists) {
			JSON.parse(readFileSync(pathLike, 'utf8'));
			out.validJson = true;
		}
	} catch (e) {
		const err = e as Error;
		out.error = err?.message ?? String(e);
	}
	return out;
}

const root = resolve(__dirname, '..', '..');
const mlxPath = resolve(root, process.env.MLX_MODEL_CONFIG_PATH ?? 'config/mlx-models.json');
const ollamaPath = resolve(
	root,
	process.env.OLLAMA_MODEL_CONFIG_PATH ?? 'config/ollama-models.json',
);

const mlx = checkJson(mlxPath);
const oll = checkJson(ollamaPath);

const info = {
	catalogs: { mlx, ollama: oll },
	env: {
		OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? null,
		FRONTIER_API_KEY: process.env.FRONTIER_API_KEY ? '***set***' : null,
	},
};

console.log('[orchestration-sanity-check]', JSON.stringify(info, null, 2));

// Never throw here; rely on tests to enforce requirements.
