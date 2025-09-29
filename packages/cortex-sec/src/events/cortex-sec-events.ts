import { createEnvelope } from '@cortex-os/a2a-contracts/envelope.js';
import { z } from 'zod';

/**
 * Cortex Security-related A2A event schemas for inter-package communication
 */

export const CORTEX_SEC_EVENT_SOURCE = 'https://cortex-os.dev/cortex-sec';
const CORTEX_SEC_EVENT_SCHEMA_VERSION = '1';
const CORTEX_SEC_EVENT_CONTENT_TYPE = 'application/json';

const schemaUri = (eventType: string) =>
	`https://schemas.cortex-os.dev/cortex-sec/${eventType}/v${CORTEX_SEC_EVENT_SCHEMA_VERSION}`;

// Security Scan Started Event
export const SecurityScanStartedEventSchema = z.object({
	scanId: z.string(),
	targetPath: z.string(),
	scanType: z.enum(['semgrep', 'dependency', 'secrets', 'compliance']),
	rulesets: z.array(z.string()).optional(),
	startedAt: z.string(),
});

// Vulnerability Found Event
export const VulnerabilityFoundEventSchema = z.object({
	scanId: z.string(),
	vulnerabilityId: z.string(),
	severity: z.enum(['info', 'warning', 'error', 'critical']),
	type: z.string(),
	file: z.string(),
	lineNumber: z.number().int().positive().optional(),
	description: z.string(),
	foundAt: z.string(),
});

// Compliance Violation Event
export const ComplianceViolationEventSchema = z.object({
	scanId: z.string(),
	violationId: z.string(),
	standard: z.enum(['owasp-top10', 'cwe-25', 'nist', 'iso27001']),
	rule: z.string(),
	file: z.string(),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	violatedAt: z.string(),
	advisory: z
		.string()
		.default('brAInwav security advisory: prioritize remediation for sustained compliance.'),
});

// Security Policy Updated Event
export const SecurityPolicyUpdatedEventSchema = z.object({
	policyId: z.string(),
	policyType: z.enum(['owasp', 'atlas', 'custom']),
	version: z.string(),
	changes: z.array(z.string()),
	updatedAt: z.string(),
});

// Export event type definitions
export type SecurityScanStartedEvent = z.infer<typeof SecurityScanStartedEventSchema>;
export type VulnerabilityFoundEvent = z.infer<typeof VulnerabilityFoundEventSchema>;
export type ComplianceViolationEvent = z.infer<typeof ComplianceViolationEventSchema>;
export type SecurityPolicyUpdatedEvent = z.infer<typeof SecurityPolicyUpdatedEventSchema>;

// Helper function to create security events
export const createCortexSecEvent = {
	scanStarted: (data: SecurityScanStartedEvent) =>
		createEnvelope({
			type: 'cortex_sec.scan.started' as const,
			source: CORTEX_SEC_EVENT_SOURCE,
			data: SecurityScanStartedEventSchema.parse(data),
			datacontenttype: CORTEX_SEC_EVENT_CONTENT_TYPE,
			dataschema: schemaUri('cortex_sec.scan.started'),
		}),
	vulnerabilityFound: (data: VulnerabilityFoundEvent) =>
		createEnvelope({
			type: 'cortex_sec.vulnerability.found' as const,
			source: CORTEX_SEC_EVENT_SOURCE,
			data: VulnerabilityFoundEventSchema.parse(data),
			datacontenttype: CORTEX_SEC_EVENT_CONTENT_TYPE,
			dataschema: schemaUri('cortex_sec.vulnerability.found'),
		}),
	complianceViolation: (data: ComplianceViolationEvent) =>
		createEnvelope({
			type: 'cortex_sec.compliance.violation' as const,
			source: CORTEX_SEC_EVENT_SOURCE,
			data: ComplianceViolationEventSchema.parse(data),
			datacontenttype: CORTEX_SEC_EVENT_CONTENT_TYPE,
			dataschema: schemaUri('cortex_sec.compliance.violation'),
		}),
	policyUpdated: (data: SecurityPolicyUpdatedEvent) =>
		createEnvelope({
			type: 'cortex_sec.policy.updated' as const,
			source: CORTEX_SEC_EVENT_SOURCE,
			data: SecurityPolicyUpdatedEventSchema.parse(data),
			datacontenttype: CORTEX_SEC_EVENT_CONTENT_TYPE,
			dataschema: schemaUri('cortex_sec.policy.updated'),
		}),
};
