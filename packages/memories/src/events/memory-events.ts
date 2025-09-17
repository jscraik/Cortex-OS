import { z } from 'zod';

/**
 * Memory-related A2A event schemas for inter-package communication
 */

export const MEMORY_EVENT_SOURCE = 'urn:cortex:memories';

// Memory Created Event
export const MemoryCreatedEventSchema = z.object({
	memoryId: z.string(),
	kind: z.string(),
	text: z.string(),
	tags: z.array(z.string()).optional(),
	namespace: z.string().optional(),
	createdAt: z.string(),
});

// Memory Retrieved Event
export const MemoryRetrievedEventSchema = z.object({
	memoryId: z.string(),
	query: z.string(),
	similarity: z.number().min(0).max(1),
	retrievedAt: z.string(),
});

// Memory Updated Event
export const MemoryUpdatedEventSchema = z.object({
	memoryId: z.string(),
	changes: z.object({
		text: z.string().optional(),
		tags: z.array(z.string()).optional(),
		metadata: z.record(z.unknown()).optional(),
	}),
	updatedAt: z.string(),
});

// Memory Deleted Event
export const MemoryDeletedEventSchema = z.object({
	memoryId: z.string(),
	deletedAt: z.string(),
});

// Export event type definitions
export type MemoryCreatedEvent = z.infer<typeof MemoryCreatedEventSchema>;
export type MemoryRetrievedEvent = z.infer<typeof MemoryRetrievedEventSchema>;
export type MemoryUpdatedEvent = z.infer<typeof MemoryUpdatedEventSchema>;
export type MemoryDeletedEvent = z.infer<typeof MemoryDeletedEventSchema>;

// Helper function to create memory events
export const createMemoryEvent = {
	created: (data: MemoryCreatedEvent) => ({
		type: 'memory.created' as const,
		data: MemoryCreatedEventSchema.parse(data),
	}),
	retrieved: (data: MemoryRetrievedEvent) => ({
		type: 'memory.retrieved' as const,
		data: MemoryRetrievedEventSchema.parse(data),
	}),
	updated: (data: MemoryUpdatedEvent) => ({
		type: 'memory.updated' as const,
		data: MemoryUpdatedEventSchema.parse(data),
	}),
	deleted: (data: MemoryDeletedEvent) => ({
		type: 'memory.deleted' as const,
		data: MemoryDeletedEventSchema.parse(data),
	}),
};
