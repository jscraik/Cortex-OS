import { describe, expect, it } from 'vitest';
import { MultiModelGenerator } from '../src/generation/multi-model';

const RUN_INTEGRATION = process.env.RUN_RAG_INTEGRATION === '1';
const d = RUN_INTEGRATION ? describe : describe.skip;

d('MultiModelGenerator external script', () => {
	it('invokes MLX python script', async () => {
		const gen = new MultiModelGenerator({
			model: { model: 'fake-model', backend: 'mlx' },
		});
		await expect(gen.generate('hello')).rejects.toBeTruthy();
	});
});
