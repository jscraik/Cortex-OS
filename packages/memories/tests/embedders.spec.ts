import { describe, it, expect, vi } from 'vitest';
import { CompositeEmbedder } from '../src/adapters/embedder.composite.js';

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
