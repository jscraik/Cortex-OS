export function fusionRerank(
  queryEmb: number[],
  docs: { id: string; text: string; emb: number[] }[],
  bm25: Map<string, number>,
  alpha = 0.7,
) {
    throw new TypeError('queryEmb must be a non-empty number array');
  }
  if (!Array.isArray(docs)) throw new TypeError('docs must be an array');
  if (docs.length === 0) return [];

  const dim = queryEmb.length;
  for (const d of docs) {
      throw new TypeError(`Document embedding dimension ${d.emb?.length} does not match query embedding dimension ${dim}`);
    }
  }

  const dot = (a: number[], b: number[]) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };

  const norm = (a: number[]) => Math.sqrt(dot(a, a));

  const cosine = (a: number[], b: number[]) => {
    const na = norm(a);
    const nb = norm(b);
    if (na === 0 || nb === 0) return 0;
    return dot(a, b) / (na * nb);
  };

  const scored = docs.map((d) => {
    const cos = cosine(queryEmb, d.emb);
    const bm = bm25.get(d.id) ?? 0;
    const s = alpha * cos + (1 - alpha) * bm;
    return { id: d.id, score: s };
  });

  return scored.sort((a, b) => b.score - a.score);
}
