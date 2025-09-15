import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXEmbedder } from '../src/adapters/embedder.mlx.js';

const ENV0 = { ...process.env };

describe('MLXEmbedder via HTTP service', () => {
	beforeEach(() => {
		process.env = { ...ENV0 };
		// @ts-expect-error override fetch for tests
		global.fetch = undefined as any;
	});

	it('uses MLX_EMBED_BASE_URL when set and accepts embeddings array', async () => {
		process.env.MLX_EMBED_BASE_URL = 'http://localhost:8082';
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }),
		}));
		// @ts-expect-error test override
		global.fetch = fetchMock;

		const emb = new MLXEmbedder('qwen3-0.6b');
		const out = await emb.embed(['hello']);
		expect(out).toHaveLength(1);
		expect(out[0]).toHaveLength(3);
		expect(fetchMock).toHaveBeenCalled();
		const url = new URL(fetchMock.mock.calls[0][0]);
		expect(url.pathname).toBe('/embed');
	});

	it('falls back to MLX_SERVICE_URL and accepts single embedding field', async () => {
		delete process.env.MLX_EMBED_BASE_URL;
		process.env.MLX_SERVICE_URL = 'http://127.0.0.1:9999/';
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ embedding: [0.4, 0.5] }),
		}));
		// @ts-expect-error test override
		global.fetch = fetchMock;

		const emb = new MLXEmbedder('qwen3-4b');
		const out = await emb.embed(['world']);
		expect(out).toEqual([[0.4, 0.5]]);
		const callUrl = String(fetchMock.mock.calls[0][0]);
		expect(callUrl).toBe('http://127.0.0.1:9999/embed');
	});
});
