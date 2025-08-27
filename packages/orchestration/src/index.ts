/**
 * Cortex OS Orchestration Package
 * Simplified exports focusing on PRP neural orchestration
 */

// Core types and interfaces
export type {
  AdaptiveConfig,
  AdaptiveDecision,
  Agent,
  AgentCapability,
  CoordinationResult,
  DatabaseConfig,
  DecisionContext,
  ExecutionPlan,
  LangChainConfig,
  LangChainResult,
  LangChainTool,
  MessageProtocol,
  MultiAgentConfig,
  MultiAgentState,
  Neo4jConfig,
  OrchestrationConfig,
  OrchestrationEvent,
  OrchestrationResult,
  OrchestrationState,
  OrchestrationStatistics,
  PerformanceMetrics,
  PlanningContext,
  PlanningResult,
  QdrantConfig,
  ReActConfig,
  ReActState,
  ReActStep,
  StrategicDecision,
  SynchronizationPoint,
  Task,
} from './types.js';

// Enums
export {
  AgentRole,
  CoordinationStrategy,
  DecisionStrategy,
  OrchestrationStrategy,
  ReActPhase,
  Schemas,
} from './types.js';

// Enum types
export type { LearningPattern } from './types.js';

// Utility defaults
export const OrchestrationDefaults = {
  maxConcurrentOrchestrations: 10,
  defaultStrategy: 'adaptive' as const,
  planningTimeout: 300000, // 5 minutes
  executionTimeout: 1800000, // 30 minutes
  qualityThreshold: 0.8,
  confidenceThreshold: 0.7,
};

// Version info
export const version = '1.0.0';
export const name = '@cortex-os/orchestration';

// PRP Neural Orchestration Engine
export { PRPOrchestrationEngine } from './prp-integration.js';
import type { OrchestrationConfig } from './types.js';

export function createPRPOrchestrationEngine(
  config?: Partial<OrchestrationConfig>,
): PRPOrchestrationEngine {
  return new PRPOrchestrationEngine(config);
}

// MLX agent integration
export { MLXAgent } from './integrations/mlx-agent.js';
export type { MLXAgentCapabilities } from './integrations/mlx-agent.js';
