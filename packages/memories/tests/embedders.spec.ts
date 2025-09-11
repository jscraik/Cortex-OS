import { describe, expect, it, vi } from 'vitest';
import { CompositeEmbedder } from '../src/adapters/embedder.composite.js';
import { NoopEmbedder } from '../src/adapters/embedder.noop.js';

class MockEmbedder {
	name() {
		return 'mock';
	}
	embed = vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2]));
}

describe('CompositeEmbedder', () => {
	it('delegates to underlying embedder', async () => {
		const mock = new MockEmbedder();
		const comp = new CompositeEmbedder(mock);
		const result = await comp.embed(['hi']);
		expect(result).toHaveLength(1);
		expect(mock.embed).toHaveBeenCalled();
		expect(comp.name()).toBe('mock');
	});

	it('reports availability', async () => {
		const mock = new MockEmbedder();
		const comp = new CompositeEmbedder(mock);
		const status = await comp.testEmbedders();
		expect(status).toEqual([{ name: 'mock', available: true }]);
	});
});

describe('NoopEmbedder', () => {
	it('returns empty vectors', async () => {
		const noop = new NoopEmbedder();
		const result = await noop.embed(['a', 'b']);
		expect(noop.name()).toBe('noop');
		expect(result).toEqual([[], []]);
	});
});
