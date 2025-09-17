import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	loadModelRegistry,
	ModelRegistry,
	resolveConfigPath,
} from '../src/config/model-catalog.js';

const ORIGINAL_ENV = { ...process.env };

describe('ModelRegistry', () => {
	beforeEach(() => {
		process.env.MLX_MODEL_CONFIG_PATH = resolveConfigPath(
			'config/mlx-models.json',
		);
		process.env.OLLAMA_MODEL_CONFIG_PATH = resolveConfigPath(
			'config/ollama-models.json',
		);
	});

	afterEach(() => {
		Object.assign(process.env, ORIGINAL_ENV);
	});

	it('loads default models from MLX catalog', async () => {
		const registry = await loadModelRegistry();
		const chat = registry.getDefault('chat');
		expect(chat.provider).toBe('mlx');
		expect(chat.model).toBe('glm-4.5');
		const embedding = registry.getDefault('embedding');
		expect(embedding.provider).toBe('mlx');
		expect(embedding.model).toBe('qwen3-4b');
	});

	it('resolves task routing with MLX preferred and Ollama fallback', async () => {
		const registry = await loadModelRegistry();
		const models = registry.resolveTask('code_generation');
		expect(models.length).toBeGreaterThan(1);
		expect(models[0]).toMatchObject({
			provider: 'mlx',
			model: 'qwen3-coder-7b',
		});
		expect(models[1]).toMatchObject({
			provider: 'ollama',
			model: 'deepseek-coder',
		});
	});

	it('allows availability override when resolving tasks', async () => {
		const registry = await loadModelRegistry();
		const models = registry.resolveTask('code_generation', {
			availability: { mlx: false, ollama: true },
		});
		expect(models[0]).toMatchObject({
			provider: 'ollama',
			model: 'deepseek-coder',
		});
	});
});
