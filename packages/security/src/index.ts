// SPIFFE/SPIRE Implementation

// A2A Bus for native communication
export {
	createSecurityBus,
	createSecuritySchemaRegistry,
	type SecurityBusConfig,
} from './a2a.js';
// Security Events
export * from './events/security-event';
export * from './events/security-events';
// MCP Tools for external AI agent integration
export {
	SecurityTool,
	SecurityToolError,
	SecurityToolResponse,
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
export * from './mtls/index';
export * from './spiffe/index';
// Types and Interfaces
export * from './types';
// Security Utilities
export * from './utils/index';
// Workload Identity Management
export * from './workload-identity/index';
