import { describe, expect, it, vi } from 'vitest';
import { generateText } from '../src/lib/llm.js';

describe('LLM Integration', () => {
	it('uses MLX endpoint when available', async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({ response: 'mlx' }),
		});
		vi.stubGlobal('fetch', fetchMock);
		const result = await generateText('hello', {
			model: 'mlx-model',
			fallbackModel: 'ollama',
		});
		expect(result).toBe('mlx');
		vi.restoreAllMocks();
	});

	it('falls back to Frontier when MLX fails', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('mlx fail'))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ response: 'frontier' }),
			});
		vi.stubGlobal('fetch', fetchMock);
		const result = await generateText('hi', {
			model: 'mlx-model',
			fallbackModel: 'ollama',
		});
		expect(result).toBe('frontier');
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.restoreAllMocks();
	});
});
