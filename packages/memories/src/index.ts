// Adapters (exported for consumers to avoid cross-domain src imports elsewhere)

// A2A Bus for native communication
export {
	createMemoryBus,
	createMemorySchemaRegistry,
	type MemoryBusConfig,
} from './a2a.js';
export { EncryptedStore } from './adapters/store.encrypted.js';
export { PolicyEncryptedStore } from './adapters/store.encrypted.policy.js';
export { LayeredMemoryStore } from './adapters/store.layered.js';
export { LocalMemoryStore } from './adapters/store.localmemory.js';
export { InMemoryStore } from './adapters/store.memory.js';
export { PrismaStore } from './adapters/store.prisma/client.js';
export { SQLiteStore } from './adapters/store.sqlite.js';
export {
	createStoreFromEnv,
	resolveStoreKindFromEnv,
} from './config/store-from-env.js';
export * from './domain/types.js';
export type {
	MemoryCreatedEvent,
	MemoryDeletedEvent,
	MemoryRetrievedEvent,
	MemoryUpdatedEvent,
} from './events/memory-events.js';
// A2A Events for inter-package communication
export {
	createMemoryEvent,
	MemoryCreatedEventSchema,
	MemoryDeletedEventSchema,
	MemoryRetrievedEventSchema,
	MemoryUpdatedEventSchema,
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
export * from './ports/Embedder.js';
export * from './ports/MemoryStore.js';
export * from './service/embedder-factory.js';
export * from './service/memory-service.js';
export * from './service/store-factory.js';
