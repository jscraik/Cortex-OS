import { request } from 'undici';
import { MemoryRecord, VectorHit, VectorQuery } from '../types.js';

const COLLECTION = 'cortex_memory';

export interface IQdrant {
  ensureCollection(vectorSize: number): Promise<void>;
  upsert(records: MemoryRecord[]): Promise<void>;
  search(q: VectorQuery): Promise<VectorHit[]>;
  deleteExpired(nowISO: string): Promise<void>;
}

export class Qdrant implements IQdrant {
  constructor(
    private base: string,
    private apiKey?: string,
  ) {}

  private async q(path: string, method: string, body?: unknown) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['api-key'] = this.apiKey;
    const res = await request(`${this.base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.body.json();
    if (res.statusCode >= 300) throw new Error(`qdrant:${res.statusCode}:${JSON.stringify(data)}`);
    return data;
  }

  async ensureCollection(vectorSize: number) {
    await this.q(`/collections/${COLLECTION}`, 'PUT', {
      vectors: { size: vectorSize, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 },
    });
  }

  async upsert(records: MemoryRecord[]) {
    const points = records.map((r) => ({
      id: r.id,
      vector: r.embedding,
      payload: {
        tenantId: r.tenantId,
        kind: r.kind,
        text: r.text,
        metadata: r.metadata,
        createdAt: r.createdAt,
        ttlDays: r.ttlDays,
        expireAt: r.expireAt ?? null, // NEW
        sourceURI: r.sourceURI,
      },
    }));
    await this.q(`/collections/${COLLECTION}/points?wait=true`, 'PUT', { points });
  }

  async search(q: VectorQuery): Promise<VectorHit[]> {
    const filterMust: Array<Record<string, unknown>> = [
      { key: 'tenantId', match: { value: q.tenantId } },
    ];
    if (q.filter) {
      // naive pass-through; caller ensures it matches Qdrant schema
      filterMust.push({ ...q.filter });
    }
    const body = {
      vector: q.queryEmbedding,
      limit: q.topK,
      with_payload: true,
      filter: { must: filterMust, should: [], must_not: [] },
    } as const;
    const res = (await this.q(`/collections/${COLLECTION}/points/search`, 'POST', body)) as {
      result?: unknown[];
    };
    return (res.result ?? []).map((r) => {
      const rr = r as {
        id: string | number;
        score: number;
        payload?: { text?: string; metadata?: Record<string, unknown>; sourceURI?: string };
      };
      return {
        id: String(rr.id),
        text: rr.payload?.text ?? '',
        metadata: rr.payload?.metadata ?? {},
        score: rr.score,
        sourceURI: rr.payload?.sourceURI,
      } as VectorHit;
    });
  }

  async deleteExpired(nowISO: string) {
    await this.q(`/collections/${COLLECTION}/points/delete?wait=true`, 'POST', {
      filter: { must: [{ key: 'expireAt', range: { lte: nowISO } }], must_not: [] },
    });
  }
}
