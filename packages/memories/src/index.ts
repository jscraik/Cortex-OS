// Adapters (exported for consumers to avoid cross-domain src imports elsewhere)

// A2A Bus for native communication
export {
	createMemoryBus,
	createMemorySchemaRegistry,
	type MemoryBusConfig,
} from './a2a.js';
export { InMemoryMetadataStore } from './adapters/metadata.in-memory.js';
export {
	MemoryStoreRAGAdapter,
	RAGEmbedderAdapter,
	RAGIntegration,
} from './adapters/rag-integration.js';
export {
	FetchHttpClient,
	// interface type
	RestApiAdapter,
	RestApiMemoryStore,
	createRestApiAdapter,
	createRestApiMemoryStore,
	type ApiResponse,
	type AuthMethod,
	type HealthCheckResponse,
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
	type RequestOptions,
	type RestApiConfig,
	type RestApiError,
} from './adapters/rest-api/index.js';
export {
	RealtimeMemoryServer,
	type ConnectionInfo,
	type ConnectionMetrics,
	type ServerConfig,
} from './adapters/server.realtime.js';
export {
	DeduplicatingMemoryStore,
	type DeduplicationConfig,
	type DeduplicationStats,
} from './adapters/store.deduplicating.js';
export { EncryptedStore } from './adapters/store.encrypted.js';
export { PolicyEncryptedStore } from './adapters/store.encrypted.policy.js';
export {
	GraphMemoryStore,
	type Centrality,
	type Community,
	type GraphQuery,
	type GraphResult,
	type MemoryNode,
	type Relationship,
} from './adapters/store.graph.js';
export {
	HierarchicalMemoryStore,
	type HierarchicalQuery,
	type HierarchicalVectorQuery,
	type HierarchyMetadata,
} from './adapters/store.hierarchical.js';
export {
	HybridSearchMemoryStore,
	type HybridQuery,
	type HybridSearchConfig,
	type HybridSearchResponse,
	type HybridSearchResult,
	type QueryAnalytics,
} from './adapters/store.hybrid-search.js';
export {
	IntelligentMemoryStore,
	type ConsolidationResult,
	type InsightsRequest,
	type InsightsResult,
	type IntelligentConfig,
	type IntelligentQuery,
	type IntelligentSearchResult,
	type KeyPoint,
	type SummaryRequest,
	type SummaryResult,
	type SynthesisRequest,
	type SynthesisResult,
	type Timeline,
	type TimelineEvent,
} from './adapters/store.intelligent.js';
export { LayeredMemoryStore } from './adapters/store.layered.js';
export { LocalMemoryStore } from './adapters/store.localmemory.js';
export { InMemoryStore } from './adapters/store.memory.js';
export {
	PluginAwareMemoryStore,
	type Plugin,
	type PluginExecutionError,
	type PluginHook,
	type PluginMetrics,
} from './adapters/store.plugin.js';
export { PrismaStore } from './adapters/store.prisma/client.js';
export { QdrantMemoryStore } from './adapters/store.qdrant.js';
export {
	RateLimitedMemoryStore,
	type ClientUsage,
	type RateLimitConfig,
	type RateLimitContext,
	type RateLimitInfo,
	type UsageStats,
} from './adapters/store.rate-limit.js';
export {
	SecureMemoryStore,
	type AuditLogEntry,
	type SecureStoreConfig,
} from './adapters/store.secure.js';
export { SQLiteStore } from './adapters/store.sqlite.js';
export {
	StreamingMemoryStore,
	type ChangeEvent,
	type ChangeLogEntry,
	type ChangeLogQuery,
	type Subscription,
} from './adapters/store.streaming.js';
export { TemplateMemoryStore, type TemplateStoreConfig } from './adapters/store.template.js';
export { VersionedMemoryStore } from './adapters/store.versioned.js';
export {
	createStoreForKind,
	createStoreFromEnv,
	normalizeStoreKind,
	resolveStoreKindFromEnv,
} from './config/store-from-env.js';
export * from './domain/migration.js';
export * from './domain/templates.js';
export * from './domain/types.js';
export type {
	MemoryCreatedEvent,
	MemoryDeletedEvent,
	MemoryRetrievedEvent,
	MemoryUpdatedEvent,
} from './events/memory-events.js';
// A2A Events for inter-package communication
export {
	MemoryCreatedEventSchema,
	MemoryDeletedEventSchema,
	MemoryRetrievedEventSchema,
	MemoryUpdatedEventSchema,
	createMemoryEvent,
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
	memoryUpdateToolSchema,
} from './mcp/tools.js';
export { allMigrations } from './migrations/predefined-migrations.js';
// Observability for monitoring and tracing
export {
	ObservableMemoryStore,
	createMemoryObservability,
} from './observability/observable-store.js';
export {
	OpenTelemetryObservabilityProvider,
	createDefaultObservabilityConfig,
	createObservabilityProvider,
} from './observability/provider.js';
export * from './observability/types.js';
// Example plugins
export * from './plugins/index.js';
export * from './ports/Embedder.js';
export * from './ports/MemoryStore.js';
export * from './service/embedder-factory.js';
export * from './service/memory-service.js';
// Migration and versioning system
export {
	DefaultMigrationManager,
	type MetadataStore,
} from './service/migration-service.js';
export * from './service/store-factory.js';
export { TemplateMigrationService, type MigrationPlan } from './service/template-migration.js';
export { TemplateRegistry } from './service/template-registry.js';
