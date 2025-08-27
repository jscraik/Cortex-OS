import { describe, expect, it } from 'vitest';
import { fusionRerank } from '../src/pipeline/rerank_fusion';

describe('fusionRerank', () => {
  it('ranks using query embedding when provided', () => {
    const docs = [
      { id: 'a', text: 'doc a', emb: [1, 0] },
      { id: 'b', text: 'doc b', emb: [0, 1] },
    ];
    const bm25 = new Map([
      ['a', 0.1],
      ['b', 0.2],
    ]);
    const queryEmb = [1, 0];
    const out = fusionRerank('q', docs, bm25, queryEmb, 0.5);
    expect(out[0].id).toBe('a');
  });

  it('falls back to average embedding when query emb missing', () => {
    const docs = [
      { id: 'a', text: 'doc a', emb: [1, 0] },
      { id: 'b', text: 'doc b', emb: [1, 0] },
    ];
    const bm25 = new Map([
      ['a', 0],
      ['b', 0],
    ]);
    const out = fusionRerank('q', docs, bm25);
    expect(out.length).toBe(2);
    expect(out[0].score).toBeCloseTo(out[1].score);
  });

  it('returns empty array for empty docs', () => {
    const out = fusionRerank('q', [], new Map());
    expect(out).toEqual([]);
  });

  it('handles mismatched embedding dims gracefully', () => {
    const docs = [
      { id: 'a', text: 'doc a', emb: [1, 0, 0] },
      { id: 'b', text: 'doc b', emb: [0, 1] },
    ];
    const bm25 = new Map([
      ['a', 0.4],
      ['b', 0.6],
    ]);
    const out = fusionRerank('q', docs, bm25);
    // should not throw and should return array
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBe(2);
  });
});
