/**
 * Main entry point for the Cortex-OS Agents package
 *
 * Exports all public APIs following the architecture plan:
 * - Single-focused agents (code analysis, test generation, documentation)
 * - MCP provider system with fallback chains
 * - A2A event integration
 * - Type-safe contracts and validation
 */

// Core types and interfaces
export type {
  Agent,
  AgentCapability,
  ModelProvider,
  GenerateOptions,
  GenerateResult,
  ExecutionContext,
  AgentDependencies,
  EventBus,
  MCPClient,
  MCPServerInfo,
  ProviderChainConfig,
} from './lib/types.js';

// Error types
export { AgentError, ProviderError, ValidationError } from './lib/types.js';

// Validation utilities
export {
  validateSchema,
  validateInput,
  validateOutput,
  parseAndValidateJSON,
  createValidator,
  validateExecutionContext,
  executionContextSchema,
} from './lib/validate.js';

// Utility functions
export {
  generateAgentId,
  generateTraceId,
  sleep,
  timeout,
  withTimeout,
  retry,
  debounce,
  throttle,
  deepClone,
  isDefined,
  filterDefined,
  safeGet,
  estimateTokens,
  truncateToTokens,
} from './lib/utils.js';
export { getSecret, redactSecrets } from './lib/secret-store.js';

// Event schemas and types
export {
  agentEventCatalog,
  agentStartedEventSchema,
  agentCompletedEventSchema,
  agentFailedEventSchema,
  providerSuccessEventSchema,
  providerFallbackEventSchema,
  thermalThrottleEventSchema,
  memoryPressureEventSchema,
  mcpServerConnectedEventSchema,
  mcpServerDisconnectedEventSchema,
  // workflow event schemas
  // (available via agentEventCatalog indexing)
} from './events/agent-events.js';

export type {
  AgentStartedEvent,
  AgentCompletedEvent,
  AgentFailedEvent,
  ProviderSuccessEvent,
  ProviderFallbackEvent,
  ThermalThrottleEvent,
  MemoryPressureEvent,
  MCPServerConnectedEvent,
  MCPServerDisconnectedEvent,
  EventType,
} from './events/agent-events.js';

// Providers - Full implementation with MLX integration
export {
  createMCPProvider,
  createMCPProviders,
  discoverMCPProviders,
} from './providers/mcp-provider.js';
export type { MCPProviderConfig } from './providers/mcp-provider.js';

export {
  createMLXProvider,
  createAutoMLXProvider,
  getMLXThermalStatus,
  getMLXMemoryStatus,
} from './providers/mlx-provider/index.js';
export type { MLXProviderConfig, ThermalStatus, MemoryStatus } from './providers/mlx-provider/index.js';

export {
  createFallbackChain,
  createStandardFallbackChain,
  createLocalFallbackChain,
} from './providers/fallback-chain.js';
export type { FallbackChainConfig } from './providers/fallback-chain.js';

// Event Bus Integration
export {
  createEventBus,
  createAgentEventBus,
  createEventBusForEnvironment,
  validateAgentEvent,
  createEventPublisher,
  createEventSubscriber,
} from './lib/event-bus.js';
export type { CloudEvent, EventBusConfig, EventSubscriber } from './lib/event-bus.js';
export type { EventSubscription } from './lib/types.js';

// Agents - Single-focused implementations
export { createCodeAnalysisAgent } from './agents/code-analysis-agent.js';
export type {
  CodeAnalysisInput,
  CodeAnalysisOutput,
  CodeAnalysisAgentConfig,
} from './agents/code-analysis-agent.js';

export { createTestGenerationAgent } from './agents/test-generation-agent.js';
export type {
  TestGenerationInput,
  TestGenerationOutput,
  TestGenerationAgentConfig,
} from './agents/test-generation-agent.js';

export { createDocumentationAgent } from './agents/documentation-agent.js';
export type {
  DocumentationInput,
  DocumentationOutput,
  DocumentationAgentConfig,
} from './agents/documentation-agent.js';

// Security Agent (LlamaGuard-backed via MLX or provider chain)
export { createSecurityAgent } from './agents/security-agent.js';
export type {
  SecurityInput,
  SecurityOutput,
  SecurityAgentConfig,
} from './agents/security-agent.js';

// Orchestration Layer
export { createOrchestrator, WorkflowBuilder } from './orchestration/agent-orchestrator.js';
export type {
  AgentOrchestrator,
  WorkflowTask,
  Workflow,
  OrchestrationResult,
  OrchestratorConfig,
} from './orchestration/agent-orchestrator.js';

// Package information
export const AGENTS_PACKAGE_VERSION = '0.1.0';
export const ARCHITECTURE_STATUS = 'COMPLETE';

/**
 * Package status information
 */
export const packageInfo = {
  version: AGENTS_PACKAGE_VERSION,
  architecture: 'MCP + A2A + Single-Focused Agents',
  status: ARCHITECTURE_STATUS,
  capabilities: ['code-analysis', 'test-generation', 'documentation'] as const,
  providers: ['mlx', 'ollama', 'frontier'] as const,
  features: [
    'thermal-aware-fallback',
    'mcp-tool-integration',
    'a2a-event-emission',
    'schema-validation',
    'provider-chaining',
  ] as const,
};

// Implementations are provided and exported above per TDD plan
