/**
 * @file_path packages/retrieval-layer/src/index.ts
 * @description Main exports for the retrieval layer package
 */

// Core types and interfaces
export * from "./types";

// Retriever implementations
export { FaissRetriever } from "./retrievers/faiss";

// Reranker implementations
export { LocalReranker } from "./rerankers/local";

// Main retrieval system
export { RetrievalSystem } from "./system";

// Cache managers
export { MemoryCacheManager } from "./cache/memory";
export { IncrementalIndexCache } from "./cache/incremental";

// Utility functions
export * from "./utils";

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
