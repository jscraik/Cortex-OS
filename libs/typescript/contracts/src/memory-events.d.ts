/**
 * Memory Event Contracts for A2A Communication
 * Contract-first definitions for Memory package events
 */
import { z } from 'zod';
export declare const MemoryEventTypes: {
	readonly ItemStored: 'memory.item.stored';
	readonly ItemRetrieved: 'memory.item.retrieved';
	readonly ItemUpdated: 'memory.item.updated';
	readonly ItemDeleted: 'memory.item.deleted';
	readonly QueryExecuted: 'memory.query.executed';
	readonly CacheEvicted: 'memory.cache.evicted';
	readonly StorageOptimized: 'memory.storage.optimized';
};
export declare const memoryItemStoredSchema: z.ZodObject<
	{
		itemId: z.ZodString;
		kind: z.ZodString;
		textLength: z.ZodNumber;
		tags: z.ZodArray<z.ZodString, 'many'>;
		encrypted: z.ZodDefault<z.ZodBoolean>;
		storageAdapter: z.ZodString;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		kind: string;
		itemId: string;
		textLength: number;
		tags: string[];
		encrypted: boolean;
		storageAdapter: string;
	},
	{
		timestamp: string;
		kind: string;
		itemId: string;
		textLength: number;
		tags: string[];
		storageAdapter: string;
		encrypted?: boolean | undefined;
	}
>;
export declare const memoryItemRetrievedSchema: z.ZodObject<
	{
		queryId: z.ZodString;
		itemIds: z.ZodArray<z.ZodString, 'many'>;
		query: z.ZodOptional<z.ZodString>;
		resultsCount: z.ZodNumber;
		responseTime: z.ZodNumber;
		cacheHit: z.ZodDefault<z.ZodBoolean>;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		queryId: string;
		itemIds: string[];
		resultsCount: number;
		responseTime: number;
		cacheHit: boolean;
		query?: string | undefined;
	},
	{
		timestamp: string;
		queryId: string;
		itemIds: string[];
		resultsCount: number;
		responseTime: number;
		query?: string | undefined;
		cacheHit?: boolean | undefined;
	}
>;
export declare const memoryItemUpdatedSchema: z.ZodObject<
	{
		itemId: z.ZodString;
		changes: z.ZodObject<
			{
				text: z.ZodDefault<z.ZodBoolean>;
				tags: z.ZodDefault<z.ZodBoolean>;
				metadata: z.ZodDefault<z.ZodBoolean>;
			},
			'strip',
			z.ZodTypeAny,
			{
				text: boolean;
				metadata: boolean;
				tags: boolean;
			},
			{
				text?: boolean | undefined;
				metadata?: boolean | undefined;
				tags?: boolean | undefined;
			}
		>;
		previousVersion: z.ZodOptional<z.ZodString>;
		newVersion: z.ZodString;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		changes: {
			text: boolean;
			metadata: boolean;
			tags: boolean;
		};
		itemId: string;
		newVersion: string;
		previousVersion?: string | undefined;
	},
	{
		timestamp: string;
		changes: {
			text?: boolean | undefined;
			metadata?: boolean | undefined;
			tags?: boolean | undefined;
		};
		itemId: string;
		newVersion: string;
		previousVersion?: string | undefined;
	}
>;
export declare const memoryItemDeletedSchema: z.ZodObject<
	{
		itemId: z.ZodString;
		kind: z.ZodString;
		cascade: z.ZodDefault<z.ZodBoolean>;
		backupCreated: z.ZodDefault<z.ZodBoolean>;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		kind: string;
		itemId: string;
		cascade: boolean;
		backupCreated: boolean;
	},
	{
		timestamp: string;
		kind: string;
		itemId: string;
		cascade?: boolean | undefined;
		backupCreated?: boolean | undefined;
	}
