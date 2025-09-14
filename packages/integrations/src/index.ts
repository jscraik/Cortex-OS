// Integrations Package - Main exports

// Core functionality (when implemented)
// export * from './core/index.js';
// export * from './types/index.js';

// A2A Events
export {
	type ApiCallEvent,
	createIntegrationsEvent,
	type DataSyncEvent,
	type IntegrationConnectedEvent,
	type WebhookReceivedEvent,
} from './events/integrations-events.js';
// MCP Integration
export { integrationsMcpTools } from './mcp/tools.js';
