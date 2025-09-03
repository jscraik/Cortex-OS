/**
 * Document with relevance score for reranking
 */
export interface RerankDocument {
    id: string;
    text: string;
    score?: number;
}
/**
 * Interface for reranking documents based on query relevance
 */
export interface Reranker {
    /**
     * Rerank documents based on relevance to the query
     * @param query The search query
     * @param documents Documents to rerank
     * @param topK Number of top documents to return
     * @returns Reranked documents with relevance scores
     */
    rerank(query: string, documents: RerankDocument[], topK?: number): Promise<RerankDocument[]>;
}
/**
 * Configuration for Qwen3 reranker
 */
export interface Qwen3RerankOptions {
    /** Model path or identifier */
    modelPath?: string;
    /** Maximum sequence length for input */
    maxLength?: number;
    /** Number of top documents to return */
    topK?: number;
    /** Batch size for processing */
    batchSize?: number;
    /** Cache directory for model files */
    cacheDir?: string;
    /** Custom Python executable path */
    pythonPath?: string;
    /** Timeout in milliseconds for Python process */
    timeoutMs?: number;
}
/**
 * Qwen3-4B reranker for improved document relevance scoring
 *
 * Uses the Qwen3-Reranker-4B model to provide more accurate relevance
 * scoring between queries and documents compared to simple cosine similarity.
 */
export declare class Qwen3Reranker implements Reranker {
    private readonly modelPath;
    private readonly maxLength;
    private readonly topK;
    private readonly batchSize;
    private readonly cacheDir;
    private readonly pythonPath;
    private readonly timeoutMs;
    constructor(options?: Qwen3RerankOptions);
    /**
     * Rerank documents using Qwen3-Reranker-4B model
     */
    rerank(query: string, documents: RerankDocument[], topK?: number): Promise<RerankDocument[]>;
    /**
     * Score a batch of documents against the query
     */
    private scoreBatch;
    /**
     * Load the embedded Python script used for reranking
     */
    private getPythonScript;
    /**
     * Create batches from documents array
     */
    private createBatches;
    /**
     * Cleanup resources if needed
     */
    close(): Promise<void>;
}
/**
 * Factory function for easy Qwen3 reranker creation
 */
export declare function createQwen3Reranker(options?: Qwen3RerankOptions): Qwen3Reranker;
/**
 * Preset configurations for different use cases
 */
export declare const Qwen3RerankPresets: {
    /** Fast reranking with smaller batch size */
    readonly fast: {
        readonly batchSize: 16;
        readonly maxLength: 256;
        readonly topK: 5;
    };
    /** Balanced performance and accuracy */
    readonly balanced: {
        readonly batchSize: 32;
        readonly maxLength: 512;
        readonly topK: 10;
    };
    /** High accuracy with larger context */
    readonly accurate: {
        readonly batchSize: 8;
        readonly maxLength: 1024;
        readonly topK: 20;
    };
};
//# sourceMappingURL=qwen3-reranker.d.ts.map