>;
export declare const memoryQueryExecutedSchema: z.ZodObject<
	{
		queryId: z.ZodString;
		query: z.ZodString;
		kind: z.ZodOptional<z.ZodString>;
		filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		resultsCount: z.ZodNumber;
		responseTime: z.ZodNumber;
		similarityThreshold: z.ZodOptional<z.ZodNumber>;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		queryId: string;
		query: string;
		resultsCount: number;
		responseTime: number;
		kind?: string | undefined;
		filters?: Record<string, unknown> | undefined;
		similarityThreshold?: number | undefined;
	},
	{
		timestamp: string;
		queryId: string;
		query: string;
		resultsCount: number;
		responseTime: number;
		kind?: string | undefined;
		filters?: Record<string, unknown> | undefined;
		similarityThreshold?: number | undefined;
	}
>;
export declare const memoryCacheEvictedSchema: z.ZodObject<
	{
		cacheKey: z.ZodString;
		reason: z.ZodEnum<
			['size-limit', 'time-expired', 'manual', 'memory-pressure']
		>;
		itemsEvicted: z.ZodNumber;
		spaceFreed: z.ZodNumber;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		cacheKey: string;
		reason: 'size-limit' | 'time-expired' | 'manual' | 'memory-pressure';
		itemsEvicted: number;
		spaceFreed: number;
	},
	{
		timestamp: string;
		cacheKey: string;
		reason: 'size-limit' | 'time-expired' | 'manual' | 'memory-pressure';
		itemsEvicted: number;
		spaceFreed: number;
	}
>;
export declare const memoryStorageOptimizedSchema: z.ZodObject<
	{
		optimizationId: z.ZodString;
		type: z.ZodEnum<['compression', 'indexing', 'cleanup', 'defragmentation']>;
		itemsProcessed: z.ZodNumber;
		spaceSaved: z.ZodNumber;
		duration: z.ZodNumber;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'cleanup' | 'compression' | 'indexing' | 'defragmentation';
		timestamp: string;
		duration: number;
		optimizationId: string;
		itemsProcessed: number;
		spaceSaved: number;
	},
	{
		type: 'cleanup' | 'compression' | 'indexing' | 'defragmentation';
		timestamp: string;
		duration: number;
		optimizationId: string;
		itemsProcessed: number;
		spaceSaved: number;
	}
>;
export type MemoryItemStoredEvent = z.infer<typeof memoryItemStoredSchema>;
export type MemoryItemRetrievedEvent = z.infer<
	typeof memoryItemRetrievedSchema
>;
export type MemoryItemUpdatedEvent = z.infer<typeof memoryItemUpdatedSchema>;
export type MemoryItemDeletedEvent = z.infer<typeof memoryItemDeletedSchema>;
export type MemoryQueryExecutedEvent = z.infer<
	typeof memoryQueryExecutedSchema
>;
export type MemoryCacheEvictedEvent = z.infer<typeof memoryCacheEvictedSchema>;
export type MemoryStorageOptimizedEvent = z.infer<
	typeof memoryStorageOptimizedSchema
