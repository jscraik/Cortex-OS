// Adapters (exported for consumers to avoid cross-domain src imports elsewhere)

// A2A Bus for native communication
export {
	createMemoryBus,
	createMemorySchemaRegistry,
	type MemoryBusConfig
} from './a2a.js';
export { SQLiteStore } from './adapters/store.sqlite.js';
export {
	MemoryStoreRAGAdapter,
	RAGEmbedderAdapter,
	RAGIntegration
} from './adapters/rag-integration.js';
export {
	createRestApiAdapter,
	createRestApiMemoryStore,
	FetchHttpClient, RestApiAdapter, RestApiMemoryStore, type ApiResponse,
	type AuthMethod, type HealthCheckResponse,
	type HttpClient,
	type MemoryCreateRequest,
	type MemoryCreateResponse,
	type MemoryDeleteRequest,
	type MemoryGetRequest,
	type MemoryGetResponse,
	type MemoryPurgeRequest,
	type MemoryPurgeResponse,
	type MemorySearchRequest,
	type MemorySearchResponse,
	type MemoryUpdateRequest,
	type RateLimitInfo,
	type RequestOptions, // interface type
	type RestApiConfig,
	type RestApiError
} from './adapters/rest-api/index.js';
export { EncryptedStore } from './adapters/store.encrypted.js';
export { PolicyEncryptedStore } from './adapters/store.encrypted.policy.js';
export { LayeredMemoryStore } from './adapters/store.layered.js';
export { LocalMemoryStore } from './adapters/store.localmemory.js';
export { InMemoryStore } from './adapters/store.memory.js';
export { PrismaStore } from './adapters/store.prisma/client.js';
export {
	createStoreFromEnv,
	resolveStoreKindFromEnv
} from './config/store-from-env.js';
export * from './domain/types.js';
export type {
	MemoryCreatedEvent,
	MemoryDeletedEvent,
	MemoryRetrievedEvent,
	MemoryUpdatedEvent
} from './events/memory-events.js';
// A2A Events for inter-package communication
export {
	createMemoryEvent,
	MemoryCreatedEventSchema,
	MemoryDeletedEventSchema,
	MemoryRetrievedEventSchema,
	MemoryUpdatedEventSchema
} from './events/memory-events.js';
// MCP Tools for external AI agent integration
export {
	MAX_MEMORY_TEXT_LENGTH,
	memoryDeleteTool,
	memoryDeleteToolSchema,
	memoryGetTool,
	memoryGetToolSchema,
	memoryListTool,
	memoryListToolSchema,
	memoryMcpTools,
	memorySearchTool,
	memorySearchToolSchema,
	memoryStatsTool,
	memoryStatsToolSchema,
	memoryStoreTool,
	memoryStoreToolSchema,
	memoryUpdateTool,
	memoryUpdateToolSchema
} from './mcp/tools.js';
// Observability for monitoring and tracing
export {
	createMemoryObservability,
	ObservableMemoryStore
} from './observability/observable-store.js';
export {
	createDefaultObservabilityConfig,
	createObservabilityProvider,
	OpenTelemetryObservabilityProvider
} from './observability/provider.js';
export * from './observability/types.js';

// Migration and versioning system
export {
	DefaultMigrationManager,
	type MigrationManager,
	type Migration,
	type MigrationResult,
	type RollbackResult,
	type ValidationResult,
	type SchemaVersion,
	type SchemaChange,
	type MigrationHistory,
	type MetadataStore
} from './service/migration-service.js';
export { VersionedMemoryStore } from './adapters/store.versioned.js';
export { InMemoryMetadataStore } from './adapters/metadata.in-memory.js';
export { allMigrations } from './migrations/predefined-migrations.js';
export * from './domain/migration.js';
export * from './ports/Embedder.js';
export * from './ports/MemoryStore.js';
export * from './service/embedder-factory.js';
export * from './service/memory-service.js';
export * from './service/store-factory.js';

