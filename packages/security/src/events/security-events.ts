import { z } from 'zod';

/**
 * Security-related A2A event schemas for inter-package communication
 */

export const SECURITY_EVENT_SOURCE = 'urn:cortex:security';

// Security Access Event
export const SecurityAccessEventSchema = z.object({
	accessId: z.string(),
	subjectId: z.string(),
	resourceId: z.string(),
	action: z.string(),
	decision: z.enum(['allow', 'deny']),
	riskScore: z.number().min(0).max(100),
	environment: z.enum(['development', 'staging', 'production']).optional(),
	evaluatedAt: z.string(),
});

// Security Policy Violation Event
export const SecurityPolicyViolationEventSchema = z.object({
	violationId: z.string(),
	policyId: z.string(),
	violationType: z.enum(['access', 'data', 'network', 'execution']),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	subjectId: z.string().optional(),
	resourceId: z.string().optional(),
	description: z.string(),
	detectedAt: z.string(),
});

// Security Threat Detection Event
export const SecurityThreatDetectionEventSchema = z.object({
	threatId: z.string(),
	threatType: z.enum(['anomaly', 'intrusion', 'malware', 'data-breach']),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	confidence: z.number().min(0).max(1),
	sourceIp: z.string().optional(),
	targetResource: z.string().optional(),
	indicators: z.array(z.string()),
	detectedAt: z.string(),
});

// Security Audit Event
export const SecurityAuditEventSchema = z.object({
	auditId: z.string(),
	auditType: z.enum(['access', 'permission', 'activity']),
	actor: z.string(),
	action: z.string(),
	result: z.enum(['success', 'denied', 'error', 'pending']),
	resourceId: z.string(),
	timestamp: z.string(),
});

// Export event type definitions
export type SecurityAccessEvent = z.infer<typeof SecurityAccessEventSchema>;
export type SecurityPolicyViolationEvent = z.infer<
	typeof SecurityPolicyViolationEventSchema
>;
export type SecurityThreatDetectionEvent = z.infer<
	typeof SecurityThreatDetectionEventSchema
>;
export type SecurityAuditEvent = z.infer<typeof SecurityAuditEventSchema>;

// Helper object to create security events
export const createSecurityEvent = {
	access: (data: SecurityAccessEvent) => ({
		type: 'security.access.evaluated' as const,
		data: SecurityAccessEventSchema.parse(data),
	}),
	policyViolation: (data: SecurityPolicyViolationEvent) => ({
		type: 'security.policy.violation' as const,
		data: SecurityPolicyViolationEventSchema.parse(data),
	}),
	threatDetection: (data: SecurityThreatDetectionEvent) => ({
		type: 'security.threat.detected' as const,
		data: SecurityThreatDetectionEventSchema.parse(data),
	}),
	audit: (data: SecurityAuditEvent) => ({
		type: 'security.audit.logged' as const,
		data: SecurityAuditEventSchema.parse(data),
	}),
};
