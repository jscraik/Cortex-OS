import { promises as fs } from 'node:fs';
import { z } from 'zod';

export const MlxModelInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  description: z.string().optional(),
  dimensions: z.number().optional(),
  max_tokens: z.number().optional(),
  quantization: z.string().optional(),
  supports_vision: z.boolean().optional(),
  context_length: z.number().optional(),
  type: z.string().optional(),
  recommended_for: z.array(z.string()).optional(),
});

export const MlxModelsConfigSchema = z.object({
  embedding_models: z.record(MlxModelInfoSchema),
  reranker_models: z.record(MlxModelInfoSchema),
  chat_models: z.record(MlxModelInfoSchema),
  safety_models: z.record(MlxModelInfoSchema),
  default_models: z.record(z.string()),
});

export type MlxModelInfo = z.infer<typeof MlxModelInfoSchema>;
export type MlxModelsConfig = z.infer<typeof MlxModelsConfigSchema>;

export async function loadMlxModelsConfig(filePath: string): Promise<MlxModelsConfig> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return MlxModelsConfigSchema.parse(JSON.parse(raw));
}

export const MLXConfigSchema = z.object({
  server: z.object({
    host: z.string(),
    port: z.number(),
    workers: z.number(),
    timeout: z.number(),
    max_requests: z.number(),
  }),
  models: z.record(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
  cache: z.object({
    hf_home: z.string(),
  }),
  performance: z.object({
    batch_size: z.number(),
    max_tokens: z.number(),
    temperature: z.number(),
    top_p: z.number(),
  }),
});

export type MLXConfig = z.infer<typeof MLXConfigSchema>;

export async function loadMlxConfig(filePath: string): Promise<MLXConfig> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return MLXConfigSchema.parse(JSON.parse(raw));
}

