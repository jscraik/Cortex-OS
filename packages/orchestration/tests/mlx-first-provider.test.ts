import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/model-strategy.js', () => ({
	MODEL_STRATEGY: {
		testTask: {
			primary: {
				provider: 'mlx',
				model: 'mock-mlx',
				path: '',
				capabilities: [],
			},
			fallback: {
				provider: 'ollama',
				model: 'mock-ollama',
				endpoint: '',
				capabilities: [],
			},
			performance: { latency: 'low', memory: 'light', accuracy: 'good' },
		},
	},
}));

import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

type InternalServices = {
	mlxService: { generate: (request: unknown) => Promise<{ content: string }> };
	ollamaService: {
		generate: (request: unknown) => Promise<{ content: string }>;
	};
};

describe('MLXFirstModelProvider with mocked strategy', () => {
	it('uses MLX for primary generation', async () => {
		vi.useFakeTimers();
		const provider = new MLXFirstModelProvider();
		const services = provider as unknown as InternalServices;
		const mlxSpy = vi
			.spyOn(services.mlxService, 'generate')
			.mockResolvedValue({ content: 'mlx-response' });
		const ollamaSpy = vi.spyOn(services.ollamaService, 'generate');

		const result = await provider.generate('testTask', {
			task: 'unit',
			prompt: 'hi',
		});

		expect(mlxSpy).toHaveBeenCalled();
		expect(ollamaSpy).not.toHaveBeenCalled();
		expect(result.provider).toBe('mlx');
		expect(result.model).toBe('mock-mlx');

		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('falls back to Ollama when MLX fails', async () => {
		vi.useFakeTimers();
		const provider = new MLXFirstModelProvider();
		const services = provider as unknown as InternalServices;
		vi.spyOn(services.mlxService, 'generate').mockRejectedValue(
			new Error('fail'),
		);
		const ollamaSpy = vi
			.spyOn(services.ollamaService, 'generate')
			.mockResolvedValue({ content: 'ollama-response' });

		const result = await provider.generate('testTask', {
			task: 'unit',
			prompt: 'hi',
		});

		expect(ollamaSpy).toHaveBeenCalled();
		expect(result.provider).toBe('ollama');
		expect(result.model).toBe('mock-ollama');

		vi.clearAllTimers();
		vi.useRealTimers();
	});
});
