import { describe, expect, it } from 'vitest';
import { generateEmbedding } from '../embed.js';

describe('generateEmbedding', () => {
  it('returns empty array for empty input', async () => {
    const res = await generateEmbedding([]);
    expect(res).toEqual([]);
  });

  it('produces deterministic vectors', async () => {
    const res1 = await generateEmbedding('hello');
    const res2 = await generateEmbedding('hello');
    expect(res1).toEqual(res2);
    expect(res1[0]).toHaveLength(8);
  });

  it('supports concurrent calls', async () => {
    const inputs = ['a', 'b', 'c'];
    const results = await Promise.all(inputs.map((t) => generateEmbedding(t)));
    expect(results).toHaveLength(3);
  });
});
