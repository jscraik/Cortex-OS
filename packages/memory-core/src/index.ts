export {
	CheckpointManager,
	type CheckpointManagerOptions,
	type CheckpointRuntimePolicy,
	createCheckpointManager,
	ensureCheckpointSchema,
	resolveCheckpointPolicy,
} from './checkpoints/index.js';
export type {
        StoreMemoryInput,
        StoreMemoryResult,
        SearchMemoryInput,
        SearchMemoryResult,
        GetMemoryInput,
        GetMemoryResult,
        DeleteMemoryInput,
        DeleteMemoryResult,
        HealthStatus,
        MemoryProvider,
} from './provider/MemoryProvider.js';
export type {
        CheckpointBranchRequest,
        CheckpointBranchResult,
        CheckpointConfig,
        CheckpointContext,
        CheckpointListPage,
        CheckpointSnapshot,
        Memory,
        MemoryAnalysisResult,
        MemoryCoreConfig,
        MemoryGraph,
        MemoryMetadata,
        MemoryProviderError,
        MemoryRelationship,
        MemorySearchResult,
        MemoryStats,
        QdrantConfig,
        RelationshipType,
} from './types.js';
export { LocalMemoryProvider } from './providers/LocalMemoryProvider.js';
export { RemoteMemoryProvider } from './providers/RemoteMemoryProvider.js';
export {
	createGraphRAGIngestService,
	type GraphRAGIngestRequest,
	type GraphRAGIngestResult,
	GraphRAGIngestService,
} from './services/GraphRAGIngestService.js';
export {
	createGraphRAGService,
	type GraphRAGQueryRequest,
	type GraphRAGResult,
	GraphRAGService,
	type GraphRAGServiceConfig,
} from './services/GraphRAGService.js';

import { LocalMemoryProvider } from './providers/LocalMemoryProvider.js';
import { RemoteMemoryProvider } from './providers/RemoteMemoryProvider.js';

// Factory function to create provider from environment
export function createMemoryProviderFromEnv(): LocalMemoryProvider | RemoteMemoryProvider {
	const remoteBaseUrl = process.env.LOCAL_MEMORY_BASE_URL;

	if (remoteBaseUrl) {
		return new RemoteMemoryProvider({
			baseUrl: remoteBaseUrl,
			apiKey: process.env.LOCAL_MEMORY_API_KEY,
		});
	}

	const config: import('./types.js').MemoryCoreConfig = {
		sqlitePath: process.env.MEMORY_DB_PATH || './data/unified-memories.db',
		defaultLimit: parseInt(process.env.MEMORY_DEFAULT_LIMIT || '10', 10),
		maxLimit: parseInt(process.env.MEMORY_MAX_LIMIT || '100', 10),
		maxOffset: parseInt(process.env.MEMORY_MAX_OFFSET || '1000', 10),
		defaultThreshold: parseFloat(process.env.MEMORY_DEFAULT_THRESHOLD || '0.5'),
		hybridWeight: parseFloat(process.env.MEMORY_HYBRID_WEIGHT || '0.6'),
		enableCircuitBreaker: process.env.MEMORY_ENABLE_CIRCUIT_BREAKER === 'true',
		circuitBreakerThreshold: parseInt(process.env.MEMORY_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
		queueConcurrency: parseInt(process.env.MEMORY_QUEUE_CONCURRENCY || '10', 10),
		logLevel: (process.env.MEMORY_LOG_LEVEL as any) || 'info',
		embedDim: parseInt(process.env.EMBED_DIM || '384', 10),
	};

	// Add Qdrant config if available
	if (process.env.QDRANT_URL) {
		config.qdrant = {
			url: process.env.QDRANT_URL,
			apiKey: process.env.QDRANT_API_KEY,
			collection: process.env.QDRANT_COLLECTION || 'local_memory_v1',
			embedDim: parseInt(process.env.EMBED_DIM || '384', 10),
			similarity: (process.env.SIMILARITY as 'Cosine' | 'Euclidean' | 'Dot') || 'Cosine',
			timeout: parseInt(process.env.QDRANT_TIMEOUT || '5000', 10),
		};
	}

	return new LocalMemoryProvider(config);
}
