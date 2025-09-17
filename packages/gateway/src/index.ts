// A2A Events for inter-package communication

// A2A Bus for native communication
export {
	createGatewayBus,
	createGatewaySchemaRegistry,
	type GatewayBusConfig
} from './a2a.js';
export {
	RateLimitExceededEventSchema,
	RequestReceivedEventSchema,
	ResponseSentEventSchema,
	RouteCreatedEventSchema, createGatewayEvent
} from './events/gateway-events.js';
export type {
	RateLimitExceededEvent,
	RequestReceivedEvent,
	ResponseSentEvent,
	RouteCreatedEvent
} from './events/gateway-events.js';
export { createAgentRoute } from './lib/create-agent-route.js';
// MCP Tools for external AI agent integration
export { gatewayMcpTools } from './mcp/tools.js';
export type {
	CreateRouteInput,
	GatewayTool,
	GetHealthInput,
	GetRoutesInput,
	UpdateRouteInput
} from './mcp/tools.js';
export { start } from './server.js';

