import { z } from 'zod';
export const QueryReq = z.object({ q: z.string(), topK: z.number().int().default(8), filters: z.record(z.any()).optional() });
export const QueryHit = z.object({ chunkId: z.string(), docId: z.string(), score: z.number(), text: z.string(), uri: z.string(), meta: z.record(z.any()) });
export type QueryReq = z.infer<typeof QueryReq>;
export type QueryHit = z.infer<typeof QueryHit>;
