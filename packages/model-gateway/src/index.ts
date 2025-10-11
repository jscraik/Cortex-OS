// A2A Events for inter-package communication

// A2A Bus for native communication
export {
	createModelGatewayBus,
	createModelGatewaySchemaRegistry,
	type ModelGatewayBusConfig,
} from './a2a.js';
export {
	createMLXAdapter,
	type MLXAdapterApi,
} from './adapters/mlx-adapter.js';
export {
	createOllamaAdapter,
	type OllamaAdapterApi,
} from './adapters/ollama-adapter.js';
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
export {
	type ChatRequest,
	createOpenAIAgentsProvider,
	type OpenAIAgentsProvider,
	type OpenAIAgentsProviderConfig,
} from './providers/openai-agents.provider.js';
export { createServer, start } from './server.js';
