import { Qwen3Embedder } from "./embed/qwen3";
import { MultiModelGenerator } from "./generation/multi-model";
import { embedQuery } from "./lib/embed-query";
import { generateAnswer } from "./lib/generate-answer";
import { rerankDocs } from "./lib/rerank-docs";
import { retrieveDocs } from "./lib/retrieve-docs";
import { Qwen3Reranker } from "./pipeline/qwen3-reranker";
export function createEnhancedRAGPipeline(config) {
	const finalConfig = {
		embeddingModelSize: "4B",
		topK: 10,
		rerank: { enabled: true, topK: 5 },
		...config,
	};
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
		embedQuery: (query) => embedQuery(embedder, query),
		retrieveDocs: (queryEmbedding, docs) =>
			retrieveDocs(embedder, queryEmbedding, docs, finalConfig.topK),
		rerankDocs: (query, docs) =>
			rerankDocs(reranker, query, docs, finalConfig.rerank.topK),
		generateAnswer: (query, docs, options) =>
			generateAnswer(generator, query, docs, options),
	};
}
//# sourceMappingURL=enhanced-pipeline.js.map
