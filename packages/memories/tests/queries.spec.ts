import { describe, it, expect } from 'vitest';
import { normalizeSearch } from '../src/service/queries.js';

describe('normalizeSearch', () => {
  it('fills defaults', () => {
    const norm = normalizeSearch({});
    expect(norm).toEqual({ text: undefined, vector: undefined, topK: 8, tags: [] });
  });

  it('preserves provided fields', () => {
    const norm = normalizeSearch({ text: 'hi', vector: [1], topK: 5, tags: ['a'] });
    expect(norm).toEqual({ text: 'hi', vector: [1], topK: 5, tags: ['a'] });
  });
});
