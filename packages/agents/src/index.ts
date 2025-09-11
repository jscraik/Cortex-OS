/**
 * Main entry point for the Cortex-OS Agents package
 *
 * Exports all public APIs following the architecture plan:
 * - Single-focused agents (code analysis, test generation, documentation)
 * - MCP provider system with fallback chains
 * - A2A event integration
 * - Type-safe contracts and validation
 */

export type {
	CodeAnalysisAgentConfig,
	CodeAnalysisInput,
	CodeAnalysisOutput,
} from './agents/code-analysis-agent.js';
// Agents - Single-focused implementations
export { createCodeAnalysisAgent } from './agents/code-analysis-agent.js';
export type {
	DocumentationAgentConfig,
	DocumentationInput,
	DocumentationOutput,
} from './agents/documentation-agent.js';
export { createDocumentationAgent } from './agents/documentation-agent.js';
export type {
	LangGraphInput,
	LangGraphOutput,
} from './agents/langgraph-agent.js';
export { createLangGraphAgent } from './agents/langgraph-agent.js';
export type {
	SecurityAgentConfig,
	SecurityInput,
	SecurityOutput,
} from './agents/security-agent.js';
// Security Agent (LlamaGuard-backed via MLX or provider chain)
export { createSecurityAgent } from './agents/security-agent.js';
export type {
	TestGenerationAgentConfig,
	TestGenerationInput,
	TestGenerationOutput,
} from './agents/test-generation-agent.js';
export { createTestGenerationAgent } from './agents/test-generation-agent.js';
export type {
	AgentCompletedEvent,
	AgentFailedEvent,
	AgentStartedEvent,
	EventType,
	MCPServerConnectedEvent,
	MCPServerDisconnectedEvent,
	MemoryPressureEvent,
	ProviderFallbackEvent,
	ProviderSuccessEvent,
	ThermalThrottleEvent,
} from './events/agent-events.js';
// Event schemas and types
export {
	agentCompletedEventSchema,
	agentEventCatalog,
	agentFailedEventSchema,
	agentStartedEventSchema,
	mcpServerConnectedEventSchema,
	mcpServerDisconnectedEventSchema,
	memoryPressureEventSchema,
	providerFallbackEventSchema,
	providerSuccessEventSchema,
	thermalThrottleEventSchema,
	// workflow event schemas
	// (available via agentEventCatalog indexing)
} from './events/agent-events.js';
export type { DSPConfig } from './lib/dsp.js';
export { DynamicSpeculativePlanner } from './lib/dsp.js';
export type {
	CloudEvent,
	EventBusConfig,
	EventSubscriber,
} from './lib/event-bus.js';
// Event Bus Integration
export {
	createAgentEventBus,
	createEventBus,
	createEventBusForEnvironment,
	createEventPublisher,
	createEventSubscriber,
	validateAgentEvent,
} from './lib/event-bus.js';
export { getSecret, redactSecrets } from './lib/secret-store.js';
// Core types and interfaces
export type {
	Agent,
	AgentCapability,
	AgentDependencies,
	EventBus,
	EventSubscription,
	ExecutionContext,
	GenerateOptions,
	GenerateResult,
	MCPClient,
	MCPServerInfo,
	ModelProvider,
	ProviderChainConfig,
} from './lib/types.js';
// Error types
export { AgentError, ProviderError, ValidationError } from './lib/types.js';
// Utility functions
export {
	debounce,
	deepClone,
	estimateTokens,
	filterDefined,
	generateAgentId,
	generateTraceId,
	isDefined,
	retry,
	safeGet,
	sleep,
	throttle,
	timeout,
	truncateToTokens,
	withTimeout,
} from './lib/utils.js';
// Validation utilities
export {
	createValidator,
	executionContextSchema,
	parseAndValidateJSON,
	validateExecutionContext,
	validateInput,
	validateOutput,
	validateSchema,
} from './lib/validate.js';
export type {
	AgentOrchestrator,
	OrchestrationResult,
	OrchestratorConfig,
	Workflow,
	WorkflowTask,
} from './orchestration/agent-orchestrator.js';
// Orchestration Layer
export {
	createOrchestrator,
	WorkflowBuilder,
} from './orchestration/agent-orchestrator.js';
export type { FallbackChainConfig } from './providers/fallback-chain.js';
export {
	createFallbackChain,
	createLocalFallbackChain,
	createStandardFallbackChain,
} from './providers/fallback-chain.js';
export type { MCPProviderConfig } from './providers/mcp-provider.js';
// Providers - Full implementation with MLX integration
export {
	createMCPProvider,
	createMCPProviders,
	discoverMCPProviders,
} from './providers/mcp-provider.js';
export type {
	MemoryStatus,
	MLXProviderConfig,
	ThermalStatus,
} from './providers/mlx-provider/index.js';
export {
	createAutoMLXProvider,
	createMLXProvider,
	getMLXMemoryStatus,
	getMLXThermalStatus,
} from './providers/mlx-provider/index.js';

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