>;
export declare const MemoryEventSchemas: {
	readonly 'memory.item.stored': z.ZodObject<
		{
			itemId: z.ZodString;
			kind: z.ZodString;
			textLength: z.ZodNumber;
			tags: z.ZodArray<z.ZodString, 'many'>;
			encrypted: z.ZodDefault<z.ZodBoolean>;
			storageAdapter: z.ZodString;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			kind: string;
			itemId: string;
			textLength: number;
			tags: string[];
			encrypted: boolean;
			storageAdapter: string;
		},
		{
			timestamp: string;
			kind: string;
			itemId: string;
			textLength: number;
			tags: string[];
			storageAdapter: string;
			encrypted?: boolean | undefined;
		}
	>;
	readonly 'memory.item.retrieved': z.ZodObject<
		{
			queryId: z.ZodString;
			itemIds: z.ZodArray<z.ZodString, 'many'>;
			query: z.ZodOptional<z.ZodString>;
			resultsCount: z.ZodNumber;
			responseTime: z.ZodNumber;
			cacheHit: z.ZodDefault<z.ZodBoolean>;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			queryId: string;
			itemIds: string[];
			resultsCount: number;
			responseTime: number;
			cacheHit: boolean;
			query?: string | undefined;
		},
		{
			timestamp: string;
			queryId: string;
			itemIds: string[];
			resultsCount: number;
			responseTime: number;
			query?: string | undefined;
			cacheHit?: boolean | undefined;
		}
	>;
	readonly 'memory.item.updated': z.ZodObject<
		{
			itemId: z.ZodString;
			changes: z.ZodObject<
				{
					text: z.ZodDefault<z.ZodBoolean>;
					tags: z.ZodDefault<z.ZodBoolean>;
					metadata: z.ZodDefault<z.ZodBoolean>;
				},
				'strip',
				z.ZodTypeAny,
				{
					text: boolean;
					metadata: boolean;
					tags: boolean;
				},
				{
					text?: boolean | undefined;
					metadata?: boolean | undefined;
					tags?: boolean | undefined;
				}
			>;
			previousVersion: z.ZodOptional<z.ZodString>;
			newVersion: z.ZodString;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			changes: {
				text: boolean;
				metadata: boolean;
				tags: boolean;
			};
			itemId: string;
			newVersion: string;
			previousVersion?: string | undefined;
		},
		{
			timestamp: string;
			changes: {
				text?: boolean | undefined;
				metadata?: boolean | undefined;
				tags?: boolean | undefined;
			};
			itemId: string;
			newVersion: string;
			previousVersion?: string | undefined;
		}
	>;
	readonly 'memory.item.deleted': z.ZodObject<
		{
			itemId: z.ZodString;
			kind: z.ZodString;
			cascade: z.ZodDefault<z.ZodBoolean>;
			backupCreated: z.ZodDefault<z.ZodBoolean>;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			kind: string;
			itemId: string;
			cascade: boolean;
			backupCreated: boolean;
		},
		{
			timestamp: string;
			kind: string;
			itemId: string;
			cascade?: boolean | undefined;
			backupCreated?: boolean | undefined;
		}
	>;
	readonly 'memory.query.executed': z.ZodObject<
		{
			queryId: z.ZodString;
			query: z.ZodString;
			kind: z.ZodOptional<z.ZodString>;
			filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
			resultsCount: z.ZodNumber;
			responseTime: z.ZodNumber;
			similarityThreshold: z.ZodOptional<z.ZodNumber>;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			queryId: string;
			query: string;
			resultsCount: number;
			responseTime: number;
			kind?: string | undefined;
			filters?: Record<string, unknown> | undefined;
			similarityThreshold?: number | undefined;
		},
		{
			timestamp: string;
			queryId: string;
			query: string;
			resultsCount: number;
			responseTime: number;
			kind?: string | undefined;
			filters?: Record<string, unknown> | undefined;
			similarityThreshold?: number | undefined;
		}
	>;
	readonly 'memory.cache.evicted': z.ZodObject<
		{
			cacheKey: z.ZodString;
			reason: z.ZodEnum<
				['size-limit', 'time-expired', 'manual', 'memory-pressure']
			>;
			itemsEvicted: z.ZodNumber;
			spaceFreed: z.ZodNumber;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			cacheKey: string;
			reason: 'size-limit' | 'time-expired' | 'manual' | 'memory-pressure';
			itemsEvicted: number;
			spaceFreed: number;
		},
		{
			timestamp: string;
			cacheKey: string;
			reason: 'size-limit' | 'time-expired' | 'manual' | 'memory-pressure';
			itemsEvicted: number;
			spaceFreed: number;
		}
	>;
	readonly 'memory.storage.optimized': z.ZodObject<
		{
			optimizationId: z.ZodString;
			type: z.ZodEnum<
				['compression', 'indexing', 'cleanup', 'defragmentation']
			>;
			itemsProcessed: z.ZodNumber;
			spaceSaved: z.ZodNumber;
			duration: z.ZodNumber;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			type: 'cleanup' | 'compression' | 'indexing' | 'defragmentation';
			timestamp: string;
			duration: number;
			optimizationId: string;
			itemsProcessed: number;
			spaceSaved: number;
		},
		{
			type: 'cleanup' | 'compression' | 'indexing' | 'defragmentation';
			timestamp: string;
			duration: number;
			optimizationId: string;
			itemsProcessed: number;
			spaceSaved: number;
		}
	>;
};
//# sourceMappingURL=memory-events.d.ts.map
