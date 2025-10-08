import { z } from 'zod';

const MULTIMODAL_ENTRY_SCHEMA = z.object({
  type: z.enum(['image', 'audio', 'video', 'table', 'text']).default('text'),
  url: z.string().url().optional(),
  content: z.string().optional(),
  caption: z.string().optional()
});

export const RagIngestRequestSchema = z.object({
  documentId: z.string().min(1, 'brAInwav: documentId is required'),
  source: z.string().min(1, 'brAInwav: source is required'),
  text: z.string().min(1, 'brAInwav: text cannot be empty'),
  metadata: z.record(z.any()).optional(),
  hierarchical: z.boolean().default(true),
  multimodal: z.array(MULTIMODAL_ENTRY_SCHEMA).default([])
});

export type RagIngestRequest = z.infer<typeof RagIngestRequestSchema>;

export const RagHierQuerySchema = z.object({
  query: z.string().min(1, 'brAInwav: query text is required'),
  top_k: z.number().int().min(1).max(50).default(24),
  graph_walk: z.boolean().default(false),
  multimodal: z.boolean().default(false),
  self_rag: z.boolean().default(false),
  namespace: z.string().optional(),
  filters: z.record(z.any()).optional()
});

export type RagHierQueryRequest = z.infer<typeof RagHierQuerySchema>;
