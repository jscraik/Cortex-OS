// A2A Events and Bus for inter-package communication
export {
	type AgentsBusConfig,
	createAgentsBus,
	createAgentsSchemaRegistry,
} from './a2a.js';

// Export the main agent class
export { CortexAgent } from './CortexAgent';
export * from './tools';

// Re-export types for convenience
export type { CloudEvent } from './utils/a2aBridge';
export type { ModelCapability, ModelRouterConfig } from './utils/modelRouter';
