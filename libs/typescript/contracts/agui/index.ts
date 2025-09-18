/**
 * AGUI (AI Graphical User Interface) Contracts
 *
 * Shared event schemas and types for AGUI-related A2A communication
 * across the Cortex-OS monorepo.
 */

// Re-export event creators
export * from './event-creators.js';
export {
	createAguiAiRecommendationEvent,
	createAguiComponentRenderedEvent,
	createAguiEvent,
	createAguiStateChangedEvent,
	createAguiUserInteractionEvent,
} from './event-creators.js';
// Re-export all event schemas and types
export * from './events.js';
// Convenient re-exports for common use cases
export {
	AGUI_EVENT_TYPES,
	type AguiEvent,
	type AguiEventType,
} from './events.js';
