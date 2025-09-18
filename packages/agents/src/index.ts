// A2A Events and Bus for inter-package communication

// A2A Agent
export {
  AGENTS_A2A_SKILLS,
  AgentsAgent,
  agentsAgent,
  createAgentsAgent
} from './AgentsAgent.js';

// A2A Bus Integration
export {
  createAgentsBus,
  createAgentsSchemaRegistry, type AgentsBusConfig
} from './a2a.js';
export {
  AgentsBusIntegration,
  createAgentsBusIntegration
} from './AgentsBusIntegration.js';

// Export the main agent classes
export { CortexAgent } from './CortexAgent';
export { CortexAgent as CortexAgentLegacy } from './CortexAgent';
export { CortexAgent as CortexAgentLangGraph } from './CortexAgentLangGraph';
// Export types
export type * from './lib/types';
// Export LangGraphJS Master Agent
export {
  createMasterAgentGraph,
  type MasterAgentGraph,
  type SubAgentConfig
} from './MasterAgent.js';

