import { cosine, buildAverageEmb } from '../../../../src/lib/vector-math';

export function fusionRerank(
  query: string,
  docs: { id: string; text: string; emb: number[] }[],
  bm25: Map<string, number>,
  queryEmb?: number[],
  alpha = 0.7,
) {
  if (!Array.isArray(docs)) throw new TypeError('docs must be an array');
  if (docs.length === 0) return [];
  let effectiveQueryEmb = queryEmb ?? buildAverageEmb(docs) ?? docs[0]?.emb ?? [];
  return docs
    .map((d) => {
      const emb = Array.isArray(d.emb) ? d.emb : [];
      const cos = effectiveQueryEmb.length === emb.length ? cosine(effectiveQueryEmb, emb) : 0;
      const bm = bm25.get(d.id) ?? 0;
      return { id: d.id, score: alpha * cos + (1 - alpha) * bm };
    })
    .sort((a, b) => b.score - a.score);
}
