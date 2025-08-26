import { z } from 'zod';
export const Doc = z.object({
  id: z.string(),
  uri: z.string(),
  title: z.string().default(''),
  mime: z.string().default('text/plain'),
  createdAt: z.string().default(() => new Date().toISOString()),
  meta: z.record(z.any()).default({}),
});
export const Chunk = z.object({
  id: z.string(),
  docId: z.string(),
  ord: z.number().int(),
  text: z.string(),
  tokens: z.number().int().default(0),
  meta: z.record(z.any()).default({}),
});
export const Embedding = z.object({
  chunkId: z.string(),
  dim: z.number().int(),
  vec: z.array(z.number()),
});
export type Doc = z.infer<typeof Doc>;
export type Chunk = z.infer<typeof Chunk>;
export type Embedding = z.infer<typeof Embedding>;
