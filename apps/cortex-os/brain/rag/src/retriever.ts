export interface Retriever {
  search(q: string, k: number): Promise<{ chunkId: string; score: number }[]>;
}

export class HybridRetriever implements Retriever {
  constructor(
    private deps: {
      bm25: (
        q: string,
        k: number,
      ) => Promise<{ chunkId: string; score: number }[]>;
      vector: (
        q: string,
        k: number,
      ) => Promise<{ chunkId: string; score: number }[]>;
      rerank?: (q: string, ids: string[]) => Promise<string[]>;
      useRerank?: boolean;
    },
  ) {}

  async search(q: string, k: number) {
    const [a, b] = await Promise.all([
      this.deps.bm25(q, k),
      this.deps.vector(q, k),
    ]);
    // simple hybrid merge by normalized rank
    const map = new Map<string, number>();
    const add = (arr: { chunkId: string; score: number }[], w: number) =>
      arr.forEach((it, i) =>
        map.set(it.chunkId, (map.get(it.chunkId) || 0) + w / (1 + i)),
      );
    add(a, 1.0);
    add(b, 1.0);
    const merged = Array.from(map.entries())
      .map(([chunkId, score]) => ({ chunkId, score }))
      .sort((x, y) => y.score - x.score)
      .slice(0, k);
    if (this.deps.useRerank && this.deps.rerank) {
      const ids = merged.map((m) => m.chunkId);
      const order = await this.deps.rerank(q, ids);
      const rank = new Map(order.map((id, i) => [id, i] as const));
      merged.sort((x, y) => rank.get(x.chunkId)! - rank.get(y.chunkId)!);
    }
    return merged;
  }
}
