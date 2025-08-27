export function fusionRerank(
  query: string,
  docs: { id: string; text: string; emb: number[] }[],
  bm25: Map<string, number>,
  queryEmb?: number[],
  alpha = 0.7,
) {
  if (!Array.isArray(docs)) throw new TypeError('docs must be an array');
  if (docs.length === 0) return [];

  // helpers extracted to small, single-purpose functions
  const dot = (a: number[], b: number[]) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };

  const norm = (a: number[]) => Math.sqrt(dot(a, a));

  const cosine = (a: number[], b: number[]) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return 0;
    if (a.length !== b.length) return 0;
    const na = norm(a);
    const nb = norm(b);
    if (na === 0 || nb === 0) return 0;
    return dot(a, b) / (na * nb);
  };

  const buildAverageEmb = (docsList: { emb: number[] }[]): number[] | null => {
    const first = docsList[0]?.emb;
    if (!first || first.length === 0) return null;
    const dim = first.length;
    const accum = new Array<number>(dim).fill(0);
    for (const d of docsList) {
      if (!Array.isArray(d.emb) || d.emb.length !== dim) return null;
      for (let i = 0; i < dim; i++) accum[i] += d.emb[i];
    }
    return accum.map((v) => v / docsList.length);
  };

  let effectiveQueryEmb = queryEmb ?? buildAverageEmb(docs);
  if (!effectiveQueryEmb) {
    // final fallback: use first doc emb if available
    effectiveQueryEmb = docs[0]?.emb ?? [];
  }

  const scored = docs.map((d) => {
    const emb = Array.isArray(d.emb) ? d.emb : [];
    const cos = effectiveQueryEmb.length === emb.length ? cosine(effectiveQueryEmb, emb) : 0;
    const bm = bm25.get(d.id) ?? 0;
    const s = alpha * cos + (1 - alpha) * bm;
    return { id: d.id, score: s };
  });

  return scored.sort((a, b) => b.score - a.score);
}
