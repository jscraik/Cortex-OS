/**
 * Vitest global setup for prp-runner package.
 * Provides lightweight mocks for native / heavy dependencies not required for logic tests.
 */
import { vi } from 'vitest';

// Mock sharp to avoid native binary requirement in CI / local without install.
vi.mock('sharp', () => {
	return {
		default: (input?: any) => createMockSharpInstance(input),
	};

	function createMockSharpInstance(_input: any) {
		const api: any = {
			resize: (_w: number, _h?: number) => api,
			toFormat: (_fmt: string, _opts?: any) => api,
			png: (_opts?: any) => api,
			jpeg: (_opts?: any) => api,
			webp: (_opts?: any) => api,
			toBuffer: async () => Buffer.from('mock-image-bytes'),
			metadata: async () => ({ width: 0, height: 0, format: 'mock' }),
		};
		return api;
	}
});

// Mock any optional heavy model loaders if they appear later (placeholder)
vi.mock('@xenova/transformers', () => {
	return {
		pipeline: async () => async (_args: any) => ({ embedding: [0, 0, 0] }),
	};
});

// Mock ollama client to avoid network calls
vi.mock('ollama', () => {
	class MockOllama {
		host: string | undefined;
		constructor(opts: any) {
			this.host = opts?.host;
		}
		async generate(_opts: any) {
			return { response: 'mock-ollama-response' };
		}
	}
	return { Ollama: MockOllama };
});

// Mock MLX adapter to simulate healthy model and simple generation
vi.mock('../mlx-adapter.js', async () => {
	return {
		AVAILABLE_MLX_MODELS: { QWEN_SMALL: 'qwen-small' },
		createMLXAdapter: (_model: string, _opts: any) => {
			return {
				async checkHealth() {
					return { healthy: true, message: 'healthy' };
				},
				async listModels() {
					return ['mock-mlx-model'];
				},
				async generate({ prompt }: { prompt: string }) {
					return `mock-mlx-generation:${prompt.slice(0, 20)}`;
				},
			};
		},
	};
});
