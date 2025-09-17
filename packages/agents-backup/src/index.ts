/**
 * Main entry point for the Cortex-OS Agents package
 *
 * Exports all public APIs following the architecture plan:
 * - Single-focused agents (code analysis, test generation, documentation)
 * - MCP provider system with fallback chains
 * - A2A event integration
 * - Type-safe contracts and validation
 * - Archon MCP integration for external tools and knowledge base
 */

export type {
	CodeAnalysisAgentConfig,
	CodeAnalysisInput,
	CodeAnalysisOutput,
} from './agents/code-analysis-agent';
// Agents - Single-focused implementations
export { createCodeAnalysisAgent } from './agents/code-analysis-agent';
export type {
	DocumentationAgentConfig,
	DocumentationInput,
	DocumentationOutput,
} from './agents/documentation-agent';
export { createDocumentationAgent } from './agents/documentation-agent';
export type {
	LangGraphInput,
	LangGraphOutput,
} from './agents/langgraph-agent';
export { createLangGraphAgent } from './agents/langgraph-agent';
export type {
	SecurityAgentConfig,
	SecurityInput,
	SecurityOutput,
} from './agents/security-agent';
// Security Agent (LlamaGuard-backed via MLX or provider chain)
export { createSecurityAgent } from './agents/security-agent';
export type {
	TestGenerationAgentConfig,
	TestGenerationInput,
	TestGenerationOutput,
} from './agents/test-generation-agent';
export { createTestGenerationAgent } from './agents/test-generation-agent';
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
} from './events/agent-events';
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
} from './events/agent-events';
export {
	AgentMCPClient,
	createAgentMCPClient,
	MCPCapableAgent,
} from './integrations/mcp-client';
export type { DSPConfig } from './lib/dsp';
export { DynamicSpeculativePlanner } from './lib/dsp';
export type {
	CloudEvent,
	EventBusConfig,
	EventSubscriber,
} from './lib/event-bus';
// Event Bus Integration
export {
	createAgentEventBus,
	createEventBus,
	createEventBusForEnvironment,
	createEventPublisher,
	createEventSubscriber,
} from './lib/event-bus';
export { getSecret, redactSecrets } from './lib/secret-store';
// Core types and interfaces
export type {
	Agent as BaseAgent,
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
} from './lib/types';
// Error types
export { AgentError, ProviderError, ValidationError } from './lib/types';
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
} from './lib/utils';
// Validation utilities
export {
	createValidator,
	executionContextSchema,
	parseAndValidateJSON,
	validateExecutionContext,
	validateInput,
	validateOutput,
	validateSchema,
} from './lib/validate';
export type {
	AgentOrchestrator,
	OrchestrationResult,
	OrchestratorConfig,
	Workflow,
	WorkflowTask,
} from './orchestration/agent-orchestrator';
// Orchestration Layer
export {
	createOrchestrator,
	WorkflowBuilder,
} from './orchestration/agent-orchestrator';
export type { FallbackChainConfig } from './providers/fallback-chain';
export {
	createFallbackChain,
	createLocalFallbackChain,
	createStandardFallbackChain,
} from './providers/fallback-chain';
export type { MCPProviderConfig } from './providers/mcp-provider';
// Providers - Full implementation with MLX integration
export {
	createMCPProvider,
	createMCPProviders,
	discoverMCPProviders,
} from './providers/mcp-provider';
export type {
	MemoryStatus,
	MLXProviderConfig,
	ThermalStatus,
} from './providers/mlx-provider/index';
export {
	createAutoMLXProvider,
	createMLXProvider,
	getMLXMemoryStatus,
	getMLXThermalStatus,
} from './providers/mlx-provider/index';
// MCP Integration for Archon
export type {
	Agent,
	AgentResult,
	ArchonIntegrationConfig,
	ContentType,
	DocumentMetadata,
	ExternalTool,
	KnowledgeSearchFilters,
	KnowledgeSearchResult,
	MCPClientConfig,
	MCPClientEvents,
	Priority,
	Task,
	TaskCreationResult,
	TaskStatus,
	ToolParameter,
} from './types/mcp';

// Package information
export const AGENTS_PACKAGE_VERSION = '0.1.0';
export const ARCHITECTURE_STATUS = 'COMPLETE';

/**
 * Package status information
 */
export const packageInfo = {
	version: AGENTS_PACKAGE_VERSION,
	architecture: 'MCP + A2A + Single-Focused Agents + Archon Integration',
	status: ARCHITECTURE_STATUS,
	capabilities: [
		'code-analysis',
		'test-generation',
		'documentation',
		'mcp-tools',
		'external-search',
	] as const,
	providers: ['mlx', 'ollama', 'frontier', 'archon'] as const,
	features: [
		'thermal-aware-fallback',
		'mcp-tool-integration',
		'a2a-event-emission',
		'schema-validation',
		'provider-chaining',
		'archon-knowledge-search',
		'archon-task-management',
		'external-document-upload',
	] as const,
};

// MCP Tools for external AI agent integration
export type {
	AgentTool,
	CreateAgentInput,
	ExecuteAgentInput,
	GetAgentStatusInput,
	ListAgentsInput,
} from './mcp/tools';
export { agentMcpTools } from './mcp/tools';

// Implementations are provided and exported above per TDD plan
