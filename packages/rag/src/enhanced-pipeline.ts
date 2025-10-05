import { Qwen3Embedder } from './embed/qwen3.js';
import { type ModelSpec, MultiModelGenerator } from './generation/multi-model.js';
import { enhancedRAGConfigSchema, validateConfig } from './lib/config-validation.js';
import { embedQuery } from './lib/embed-query.js';
import { type GenerateAnswerOptions, generateAnswer } from './lib/generate-answer.js';
import { rerankDocs } from './lib/rerank-docs.js';
import { retrieveDocs } from './lib/retrieve-docs.js';
import type { Document } from './lib/types.js';
import { Qwen3Reranker } from './pipeline/qwen3-reranker.js';

export interface EnhancedRAGConfig {
	embeddingModelSize?: '0.6B' | '4B' | '8B';
	generationModel: ModelSpec;
	topK?: number;
	rerank?: {
		enabled: boolean;
		topK?: number;
	};
}

export function createEnhancedRAGPipeline(config: EnhancedRAGConfig) {
	// Validate configuration
	try {
		validateConfig(enhancedRAGConfigSchema, config, 'EnhancedRAG');
	} catch (error) {
		throw new Error(`EnhancedRAG configuration validation failed: ${(error as Error).message}`);
	}

	const finalConfig = {
		embeddingModelSize: '4B',
		topK: 10,
		rerank: { enabled: true, topK: 5 },
		...config,
	} as Required<EnhancedRAGConfig>;

	const embedder = new Qwen3Embedder({
		modelSize: finalConfig.embeddingModelSize,
	});
	const reranker = new Qwen3Reranker();
	const generator = new MultiModelGenerator({
		model: finalConfig.generationModel,
		defaultConfig: {
			maxTokens: 2048,
			temperature: 0.7,
			topP: 0.9,
		},
		timeout: 30000,
	});

	return {
		embedQuery: (query: string) => embedQuery(embedder, query),
		retrieveDocs: (queryEmbedding: number[], docs: Document[]) =>
			retrieveDocs(embedder, queryEmbedding, docs, finalConfig.topK ?? 10),
		rerankDocs: (query: string, docs: Document[]) =>
			rerankDocs(reranker, query, docs, finalConfig.rerank?.topK ?? 5),
		generateAnswer: (query: string, docs: Document[], options?: GenerateAnswerOptions) =>
			generateAnswer(generator, query, docs, options),
	};
}
