import type { Memory, MemoryId } from "../domain/types.js";
import type { MemoryStore, TextQuery, VectorQuery } from "../ports/MemoryStore.js";

export class InMemoryStore implements MemoryStore {
  private data = new Map<MemoryId, Memory>();

  async upsert(m: Memory) { this.data.set(m.id, m); return m; }
  async get(id: MemoryId) { return this.data.get(id) ?? null; }
  async delete(id: MemoryId) { this.data.delete(id); }

  async searchByText(q: TextQuery) {
    const items = [...this.data.values()].filter(x =>
      (!q.filterTags || q.filterTags.every(t => x.tags.includes(t))) &&
      (x.text?.toLowerCase().includes(q.text.toLowerCase()) ?? false)
    );
    return items.slice(0, q.topK);
  }

  async searchByVector(q: VectorQuery) {
    const dot = (a:number[],b:number[]) => a.reduce((s,v,i)=>s+v*(b[i]??0),0);
    const norm = (a:number[]) => Math.sqrt(dot(a,a));
    const cos = (a:number[],b:number[]) => (dot(a,b))/(norm(a)*norm(b) || 1);
    const items = [...this.data.values()]
      .filter(x => x.vector && (!q.filterTags || q.filterTags.every(t => x.tags.includes(t))))
      .map(x => ({ x, score: cos(q.vector, x.vector!) }))
      .sort((a,b)=>b.score-a.score)
      .slice(0, q.topK)
      .map(e=>e.x);
    return items;
  }

  async purgeExpired(_: string) { return 0; }
}

