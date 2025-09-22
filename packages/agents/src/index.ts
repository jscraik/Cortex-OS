// A2A Events and Bus for inter-package communication

// A2A Agent
export {
	AGENTS_A2A_SKILLS,
	AgentsAgent,
	agentsAgent,
	createAgentsAgent
} from './AgentsAgent.js';
export {
	AgentsBusIntegration,
	createAgentsBusIntegration
} from './AgentsBusIntegration.js';
// A2A Bus Integration
export { createAgentsBus, createAgentsSchemaRegistry, type AgentsBusConfig } from './a2a.js';
// Export the main agent class
export { CortexAgent } from './CortexAgentLangGraph.js';
// Export types
export type * from './lib/types';
// Export LangGraphJS Master Agent
export {
	createMasterAgentGraph,
	type MasterAgentGraph,
	type SubAgentConfig
} from './MasterAgent.js';
// Export monitoring
export * from './monitoring';

// Export brAInwav TDD Plan Implementation Components
// Testing Infrastructure
export {
	MockAgent,
	MockTool, PerformanceTestRunner, TestAssertions, TestEnvironment,
	TestSuiteRunner
} from './testing/test-utilities.js';

// Observability Implementation
export {
	MetricsCollector, ObservabilitySystem, TracingSystem, observability
} from './lib/observability.js';

// Health Check System
export {
	HealthCheck, HealthMonitor, healthMonitor
} from './lib/health-check.js';

// Enhanced Error Handling and Security
export {
	AgentError, ErrorCategory,
	ErrorSeverity, ProductionErrorHandler,
	ResourceManager, setupErrorBoundary
} from './lib/error-handling.js';

export {
	InputSanitizer,
	LogRedactor,
	createSecurityMiddleware
} from './lib/security.js';

// Memory Management
export {
	EventStore,
	GlobalMemoryManager, MemoryBoundedStore,
	RateLimiter
} from './lib/memory-manager.js';

// Circuit Breaker
export {
	CircuitBreaker,
	CircuitBreakerFactory
} from './lib/circuit-breaker.js';

