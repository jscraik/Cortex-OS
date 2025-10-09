import { describe, expect, it } from 'vitest';

import {
	deriveOllamaPrewarmModels,
	loadHybridConfig,
	selectOllamaModelForTask,
} from '../config/hybrid.js';

describe('hybrid configuration loader', () => {
	it('parses strategy and enforcement JSON successfully', () => {
		const config = loadHybridConfig();
		expect(config.strategy).not.toBeNull();
		expect(config.enforcement).not.toBeNull();
	});

	it('derives expected prewarm models from strategy and enforcement', () => {
		const config = loadHybridConfig();
		const models = deriveOllamaPrewarmModels(config);
		expect(models.length).toBeGreaterThan(0);
		expect(models).toContain('qwen3-coder:30b');
	});

	it('selects tool calling default model from strategy', () => {
		const config = loadHybridConfig();
		const model = selectOllamaModelForTask(config, 'tool_calling');
		expect(typeof model === 'string' && model.length > 0).toBe(true);
	});
});
