export const dot = (a: number[], b: number[]): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export const norm = (a: number[]): number => Math.sqrt(dot(a, a));

export const cosine = (a: number[], b: number[]): number => {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length !== b.length) return 0;
  const na = norm(a);
  const nb = norm(b);
  return na && nb ? dot(a, b) / (na * nb) : 0;
};

export const buildAverageEmb = (docs: { emb: number[] }[]): number[] | null => {
  const first = docs[0]?.emb;
  if (!first || first.length === 0) return null;
  const dim = first.length;
  const accum = new Array<number>(dim).fill(0);
  for (const d of docs) {
    if (!Array.isArray(d.emb) || d.emb.length !== dim) return null;
    for (let i = 0; i < dim; i++) accum[i] += d.emb[i];
  }
  return accum.map((v) => v / docs.length);
};
