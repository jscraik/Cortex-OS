/**
 * Security Event Contracts for A2A Communication
 * Contract-first definitions for Security package events
 */

import { z } from 'zod';

// Security Event Type Constants
export const SecurityEventTypes = {
	ScanCompleted: 'security.scan.completed',
	ThreatDetected: 'security.threat.detected',
	CertificateExpiring: 'security.certificate.expiring',
	CertificateValidated: 'security.certificate.validated',
	AccessGranted: 'security.access.granted',
	AccessDenied: 'security.access.denied',
	AuditCompleted: 'security.audit.completed',
	PolicyViolation: 'security.policy.violation',
} as const;

// Event Data Schemas
export const securityScanCompletedSchema = z.object({
	scanId: z.string().min(1),
	target: z.string(),
	scanType: z.enum(['vulnerability', 'compliance', 'secrets', 'all']),
	findings: z.object({
		vulnerabilities: z.number().int().nonnegative(),
		warnings: z.number().int().nonnegative(),
		info: z.number().int().nonnegative(),
	}),
	duration: z.number().positive(),
	timestamp: z.string().datetime(),
});

export const securityThreatDetectedSchema = z.object({
	threatId: z.string().min(1),
	type: z.enum(['malware', 'intrusion', 'data-breach', 'unauthorized-access']),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	source: z.string(),
	description: z.string(),
	mitigated: z.boolean().default(false),
	timestamp: z.string().datetime(),
});

export const securityCertificateExpiringSchema = z.object({
	certificateId: z.string().min(1),
	subject: z.string(),
	issuer: z.string(),
	expiresAt: z.string().datetime(),
	daysUntilExpiry: z.number().int().positive(),
	purpose: z.enum(['client', 'server', 'code-signing']).optional(),
	timestamp: z.string().datetime(),
});

export const securityCertificateValidatedSchema = z.object({
	certificateId: z.string().min(1),
	valid: z.boolean(),
	subject: z.string(),
	issuer: z.string(),
	purpose: z.enum(['client', 'server', 'code-signing']).optional(),
	validationErrors: z.array(z.string()).optional(),
	timestamp: z.string().datetime(),
});

export const securityAccessGrantedSchema = z.object({
	sessionId: z.string().min(1),
	userId: z.string(),
	resource: z.string(),
	permissions: z.array(z.string()),
	method: z.enum(['certificate', 'token', 'key', 'spiffe']),
	timestamp: z.string().datetime(),
});

export const securityAccessDeniedSchema = z.object({
	attemptId: z.string().min(1),
	userId: z.string().optional(),
	resource: z.string(),
	reason: z.string(),
	method: z.enum(['certificate', 'token', 'key', 'spiffe']),
	sourceIp: z.string().optional(),
	timestamp: z.string().datetime(),
});

export const securityAuditCompletedSchema = z.object({
	auditId: z.string().min(1),
	resourceId: z.string(),
	auditType: z.enum(['access', 'permission', 'activity']),
	timeRange: z.object({
		start: z.string().datetime(),
		end: z.string().datetime(),
	}),
	summary: z.object({
		totalEvents: z.number().int().nonnegative(),
		successfulAccess: z.number().int().nonnegative(),
		failedAccess: z.number().int().nonnegative(),
		suspiciousActivity: z.number().int().nonnegative(),
	}),
	timestamp: z.string().datetime(),
});

export const securityPolicyViolationSchema = z.object({
	violationId: z.string().min(1),
	policyId: z.string(),
	userId: z.string().optional(),
	resource: z.string().optional(),
	action: z.string(),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	description: z.string(),
	remediated: z.boolean().default(false),
	timestamp: z.string().datetime(),
});

// Type Exports
export type SecurityScanCompletedEvent = z.infer<
	typeof securityScanCompletedSchema
>;
export type SecurityThreatDetectedEvent = z.infer<
	typeof securityThreatDetectedSchema
>;
export type SecurityCertificateExpiringEvent = z.infer<
	typeof securityCertificateExpiringSchema
>;
export type SecurityCertificateValidatedEvent = z.infer<
	typeof securityCertificateValidatedSchema
>;
export type SecurityAccessGrantedEvent = z.infer<
	typeof securityAccessGrantedSchema
>;
export type SecurityAccessDeniedEvent = z.infer<
	typeof securityAccessDeniedSchema
>;
export type SecurityAuditCompletedEvent = z.infer<
	typeof securityAuditCompletedSchema
>;
export type SecurityPolicyViolationEvent = z.infer<
	typeof securityPolicyViolationSchema
>;

// Event Schema Registry
export const SecurityEventSchemas = {
	[SecurityEventTypes.ScanCompleted]: securityScanCompletedSchema,
	[SecurityEventTypes.ThreatDetected]: securityThreatDetectedSchema,
	[SecurityEventTypes.CertificateExpiring]: securityCertificateExpiringSchema,
	[SecurityEventTypes.CertificateValidated]: securityCertificateValidatedSchema,
	[SecurityEventTypes.AccessGranted]: securityAccessGrantedSchema,
	[SecurityEventTypes.AccessDenied]: securityAccessDeniedSchema,
	[SecurityEventTypes.AuditCompleted]: securityAuditCompletedSchema,
	[SecurityEventTypes.PolicyViolation]: securityPolicyViolationSchema,
} as const;
