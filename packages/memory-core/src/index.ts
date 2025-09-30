export { LocalMemoryProvider } from './providers/LocalMemoryProvider.js';
export type {
  Memory,
  MemorySearchResult,
  MemoryRelationship,
  MemoryStats,
  MemoryAnalysisResult,
  MemoryGraph,
  MemoryProvider,
  MemoryCoreConfig,
  QdrantConfig,
  RelationshipType,
  MemoryProviderError,
} from './types.js';

// Factory function to create provider from environment
export function createMemoryProviderFromEnv(): LocalMemoryProvider {
  const config: import('./types.js').MemoryCoreConfig = {
    sqlitePath: process.env.MEMORY_DB_PATH || './data/unified-memories.db',
    defaultLimit: parseInt(process.env.MEMORY_DEFAULT_LIMIT || '10'),
    maxLimit: parseInt(process.env.MEMORY_MAX_LIMIT || '100'),
    defaultThreshold: parseFloat(process.env.MEMORY_DEFAULT_THRESHOLD || '0.5'),
    hybridWeight: parseFloat(process.env.MEMORY_HYBRID_WEIGHT || '0.6'),
    enableCircuitBreaker: process.env.MEMORY_ENABLE_CIRCUIT_BREAKER === 'true',
    circuitBreakerThreshold: parseInt(process.env.MEMORY_CIRCUIT_BREAKER_THRESHOLD || '5'),
    queueConcurrency: parseInt(process.env.MEMORY_QUEUE_CONCURRENCY || '10'),
    logLevel: (process.env.MEMORY_LOG_LEVEL as any) || 'info',
    embedDim: parseInt(process.env.EMBED_DIM || '384'),
  };

  // Add Qdrant config if available
  if (process.env.QDRANT_URL) {
    config.qdrant = {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collection: process.env.QDRANT_COLLECTION || 'local_memory_v1',
      embedDim: parseInt(process.env.EMBED_DIM || '384'),
      similarity: (process.env.SIMILARITY as 'Cosine' | 'Euclidean' | 'Dot') || 'Cosine',
      timeout: parseInt(process.env.QDRANT_TIMEOUT || '5000'),
    };
  }

  return new LocalMemoryProvider(config);
}