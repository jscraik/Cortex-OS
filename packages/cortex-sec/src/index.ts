// Cortex Security Compliance Package - Main exports
// Refactored to focus on compliance planning and orchestration
// Static policies moved to .semgrep/policies/

// A2A Events for compliance and security
export {
	type ComplianceViolationEvent,
	createCortexSecEvent,
	type SecurityPolicyUpdatedEvent,
	type SecurityScanStartedEvent,
	type VulnerabilityFoundEvent,
} from './events/cortex-sec-events.js';

// MCP tool definitions for security automation
export type { CortexSecTool, CortexSecToolResponse } from './mcp/tools.js';
export {
	CORTEX_SEC_TOOL_ALLOWLIST,
	cortexSecMcpTools,
} from './mcp/tools.js';

// Security Integration Service
export {
	createSecurityIntegrationService,
	type SecurityIntegrationInput,
	type SecurityIntegrationResult,
	type SecurityIntegrationService,
} from './nO/security-integration.js';

// Compliance Planning and Risk Management
export {
	type CompliancePlanner,
	type CompliancePlanningInput,
	type CompliancePlanningResult,
	createCompliancePlanner,
	type SecurityActionPlan,
} from './planning/compliance-planner.js';

// Policy Utilities (now reads from .semgrep/policies/)
export {
	getPolicyThresholds,
	loadSecurityPolicies,
	type PolicyThresholds,
	type SecurityPolicyConfig,
} from './utils/policy-loader.js';
