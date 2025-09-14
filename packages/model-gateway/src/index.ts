// A2A Events for inter-package communication
export type {
	ModelErrorEvent,
	ModelResponseEvent,
	ProviderHealthEvent,
	RequestRoutedEvent,
} from './events/model-gateway-events.js';
export {
	createModelGatewayEvent,
	ModelErrorEventSchema,
	ModelResponseEventSchema,
	ProviderHealthEventSchema,
	RequestRoutedEventSchema,
} from './events/model-gateway-events.js';

// MCP Tools for external AI agent integration
export type {
	GetAvailableModelsInput,
	GetModelInfoInput,
	ModelGatewayTool,
	RouteRequestInput,
	ValidateRequestInput,
} from './mcp/tools.js';
export { modelGatewayMcpTools } from './mcp/tools.js';
export { createModelRouter } from './model-router.js';
export { createServer, start } from './server.js';
