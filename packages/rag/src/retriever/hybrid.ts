import { RetrieverResult } from './types';

export function hybridCombine(
  vector: RetrieverResult[],
  bm25: RetrieverResult[],
  vectorWeight = 0.5,
): RetrieverResult[] {
  const map = new Map<string, RetrieverResult>();
  function add(arr: RetrieverResult[], weight: number) {
    arr.forEach((r) => {
      if (existing.text !== r.text) {
        if (existing.text && r.text) {
          console.warn(
            `hybridCombine: text mismatch for id '${r.id}'. Keeping first encountered text.`
          );
        } else if (!existing.text) {
          existing.text = r.text;
        }
      }
      map.set(r.id, existing);
    });
  }
  add(vector, vectorWeight);
  add(bm25, 1 - vectorWeight);
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}
