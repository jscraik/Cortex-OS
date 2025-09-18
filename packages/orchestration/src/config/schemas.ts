import { z } from 'zod';

// MLX catalog schema (aligned with root schemas; may be centralized under contracts later)
const modelCommon = {
  name: z.string(),
  path: z.string().optional(),
  context_length: z.number().int().positive().optional(),
  quantization: z.string().optional(),
  dimensions: z.number().int().positive().optional(),
  max_tokens: z.number().int().positive().optional(),
  max_pairs: z.number().int().positive().optional(),
  recommended_for: z.array(z.string()).optional(),
  supports_vision: z.boolean().optional(),
  type: z.string().optional(),
  memory_gb: z.number().positive().optional(),
  transformers_model: z.string().optional(),
  coding_tasks: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
  tier: z.string().optional(),
};

export const mlxCatalogSchema = z.object({
  embedding_models: z.record(z.object(modelCommon)),
  reranker_models: z.record(z.object(modelCommon)).optional().default({}),
  chat_models: z.record(z.object(modelCommon)),
  safety_models: z.record(z.object(modelCommon)).optional().default({}),
  default_models: z.record(z.string()),
  task_routing: z.record(z.string()),
});

export type MlxCatalog = z.infer<typeof mlxCatalogSchema>;

// Ollama catalog schema
const ollamaModelEntry = z.object({
  name: z.string(),
  model_tag: z.string(),
  context_length: z.number().int().positive().optional(),
  memory_gb: z.number().positive().optional(),
  priority: z.number().int().optional(),
  status: z.string().optional(),
  size_bytes: z.number().int().optional(),
  recommended_for: z.array(z.string()).optional(),
  coding_tasks: z.array(z.string()).optional(),
  ollama_model: z.string().optional(),
  quantization: z.string().optional(),
  type: z.string().optional(),
  dimensions: z.number().int().positive().optional(),
  max_tokens: z.number().int().positive().optional(),
});

export const ollamaCatalogSchema = z.object({
  embedding_models: z.record(ollamaModelEntry).optional().default({}),
  chat_models: z.record(ollamaModelEntry).optional().default({}),
  reranker_models: z.record(ollamaModelEntry).optional().default({}),
  safety_models: z.record(ollamaModelEntry).optional().default({}),
  default_models: z.record(z.string()),
  task_routing: z.record(z.string()),
  service_configuration: z
    .object({
      ollama_endpoint: z.string().url().optional(),
      api_timeout_ms: z.number().int().positive().optional(),
      max_concurrent_requests: z.number().int().positive().optional(),
      auto_pull_models: z.boolean().optional(),
      model_pull_timeout_ms: z.number().int().positive().optional(),
      health_check_interval_ms: z.number().int().positive().optional(),
      retry_attempts: z.number().int().nonnegative().optional(),
      retry_delay_ms: z.number().int().nonnegative().optional(),
    })
    .optional(),
  fallback_chains: z.record(z.array(z.string())).optional(),
  performance_tiers: z
    .record(
      z.object({
        models: z.array(z.string()),
        max_latency_ms: z.number().int().positive().optional(),
        memory_limit_gb: z.number().positive().optional(),
      }),
    )
    .optional(),
  model_management: z
    .object({
      auto_unload_inactive_models: z.boolean().optional(),
      inactive_timeout_minutes: z.number().int().positive().optional(),
      memory_pressure_threshold: z.number().positive().lte(1).optional(),
      preload_models: z.array(z.string()).optional(),
      warm_standby: z.array(z.string()).optional(),
    })
    .optional(),
});

export type OllamaCatalog = z.infer<typeof ollamaCatalogSchema>;
