// Cortex Security Package - Main exports

// A2A Events
export {
        CORTEX_SEC_EVENT_SOURCE,
        type ComplianceViolationEvent,
        createCortexSecEvent,
        type SecurityPolicyUpdatedEvent,
        type SecurityScanStartedEvent,
        type VulnerabilityFoundEvent,
} from './events/cortex-sec-events.js';
export {
        createSecurityEventPublisher,
        type PublishEnvelope,
        type SecurityEventPublisher,
} from './events/security-event-publisher.js';

// MCP Integration
export {
        CORTEX_SEC_TOOL_ALLOWLIST,
        cortexSecMcpTools,
        type CortexSecTool,
        type CortexSecToolResponse,
} from './mcp/tools.js';

// Planning utilities
export {
        mergeComplianceState,
        summarizeCompliance,
        type ComplianceSeverity,
        type ComplianceState,
        type ComplianceSummary,
        type ComplianceViolation,
} from './planning/compliance-strategy.js';
