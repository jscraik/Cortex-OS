import { z } from 'zod';
import { DocSchema, RetrieverResult, RetrieverDoc } from './types';

interface BM25Index {
  search(query: string, k?: number): RetrieverResult[];
}

export function createBM25Index(docs: RetrieverDoc[]): BM25Index {
  const parsed = z.array(DocSchema).parse(docs);
  const tokenFreq = new Map<string, Record<string, number>>();
  const docFreq = new Map<string, number>();
  const tokenized: Record<string, string[]> = {};

  for (const d of parsed) {
    const tokens = d.text.toLowerCase().match(/\b\w+\b/g) ?? [];
    tokenized[d.id] = tokens;
    const freq: Record<string, number> = {};
    tokens.forEach((t) => {
      freq[t] = (freq[t] || 0) + 1;
    });
    tokenFreq.set(d.id, freq);
    for (const t of new Set(tokens)) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }

  const avgLen =
    parsed.reduce((sum, d) => sum + (tokenized[d.id]?.length || 0), 0) / parsed.length || 0;

  function scoreDoc(queryTokens: string[], d: RetrieverDoc): number {
    const k1 = 1.2;
    const b = 0.75;
    let score = 0;
    const tokens = tokenized[d.id] || [];
    for (const q of queryTokens) {
      const f = tokenFreq.get(d.id)?.[q] || 0;
      const df = docFreq.get(q) || 0;
      if (f === 0) continue;
      const idf = Math.log(1 + (parsed.length - df + 0.5) / (df + 0.5));
      const denom = f + k1 * (1 - b + (b * tokens.length) / avgLen);
      score += idf * (f * (k1 + 1)) / denom;
    }
    return score;
  }

  return {
    search(query: string, k = 5) {
      const tokens = query.toLowerCase().match(/\b\w+\b/g) ?? [];
      const scored = parsed
        .map((d) => ({ id: d.id, text: d.text, score: scoreDoc(tokens, d) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
      return scored;
    },
  };
}
