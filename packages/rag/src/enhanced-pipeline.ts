import { Qwen3Embedder } from './embed/qwen3';
import { MultiModelGenerator, type ModelSpec } from './generation/multi-model';
import { Qwen3Reranker } from './pipeline/qwen3-reranker';
import { embedQuery } from './lib/embed-query';
import { retrieveDocs } from './lib/retrieve-docs';
import { rerankDocs } from './lib/rerank-docs';
import { generateAnswer } from './lib/generate-answer';
import type { Document } from './lib/types';

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
  const finalConfig = {
    embeddingModelSize: '4B',
    topK: 10,
    rerank: { enabled: true, topK: 5 },
    ...config,
  } as Required<EnhancedRAGConfig>;

  const embedder = new Qwen3Embedder({ modelSize: finalConfig.embeddingModelSize });
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
      retrieveDocs(embedder, queryEmbedding, docs, finalConfig.topK),
    rerankDocs: (query: string, docs: Document[]) =>
      rerankDocs(reranker, query, docs, finalConfig.rerank.topK),
    generateAnswer: (
      query: string,
      docs: Document[],
      options?: { contextPrompt?: string; maxContextLength?: number },
    ) => generateAnswer(generator, query, docs, options),
  };
}
