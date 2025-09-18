import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	loadModelRegistry,
	resolveConfigPath,
} from '../src/config/model-catalog.js';

const ORIGINAL_ENV = { ...process.env };

describe('ModelRegistry schema validation', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'orchestration-test-'));
	});

	afterEach(() => {
		Object.assign(process.env, ORIGINAL_ENV);
	});

	it('throws when catalogs are invalid shape', async () => {
		const badMlx = join(tmpDir, 'mlx.json');
		const badOll = join(tmpDir, 'ollama.json');
		writeFileSync(badMlx, JSON.stringify({}), 'utf8');
		writeFileSync(badOll, JSON.stringify({}), 'utf8');

		process.env.MLX_MODEL_CONFIG_PATH = badMlx;
		process.env.OLLAMA_MODEL_CONFIG_PATH = badOll;

		await expect(loadModelRegistry()).rejects.toThrow();
	});

	it('loads when catalogs match schema (control)', async () => {
		process.env.MLX_MODEL_CONFIG_PATH = resolveConfigPath(
			'config/mlx-models.json',
		);
		process.env.OLLAMA_MODEL_CONFIG_PATH = resolveConfigPath(
			'config/ollama-models.json',
		);
		const reg = await loadModelRegistry();
		const def = reg.getDefault('chat');
		expect(def.provider === 'mlx' || def.provider === 'ollama').toBe(true);
	});
});
