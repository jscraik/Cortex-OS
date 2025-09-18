import { z } from 'zod';

/**
 * Cortex Security-related A2A event schemas for inter-package communication
 */

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
	scanStarted: (data: SecurityScanStartedEvent) => ({
		type: 'cortex_sec.scan.started' as const,
		data: SecurityScanStartedEventSchema.parse(data),
	}),
	vulnerabilityFound: (data: VulnerabilityFoundEvent) => ({
		type: 'cortex_sec.vulnerability.found' as const,
		data: VulnerabilityFoundEventSchema.parse(data),
	}),
	complianceViolation: (data: ComplianceViolationEvent) => ({
		type: 'cortex_sec.compliance.violation' as const,
		data: ComplianceViolationEventSchema.parse(data),
	}),
	policyUpdated: (data: SecurityPolicyUpdatedEvent) => ({
		type: 'cortex_sec.policy.updated' as const,
		data: SecurityPolicyUpdatedEventSchema.parse(data),
	}),
};
