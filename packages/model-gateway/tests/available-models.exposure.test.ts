import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter';
import { OllamaAdapter } from '../src/adapters/ollama-adapter';
import { ModelRouter } from '../src/model-router';

vi.mock('../src/adapters/mlx-adapter');
vi.mock('../src/adapters/ollama-adapter');

describe('ModelRouter available models exposure (MLX)', () => {
	let router: ModelRouter;
	let mlx: MLXAdapter;
	let ollama: OllamaAdapter;

	beforeEach(() => {
		mlx = new MLXAdapter();
		ollama = new OllamaAdapter();
		router = new ModelRouter(mlx as any, ollama as any);
	});

	it('exposes MLX embedding models and reranker when MLX is available', async () => {
		(mlx.isAvailable as unknown as Mock).mockResolvedValue(true);
		(ollama.isAvailable as unknown as Mock).mockResolvedValue(false);

		await router.initialize();

		const embeddings = router.getAvailableModels('embedding').map((m) => m.name);
		expect(embeddings).toEqual(
			expect.arrayContaining(['qwen3-embedding-4b-mlx', 'qwen3-embedding-8b-mlx']),
		);

		const rerankers = router.getAvailableModels('reranking').map((m) => m.name);
		expect(rerankers).toEqual(expect.arrayContaining(['qwen3-reranker-4b-mlx']));
	});
});
