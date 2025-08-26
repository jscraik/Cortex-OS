import { randomUUID } from 'node:crypto';
import { INeo4j, Neo4j } from './adapters/neo4j.js';
import { IQdrant, Qdrant } from './adapters/qdrant.js';
import { enforceWrite, checkRead } from './policy.js';
import { KGNode, KGRel, MemoryRecord, TenantCtx, VectorHit, VectorQuery } from './types.js';
import { VectorSizeError } from './errors.js';
import { redactPII } from './privacy/redact.js';

export type Embedder = { embed(texts: string[]): Promise<number[][]> };

export class MemoryService {
  constructor(
    private qdrant: IQdrant,
    private neo4j: INeo4j,
    private embedder: Embedder,
    private vectorSize: number,
  ) {}

  /**
   * Creates a MemoryService instance using environment variables.
   * This is a convenience method for production-like environments.
   * For testing and custom configurations, please use the constructor directly.
   */
  static async fromEnv(embedder: Embedder) {
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    const neo4jUri = process.env.NEO4J_URI;
    const neo4jUser = process.env.NEO4J_USER;
    const neo4jPassword = process.env.NEO4J_PASSWORD;

    if (!qdrantUrl || !neo4jUri || !neo4jUser || !neo4jPassword) {
        throw new Error("Missing required environment variables for MemoryService. Check QDRANT_URL, NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD.");
    }

    const q = new Qdrant(qdrantUrl, qdrantApiKey);
    const n = new Neo4j(neo4jUri, neo4jUser, neo4jPassword);
    
    const size = Number(process.env.VECTOR_SIZE || '1536');
    await q.ensureCollection(size);
    
    return new MemoryService(q, n, embedder, size);
  }

  // Public helper for RAG
  async embedOne(text: string): Promise<number[]> {
    const [vec] = await this.embedder.embed([text]);
    if (vec.length !== this.vectorSize)
      throw new VectorSizeError(this.vectorSize, vec.length);
    return vec;
  }

  private computeExpireAt(ttlDays?: number): string | undefined {
    if (!ttlDays) return undefined;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ttlDays);
    return d.toISOString();
  }

  async putText(
    ctx: TenantCtx,
    kind: MemoryRecord['kind'],
    text: string,
    metadata: Record<string, unknown> = {},
    ttlDays?: number,
    policy?: MemoryRecord['policy'],
    sourceURI?: string,
  ): Promise<string> {
    const cleanText = redactPII(text);
    const vec = await this.embedOne(cleanText);
    const rec: MemoryRecord = {
      id: randomUUID(),
      tenantId: ctx.tenantId,
      kind,
      text: cleanText,
      metadata,
      embedding: vec,
      createdAt: new Date().toISOString(),
      ttlDays,
      expireAt: this.computeExpireAt(ttlDays),
      policy,
      sourceURI,
    } as MemoryRecord;
    enforceWrite(policy, ctx);
    await this.qdrant.upsert([rec]);
    return rec.id;
  }

  async search(ctx: TenantCtx, q: Omit<VectorQuery, 'tenantId'>): Promise<VectorHit[]> {
    const res = await this.qdrant.search({ ...q, tenantId: ctx.tenantId });
    return res.filter(hit => {
        const record = hit.payload as MemoryRecord;
        return checkRead(record.policy, ctx);
    });
  }

  async upsertKGNode(node: KGNode) {
    await this.neo4j.upsertNode(node);
  }
  async upsertKGRel(rel: KGRel) {
    await this.neo4j.upsertRel(rel);
  }
  async getNeighborhood(nodeId: string, depth = 2) {
    return this.neo4j.neighborhood(nodeId, depth);
  }

  async pruneExpired() {
    await this.qdrant.deleteExpired(new Date().toISOString());
  }
}
