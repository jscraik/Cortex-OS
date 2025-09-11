import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_MODEL_INTEGRATION,
	MODEL_PERFORMANCE_PROFILES,
} from '../../config/model-integration-strategy';

const mlxModels = JSON.parse(
	readFileSync(join(process.cwd(), 'config', 'mlx-models.json'), 'utf8'),
);

const mlxKeys = new Set<string>([
	...Object.keys(mlxModels.embedding_models),
	...Object.keys(mlxModels.reranker_models),
	...Object.keys(mlxModels.chat_models),
	...Object.keys(mlxModels.safety_models),
]);

const allowedExternal = new Set(['deepseek-coder', 'phi4-mini-reasoning']);

function normalize(model: string): string {
	if (model.startsWith('mixtral-8x7b')) return 'mixtral';
	if (model.startsWith('qwen3-coder')) return 'qwen3-coder';
	return model.split(':')[0];
}

function gatherModels(obj: unknown): string[] {
	if (!obj || typeof obj !== 'object') return [];
	const values: string[] = [];
	for (const val of Object.values(obj as Record<string, unknown>)) {
		if (typeof val === 'string') values.push(val);
		else values.push(...gatherModels(val));
	}
	return values;
}

describe('model integration config consistency', () => {
	it('references only known models', () => {
		const models = gatherModels(DEFAULT_MODEL_INTEGRATION);
		const missing: string[] = [];
		for (const m of models) {
			const key = normalize(m);
			if (!mlxKeys.has(key) && !allowedExternal.has(key)) {
				missing.push(m);
			}
		}
		expect(missing).toEqual([]);
	});

	it('has performance profiles for all models', () => {
		const models = gatherModels(DEFAULT_MODEL_INTEGRATION);
		const profileKeys = new Set(Object.keys(MODEL_PERFORMANCE_PROFILES));
		const missing: string[] = [];
		for (const m of models) {
			if (!profileKeys.has(m)) missing.push(m);
		}
		expect(missing).toEqual([]);
	});
});
