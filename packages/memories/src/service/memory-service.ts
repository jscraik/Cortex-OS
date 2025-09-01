import { CompositeEmbedder } from '../adapters/embedder.composite.js';
import type { Memory } from '../domain/types.js';
import { withSpan } from '../observability/otel.js';
import type { Embedder } from '../ports/Embedder.js';
import type { MemoryStore } from '../ports/MemoryStore.js';
import { memoryZ } from '../schemas/memory.zod.js';
import { redactPII } from '../privacy/redact.js';

export type MemoryService = {
  save: (ctx: AccessContext, raw: unknown) => Promise<Memory>;
  get: (ctx: AccessContext, id: string) => Promise<Memory | null>;
  del: (ctx: AccessContext, id: string) => Promise<void>;
  search: (ctx: AccessContext, q: {
    text?: string;
    vector?: number[];
    topK?: number;
    tags?: string[];
  }) => Promise<Memory[]>;
  purge: (ctx: AccessContext, nowISO?: string) => Promise<number>;
  forget: (ctx: AccessContext, actor: string) => Promise<number>;
  // New method to test embedders
  testEmbedders?: () => Promise<Array<{ name: string; available: boolean }>>;
};

export interface AccessContext {
  agent: string;
  tenant: string;
  purposes: string[];
}

const canAccess = (m: Memory, ctx: AccessContext) =>
  m.acl.tenant === ctx.tenant &&
  m.acl.agent === ctx.agent &&
  m.acl.purposes.some((p) => ctx.purposes.includes(p));

export const createMemoryService = (store: MemoryStore, embedder: Embedder): MemoryService => {
  if (!embedder) throw new Error('embedder:missing');

  return {
    save: async (ctx, raw) => {
      return withSpan('memories.save', async () => {
        const parsed = memoryZ.parse(raw) as Memory;
        const redacted = parsed.text ? redactPII(parsed.text) : undefined;
        // Validate or merge ACL
        let acl;
        if (parsed.acl) {
          // Validate that input ACL matches context ACL
          const aclMatches =
            parsed.acl.agent === ctx.agent &&
            parsed.acl.tenant === ctx.tenant &&
            parsed.acl.purposes.every((p: string) => ctx.purposes.includes(p));
          if (!aclMatches) {
            throw new Error('Input ACL does not match context ACL');
          }
          acl = parsed.acl;
        } else {
          acl = { agent: ctx.agent, tenant: ctx.tenant, purposes: ctx.purposes };
        }
        const m: Memory = {
          ...parsed,
          text: redacted,
          acl,
        };
        const needsVector = !m.vector && m.text;
        let withVec: Memory;
        if (needsVector) {
          withVec = {
            ...m,
            vector: (await embedder.embed([m.text!]))[0],
            embeddingModel: embedder.name(),
          };
        } else {
          withVec = m;
        }
        return store.upsert(withVec);
      });
    },
    get: async (ctx, id) => {
      const mem = await store.get(id);
      return mem && canAccess(mem, ctx) ? mem : null;
    },
    del: async (ctx, id) => {
      const mem = await store.get(id);
      if (mem && canAccess(mem, ctx)) await store.delete(id);
      else throw new Error('forbidden');
    },
    search: async (ctx, q) => {
      return withSpan('memories.search', async () => {
        const topK = q.topK ?? 8;
        if (q.vector) {
          const res = await store.searchByVector({ vector: q.vector, topK, filterTags: q.tags });
          return res.filter((m) => canAccess(m, ctx));
        }
        if (q.text) {
          const v = (await embedder.embed([q.text]))[0];
          const res = await store.searchByVector({ vector: v, topK, filterTags: q.tags });
          return res.filter((m) => canAccess(m, ctx));
        }
        return [];
      });
    },
    purge: (ctx, nowISO) =>
      withSpan('memories.purge', async () =>
        store.purgeExpired(nowISO ?? new Date().toISOString()),
      ),
    forget: (ctx, actor) => store.forgetByActor(actor, ctx.tenant),
    ...(embedder instanceof CompositeEmbedder
      ? {
          testEmbedders: () => (embedder as CompositeEmbedder).testEmbedders(),
        }
      : {}),
  };
};
