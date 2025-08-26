/**
 * Cortex OS Orchestration Package
 * Complete orchestration system for AI agent coordination
 */

// Main orchestration engine
export { OrchestrationEngine } from './orchestration-engine.js';

// Individual engines
export { AdaptiveDecisionEngine } from './adaptive-decision.js';
export { LangChainEngine } from './langchain-engine.js';
export { MultiAgentCoordinationEngine } from './multi-agent-coordination.js';
export { ReActPlanningEngine } from './react-planning.js';

// Core types and interfaces
export type {
  AdaptiveConfig,
  // Adaptive decision types
  AdaptiveDecision,
  Agent,
  AgentCapability,
  CoordinationResult,
  // Database types
  DatabaseConfig,
  DecisionContext,
  // Orchestration types
  ExecutionPlan,
  LangChainConfig,
  LangChainResult,
  // LangChain types
  LangChainTool,
  MessageProtocol,
  MultiAgentConfig,
  // Multi-agent types
  MultiAgentState,
  Neo4jConfig,
  OrchestrationConfig,
  OrchestrationEvent,
  OrchestrationResult,
  OrchestrationState,
  OrchestrationStatistics,
  // Performance types
  PerformanceMetrics,
  // Context types
  PlanningContext,
  // Result types
  PlanningResult,
  QdrantConfig,
  ReActConfig,
  ReActState,
  // ReAct types
  ReActStep,
  StrategicDecision,
  SynchronizationPoint,
  // Basic types
  Task,
} from './types.js';

// Enums (can be exported normally)
export {
  AgentRole,
  CoordinationStrategy,
  DecisionStrategy,
  OrchestrationStrategy,
  ReActPhase,
  Schemas,
} from './types.js';

// Enums that need type export
export type { LearningPattern } from './types.js';

// Utility functions and constants
export const OrchestrationDefaults = {
  maxConcurrentOrchestrations: 10,
  defaultStrategy: 'adaptive' as const,
  planningTimeout: 300000, // 5 minutes
  executionTimeout: 1800000, // 30 minutes
  qualityThreshold: 0.8,
  confidenceThreshold: 0.7,
};

/**
 * Create a new orchestration engine with default configuration
 */
import { OrchestrationEngine } from './orchestration-engine.js';
import type { OrchestrationConfig } from './types.js';

export function createOrchestrationEngine(
  config?: Partial<OrchestrationConfig>,
): OrchestrationEngine {
  return new OrchestrationEngine(config);
}

/**
 * Version information
 */
export const version = '1.0.0';
export const name = '@cortex-os/orchestration';

// Export new production agent orchestration components
export { MLXAgent } from './integrations/mlx-agent.js';
export type { MLXAgentCapabilities } from './integrations/mlx-agent.js';
export { A2AProtocol } from './protocols/a2a-protocol.js';
export type {
  A2AConfig,
  A2AMessage,
  MLXConfig,
  MLXInferenceRequest,
  MLXInferenceResponse,
} from './protocols/a2a-protocol.js';

// Export PRP Neural Orchestration Engine (recommended for new implementations)
export { PRPOrchestrationEngine } from './prp-integration.js';

/**
 * Create PRP-powered orchestration engine (replaces legacy multi-framework approach)
 */
export function createPRPOrchestrationEngine(
  config?: Partial<OrchestrationConfig>,
): PRPOrchestrationEngine {
  return new PRPOrchestrationEngine(config);
}
