import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	selectFrontierModel,
	selectMLXModel,
	selectOllamaModel,
} from '../../src/lib/model-selection.js';

const okJsonResponse = (body: Record<string, unknown>) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});

describe('Model adapter stability', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('prefers MLX when the service reports healthy', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(okJsonResponse({ status: 'ok' }));

		const result = await selectMLXModel('chat');

		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('http://localhost:8001/health'),
			expect.objectContaining({ method: 'GET' }),
		);
		expect(result).toBe('mlx-community/Phi-3.5-mini-instruct-4bit');
	});

	it('falls back to Ollama when MLX is unavailable', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (url.includes(':8001')) {
				throw new Error('brAInwav simulated MLX outage');
			}
			if (url.includes(':11434')) {
				return okJsonResponse({ models: ['llama3.2:3b'] });
			}
			throw new Error(`Unexpected fetch URL in test: ${url}`);
		});

		const mlx = await selectMLXModel('chat');
		const ollama = await selectOllamaModel('chat');

		expect(mlx).toBeNull();
		expect(ollama).toBe('llama3.2:3b');
	});

	it('returns a deterministic frontier spec when local providers fail', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(
			new Error('brAInwav simulated network failure'),
		);

		const mlx = await selectMLXModel('analysis');
		const ollama = await selectOllamaModel('analysis');
		const frontier = selectFrontierModel('analysis');

		expect(mlx).toBeNull();
		expect(ollama).toBeNull();
		expect(frontier).toEqual({
			provider: 'anthropic',
			model: 'claude-3-haiku-20240307',
		});
	});
});
