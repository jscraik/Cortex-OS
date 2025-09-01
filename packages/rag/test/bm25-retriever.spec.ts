import { describe, it, expect } from 'vitest';
import { createBM25Index, hybridCombine, RetrieverResult } from '../src/retriever';

describe('bm25 and hybrid retrievers', () => {
  const docs = [
    { id: '1', text: 'the quick brown fox' },
    { id: '2', text: 'jumps over the lazy dog' },
    { id: '3', text: 'lorem ipsum dolor sit amet' },
  ];
  const bm25 = createBM25Index(docs);

  it('bm25 ranks keyword docs', () => {
    const res = bm25.search('quick fox', 2);
    expect(res[0].id).toBe('1');
  });

  it('hybrid combines scores', () => {
    const vector: RetrieverResult[] = [
      { id: '1', text: docs[0].text, score: 0.2 },
      { id: '2', text: docs[1].text, score: 0.9 },
    ];
    const res = hybridCombine(vector, bm25.search('quick', 2));
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].id).toBe('2');
  });
});
