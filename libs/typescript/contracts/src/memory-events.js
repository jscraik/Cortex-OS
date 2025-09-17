/**
 * Memory Event Contracts for A2A Communication
 * Contract-first definitions for Memory package events
 */
import { z } from 'zod';
// Memory Event Type Constants
export const MemoryEventTypes = {
	ItemStored: 'memory.item.stored',
	ItemRetrieved: 'memory.item.retrieved',
	ItemUpdated: 'memory.item.updated',
	ItemDeleted: 'memory.item.deleted',
	QueryExecuted: 'memory.query.executed',
	CacheEvicted: 'memory.cache.evicted',
	StorageOptimized: 'memory.storage.optimized',
};
// Event Data Schemas
export const memoryItemStoredSchema = z.object({
	itemId: z.string().min(1),
	kind: z.string(),
	textLength: z.number().int().nonnegative(),
	tags: z.array(z.string()),
	encrypted: z.boolean().default(false),
	storageAdapter: z.string(),
	timestamp: z.string().datetime(),
});
export const memoryItemRetrievedSchema = z.object({
	queryId: z.string().min(1),
	itemIds: z.array(z.string()),
	query: z.string().optional(),
	resultsCount: z.number().int().nonnegative(),
	responseTime: z.number().positive(),
	cacheHit: z.boolean().default(false),
	timestamp: z.string().datetime(),
});
export const memoryItemUpdatedSchema = z.object({
	itemId: z.string().min(1),
	changes: z.object({
		text: z.boolean().default(false),
		tags: z.boolean().default(false),
		metadata: z.boolean().default(false),
	}),
	previousVersion: z.string().optional(),
	newVersion: z.string(),
	timestamp: z.string().datetime(),
});
export const memoryItemDeletedSchema = z.object({
	itemId: z.string().min(1),
	kind: z.string(),
	cascade: z.boolean().default(false),
	backupCreated: z.boolean().default(false),
	timestamp: z.string().datetime(),
});
export const memoryQueryExecutedSchema = z.object({
	queryId: z.string().min(1),
	query: z.string(),
	kind: z.string().optional(),
	filters: z.record(z.unknown()).optional(),
	resultsCount: z.number().int().nonnegative(),
	responseTime: z.number().positive(),
	similarityThreshold: z.number().optional(),
	timestamp: z.string().datetime(),
});
export const memoryCacheEvictedSchema = z.object({
	cacheKey: z.string(),
	reason: z.enum(['size-limit', 'time-expired', 'manual', 'memory-pressure']),
	itemsEvicted: z.number().int().nonnegative(),
	spaceFreed: z.number().int().nonnegative(),
	timestamp: z.string().datetime(),
});
export const memoryStorageOptimizedSchema = z.object({
	optimizationId: z.string().min(1),
	type: z.enum(['compression', 'indexing', 'cleanup', 'defragmentation']),
	itemsProcessed: z.number().int().nonnegative(),
	spaceSaved: z.number().int().nonnegative(),
	duration: z.number().positive(),
	timestamp: z.string().datetime(),
});
// Event Schema Registry
export const MemoryEventSchemas = {
	[MemoryEventTypes.ItemStored]: memoryItemStoredSchema,
	[MemoryEventTypes.ItemRetrieved]: memoryItemRetrievedSchema,
	[MemoryEventTypes.ItemUpdated]: memoryItemUpdatedSchema,
	[MemoryEventTypes.ItemDeleted]: memoryItemDeletedSchema,
	[MemoryEventTypes.QueryExecuted]: memoryQueryExecutedSchema,
	[MemoryEventTypes.CacheEvicted]: memoryCacheEvictedSchema,
	[MemoryEventTypes.StorageOptimized]: memoryStorageOptimizedSchema,
};
//# sourceMappingURL=memory-events.js.map
