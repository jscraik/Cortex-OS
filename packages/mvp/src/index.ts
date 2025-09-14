// MVP (Minimum Viable Product) Package - Main exports

// Core functionality (when implemented)
// export * from './core/index.js';
// export * from './types/index.js';

// A2A Events
export {
	createMvpEvent,
	type FeatureActivatedEvent,
	type FeedbackSubmittedEvent,
	type MetricTrackedEvent,
	type UserActionEvent,
} from './events/mvp-events.js';
// MCP Integration
export { mvpMcpTools } from './mcp/tools.js';
