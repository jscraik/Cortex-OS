import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cortex-os/model-gateway/dist/adapters/mlx-adapter.js', () => {
	class MLXAdapter {
		isAvailable() {
			return Promise.resolve(false);
		}
		generateChat() {
			return Promise.resolve({ content: '', model: '' });
		}
	}
	return { MLXAdapter };
});

vi.mock('@cortex-os/model-gateway', () => {
	class OllamaAdapter {
		generateChat(_payload: unknown, model?: string) {
			return Promise.resolve({ content: 'ok-ollama', model: model ?? 'deepseek-coder:6.7b' });
		}
	}
	return { OllamaAdapter };
});

import { OllamaAdapter } from '@cortex-os/model-gateway';
import { createMasterAgentGraph } from '../src/MasterAgent.js';

const OLD_ENV = { ...process.env };

describe('Ollama specialization-derived tier fallback', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		process.env.CORTEX_CONFIG_DIR = path.resolve(__dirname, '../../../config');
	});
	afterEach(() => {
		process.env = { ...OLD_ENV };
	});

	it('uses balanced tier for documentation specialization when MLX is unavailable', async () => {
		const spy = vi.spyOn(OllamaAdapter.prototype, 'generateChat');

		const graph = createMasterAgentGraph({
			name: 't',
			subAgents: [
				{
					name: 'documentation-agent',
					description: 'd',
					capabilities: ['docs'],
					model_targets: [],
					tools: [],
					specialization: 'documentation',
					// no fallback_model, no fallback_tier -> specialization-derived tier should apply
				},
			],
		});

		const state = await graph.coordinate('Please write docs for this module');
		expect(state.error).toBeUndefined();
		expect(spy).toHaveBeenCalled();
		const call = spy.mock.calls[0];
		// balanced tier first model in config/ollama-models.json is deepseek-coder -> "deepseek-coder:6.7b"
		expect(['deepseek-coder:6.7b', 'deepseek-coder']).toContain(call[1]);
	});
});
