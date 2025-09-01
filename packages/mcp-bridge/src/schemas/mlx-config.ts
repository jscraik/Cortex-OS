import { z } from 'zod';

export const MLXModelEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const MLXConfigSchema = z.object({
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().positive().max(65535),
    workers: z.number().int().positive(),
    timeout: z.number().int().positive(),
    max_requests: z.number().int().positive(),
  }),
  models: z.record(MLXModelEntrySchema),
  cache: z.object({
    hf_home: z.string().min(1),
  }),
  performance: z.object({
    batch_size: z.number().int().positive(),
    max_tokens: z.number().int().positive(),
    temperature: z.number().min(0),
    top_p: z.number().min(0).max(1),
  }),
});

export type MLXConfig = z.infer<typeof MLXConfigSchema>;
