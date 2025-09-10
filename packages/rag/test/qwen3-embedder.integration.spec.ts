import { describe, expect, it } from 'vitest';
import { Qwen3Embedder } from '../src/embed/qwen3';

const RUN_INTEGRATION = process.env.RUN_RAG_INTEGRATION === '1';
const d = RUN_INTEGRATION ? describe : describe.skip;

d('Qwen3Embedder external script', () => {
	it('invokes python script', async () => {
		const embedder = new Qwen3Embedder({ modelSize: '0.6B', cacheDir: '/tmp' });
		await expect(embedder.embed(['test'])).rejects.toThrow(
			/Python embedding process failed/,
		);
	});
});
