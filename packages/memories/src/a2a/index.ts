// Core types and interfaces

// Event publisher implementation
export { MemoryA2AEventPublisher } from './event-publisher.js';
// A2A-aware store wrapper
export { A2AAwareMemoryStore } from './store-wrapper.js';
export type {
	A2AEventPublisher,
	A2AEventPublisherConfig,
	MemoryCreatedData,
	MemoryDeletedData,
	MemoryErrorData,
	MemoryEvent,
	MemoryEventType,
	MemoryPurgedData,
	MemorySearchedData,
	MemoryUpdatedData,
} from './types.js';
