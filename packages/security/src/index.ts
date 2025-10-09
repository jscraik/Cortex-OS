// SPIFFE/SPIRE Implementation

// A2A Bus for native communication
export {
	createSecurityBus,
	createSecuritySchemaRegistry,
	type SecurityBusConfig,
} from './a2a.js';
export * from './budget/budget-manager.js';
// Capability Tokens & Budgets
export * from './capabilities/capability-token.js';
// Security Events
export * from './events/security-event.js';
export * from './events/security-events.js';
export type {
	SecurityTool,
	SecurityToolError,
	SecurityToolResponse,
} from './mcp/tools.js';
// MCP Tools for external AI agent integration
export {
	securityAccessControlTool,
	securityAccessControlToolSchema,
	securityAuditTool,
	securityAuditToolSchema,
	securityEncryptionTool,
	securityEncryptionToolSchema,
	securityMcpTools,
	securityPolicyValidationTool,
	securityPolicyValidationToolSchema,
	securityThreatDetectionTool,
	securityThreatDetectionToolSchema,
	securityToolSchemas,
} from './mcp/tools.js';
// mTLS Implementation
export * from './mtls/index.js';
export * from './spiffe/index.js';
// Types and Interfaces
export * from './types.js';
// Security Utilities
export * from './utils/index.js';
// Workload Identity Management
export * from './workload-identity/index.js';
