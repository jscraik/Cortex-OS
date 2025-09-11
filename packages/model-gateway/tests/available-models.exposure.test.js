import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter.ts';
import { OllamaAdapter } from '../src/adapters/ollama-adapter.ts';
import { ModelRouter } from '../src/model-router.ts';

vi.mock('../src/adapters/mlx-adapter.ts');
vi.mock('../src/adapters/ollama-adapter.ts');
describe('ModelRouter available models exposure (MLX)', () => {
	let router;
	let mlx;
	let ollama;
	beforeEach(() => {
		mlx = new MLXAdapter();
		ollama = new OllamaAdapter();
		router = new ModelRouter(mlx, ollama);
	});
	it('exposes MLX embedding models and reranker when MLX is available', async () => {
		mlx.isAvailable.mockResolvedValue(true);
		ollama.isAvailable.mockResolvedValue(false);
		await router.initialize();
		const embeddings = router
			.getAvailableModels('embedding')
			.map((m) => m.name);
		expect(embeddings).toEqual(
			expect.arrayContaining([
				'qwen3-embedding-4b-mlx',
				'qwen3-embedding-8b-mlx',
			]),
		);
		const rerankers = router.getAvailableModels('reranking').map((m) => m.name);
		expect(rerankers).toEqual(
			expect.arrayContaining(['qwen3-reranker-4b-mlx']),
		);
	});
});
//# sourceMappingURL=available-models.exposure.test.js.map
