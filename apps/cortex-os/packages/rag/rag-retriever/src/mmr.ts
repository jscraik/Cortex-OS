import { cosine } from "@cortex-os/utils";

export function mmr(cands: { id: string; score: number; vec: number[] }[], lambda = 0.5, topK = 8) {
  const picked: typeof cands = [];
  const remain = [...cands];
  while (picked.length < Math.min(topK, remain.length)) {
    let best = 0, bestI = 0;
    for (let i = 0; i < remain.length; i++) {
      const c = remain[i];
      const div = picked.length ? Math.max(...picked.map((p) => cosine(p.vec, c.vec))) : 0;
      const gain = lambda * c.score - (1 - lambda) * div;
      if (i === 0 || gain > best) { best = gain; bestI = i; }
    }
    picked.push(remain.splice(bestI, 1)[0]);
  }
  return picked;
}
