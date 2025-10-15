// A2A Events and Bus for inter-package communication

// A2A Agent
export {
	AGENTS_A2A_SKILLS,
	AgentsAgent,
	agentsAgent,
	createAgentsAgent,
} from './AgentsAgent.js';
export {
	AgentsBusIntegration,
	createAgentsBusIntegration,
} from './AgentsBusIntegration.js';
// A2A Bus Integration
export { type AgentsBusConfig, createAgentsBus, createAgentsSchemaRegistry } from './a2a.js';
export { type AgentRunContext, runAgent } from './base/runAgent.js';
// Export the main agent class
export { CortexAgent } from './CortexAgentLangGraph.js';
export { assertPromptMeta } from './contracts/assertPromptMeta.js';
// File-based agent templates loader
export {
	type AgentTemplate,
	AgentTemplateError,
	type AgentTemplateMap,
	loadAgentTemplates,
} from './file-agent-loader.js';
// Circuit Breaker
export {
	CircuitBreaker,
	CircuitBreakerFactory,
} from './lib/circuit-breaker.js';
// Enhanced Error Handling and Security
export {
	AgentError,
	ErrorCategory,
	ErrorSeverity,
	ProductionErrorHandler,
	ResourceManager,
	setupErrorBoundary,
} from './lib/error-handling.js';
// Health Check System
export {
	HealthCheck,
	HealthMonitor,
	healthMonitor,
} from './lib/health-check.js';
// Memory Management
export {
	EventStore,
	GlobalMemoryManager,
	MemoryBoundedStore,
	RateLimiter,
} from './lib/memory-manager.js';
// Observability Implementation
export {
	MetricsCollector,
	ObservabilitySystem,
	observability,
	TracingSystem,
} from './lib/observability.js';
export { createSecurityMiddleware, InputSanitizer, LogRedactor } from './lib/security.js';
// Export types
export type * from './lib/types.js';
// Export LangGraphJS Master Agent
export {
	createMasterAgentGraph,
	type MasterAgentGraph,
	type SubAgentConfig,
} from './MasterAgent.js';
// Modern agent system
export {
	createModernAgentSystem,
	type ModernAgentSystem,
	type ModernAgentSystemConfig,
	type Planner,
	type PlannerExecutionResult,
	type PlannerGoal,
} from './modern-agent-system/index.js';
// Export monitoring
export * from './monitoring';
export type { Subagent as ContractSubagent } from './nO/contracts.js';
export {
	type LoadedSubagents,
	type LoadSubagentsOptions,
	loadSubagents,
	type SubagentToolBinding,
	type SubagentToolsOptions,
	subagentTools,
} from './subagents/api.js';
// Subagent tooling exports for orchestration integration
export {
	createAutoDelegateTool,
	materializeSubagentTool,
	type Tool as SubagentToolDefinition,
	type ToolResponse as SubagentToolResponse,
} from './subagents/SubagentTool.js';
// Export brAInwav TDD Plan Implementation Components
// Testing Infrastructure
export {
	MockAgent,
	MockTool,
	PerformanceTestRunner,
	TestAssertions,
	TestEnvironment,
	TestSuiteRunner,
} from './testing/test-utilities.js';
export {
	createEmailNotifier,
	type EmailNotifier,
	type EmailNotificationRequest,
	type EmailNotificationResult,
	EmailNotificationError,
	EmailTemplateNotFoundError,
	InMemoryEmailTemplateStore,
	type EmailTemplate,
	type EmailTemplateRenderer,
	type IdempotencyStore,
} from './communications/email-notifier.js';
