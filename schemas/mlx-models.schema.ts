import { z } from 'zod';

const modelEntry = z.object({
	name: z.string(),
	path: z.string(),
	context_length: z.number().int().positive().optional(),
	quantization: z.string().optional(),
	dimensions: z.number().int().positive().optional(),
	max_tokens: z.number().int().positive().optional(),
	max_pairs: z.number().int().positive().optional(),
	recommended_for: z.array(z.string()),
	supports_vision: z.boolean().optional(),
	type: z.string().optional(),
});

export const mlxModelsSchema = z.object({
	embedding_models: z.record(modelEntry),
	reranker_models: z.record(modelEntry),
	chat_models: z.record(modelEntry),
	safety_models: z.record(modelEntry),
	default_models: z.object({
		embedding: z.string(),
		reranker: z.string(),
		chat: z.string(),
		safety: z.string(),
	}),
});

export type MlxModels = z.infer<typeof mlxModelsSchema>;
