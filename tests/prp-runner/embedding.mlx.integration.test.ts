import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	createEmbeddingState,
	generateEmbeddings,
} from '../../packages/prp-runner/src/lib/embedding/index.js';

const HF_CACHE =
	process.env.HF_CACHE_PATH ||
	path.resolve(process.env.HOME || '', '.cache', 'huggingface');
const MODEL_PATH = path.join(
	HF_CACHE,
	'hub',
	'models--Qwen--Qwen3-Embedding-0.6B',
);

const hasModel = fs.existsSync(MODEL_PATH);
const pythonDeps = spawnSync('python', ['-c', 'import sentence_transformers'], {
	stdio: 'ignore',
});
const canRun = hasModel && pythonDeps.status === 0;

describe('MLX embedding integration', () => {
	(canRun ? it : it.skip)(
		'produces 1024-dimensional embeddings',
		async () => {
			const state = createEmbeddingState('sentence-transformers');
			const [embedding] = await generateEmbeddings(state, 'Hello MLX');
			expect(embedding).toHaveLength(1024);
		},
		20000,
	);
});
