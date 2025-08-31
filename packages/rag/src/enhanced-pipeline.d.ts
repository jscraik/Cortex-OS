import { type ModelSpec } from './generation/multi-model';
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
export declare function createEnhancedRAGPipeline(config: EnhancedRAGConfig): {
    embedQuery: (query: string) => Promise<any>;
    retrieveDocs: (queryEmbedding: number[], docs: Document[]) => Promise<Document[]>;
    rerankDocs: (query: string, docs: Document[]) => Promise<Document[]>;
    generateAnswer: (query: string, docs: Document[], options?: {
        contextPrompt?: string;
        maxContextLength?: number;
    }) => Promise<{
        answer: string;
        provider: "mlx" | "ollama";
        usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    }>;
};
//# sourceMappingURL=enhanced-pipeline.d.ts.map