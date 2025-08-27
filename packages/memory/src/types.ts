import { z } from 'zod';

export type Embedding = number[];
export type Score = number;

export const TenantCtx = z.object({
  tenantId: z.string(),
  agentId: z.string().optional(),
  userId: z.string().optional(),
});
export type TenantCtx = z.infer<typeof TenantCtx>;

export const AccessPolicy = z.object({
  canRead: z.array(z.string()), // roles or ids, "*" allowed
  canWrite: z.array(z.string()),
});
export type AccessPolicy = z.infer<typeof AccessPolicy>;

export const MemoryRecord = z.object({
  id: z.string(),
  tenantId: z.string(),
  kind: z.enum(['doc', 'chunk', 'event', 'decision']),
  text: z.string(),
  metadata: z.record(z.any()).default({}),
  embedding: z.array(z.number()),
  createdAt: z.string(),
  ttlDays: z.number().optional(),
  expireAt: z.string().optional(), // NEW: used by GC
  policy: AccessPolicy.optional(),
  sourceURI: z.string().optional(),
});
export type MemoryRecord = z.infer<typeof MemoryRecord>;

export type VectorQuery = {
  tenantId: string;
  queryEmbedding: Embedding;
  topK: number;
  filter?: Record<string, unknown>;
};

export type VectorHit = {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  score: Score;
  sourceURI?: string;
};

export type KGNode = { id: string; label: string; props: Record<string, unknown> };
export type KGRel = { from: string; to: string; type: string; props?: Record<string, unknown> };
export type Subgraph = { nodes: KGNode[]; rels: KGRel[] };
