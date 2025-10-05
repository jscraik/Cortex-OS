// Cortex-OS A2A Events - Main Export
export const CORTEX_A2A_EVENTS_VERSION = '1.0.0';

export * from './agent-events';
// Core Event Types
export * from './api-events.js';
export * from './mcp-events.js';
export * from './rag-events';
export * from './routing-events.js';

// Routing and Utilities
export * from './routing';

import type {
	AgentStateChangedEvent,
	AgentTaskCompletedEvent,
	AgentTaskCreatedEvent,
} from './agent-events';
import type {
	ApiJobCreatedEvent,
	ApiRequestReceivedEvent,
	ApiRequestRoutedEvent,
	ApiResponseGeneratedEvent,
	ApiWebhookReceivedEvent,
} from './api-events.js';
import type {
	McpContextCreatedEvent,
	McpErrorEvent,
	McpToolExecutionEvent,
	McpToolResponseEvent,
} from './mcp-events.js';
import type {
	RagDocumentIndexedEvent,
	RagEmbeddingGeneratedEvent,
	RagQueryProcessedEvent,
} from './rag-events';

// Union type for all Cortex-OS events
export type CortexEvent =
	| ApiRequestReceivedEvent
	| ApiRequestRoutedEvent
	| ApiResponseGeneratedEvent
	| ApiWebhookReceivedEvent
	| ApiJobCreatedEvent
	| McpToolExecutionEvent
	| McpToolResponseEvent
	| McpContextCreatedEvent
	| McpErrorEvent
	| RagDocumentIndexedEvent
	| RagQueryProcessedEvent
	| RagEmbeddingGeneratedEvent
	| AgentTaskCreatedEvent
	| AgentTaskCompletedEvent
	| AgentStateChangedEvent;

// Comprehensive event type guard
export function isCortexEvent(data: unknown): data is CortexEvent {
	// We'll implement proper type checking based on event_type field
	return (
		data !== null &&
		typeof data === 'object' &&
		'event_type' in data &&
		typeof (data as { event_type: unknown }).event_type === 'string' &&
		(data as { event_type: string }).event_type.startsWith('cortex.')
	);
}

// Event type detection
export function getCortexEventType(data: unknown): string | null {
	if (!data || typeof data !== 'object' || !('event_type' in data)) {
		return null;
	}

	const eventType = (data as { event_type: unknown }).event_type;
	if (typeof eventType !== 'string') {
		return null;
	}

	return eventType.startsWith('cortex.') ? eventType : null;
}

// Export type helpers for external consumers
export type {
	// API Events
	ApiRequestReceivedEvent,
	ApiRequestRoutedEvent,
	ApiResponseGeneratedEvent,
	ApiWebhookReceivedEvent,
	ApiJobCreatedEvent,
	// MCP Events
	McpToolExecutionEvent,
	McpToolResponseEvent,
	McpContextCreatedEvent,
	McpErrorEvent,
	// RAG Events
	RagDocumentIndexedEvent,
	RagQueryProcessedEvent,
	RagEmbeddingGeneratedEvent,
	// Agent Events
	AgentTaskCreatedEvent,
	AgentTaskCompletedEvent,
	AgentStateChangedEvent,
	// Union type
	CortexEvent,
};
