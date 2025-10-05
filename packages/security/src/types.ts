/**
 * @file Security Types and Interfaces
 * @description Common types for SPIFFE/SPIRE security implementation
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Capability Tokens & Budgets
// ---------------------------------------------------------------------------

export const CapabilityTokenClaimsSchema = z.object({
	iss: z.string(),
	jti: z.string(),
	tenant: z.string(),
	action: z.string(),
	resourcePrefix: z.string(),
	maxCost: z.number().nonnegative().optional(),
	budgetProfile: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	iat: z.number().int(),
	exp: z.number().int(),
});

export type CapabilityTokenClaims = z.infer<typeof CapabilityTokenClaimsSchema>;

export interface CapabilityDescriptor {
	tenant: string;
	action: string;
	resourcePrefix: string;
	maxCost?: number;
	budgetProfile?: string;
	claims: CapabilityTokenClaims;
}

export const BudgetProfileSchema = z.object({
	name: z.string(),
	maxTotalReq: z.number().int().nonnegative().optional(),
	maxTotalDurationMs: z.number().int().nonnegative().optional(),
	maxTotalCost: z.number().nonnegative().optional(),
});

export type BudgetProfile = z.infer<typeof BudgetProfileSchema>;

export const BudgetUsageSchema = z.object({
	totalReq: z.number().int().nonnegative(),
	totalDurationMs: z.number().int().nonnegative().optional(),
	totalCost: z.number().nonnegative().optional(),
	updatedAt: z.string(),
});

export type BudgetUsage = z.infer<typeof BudgetUsageSchema>;

export interface BudgetReconciliationInput {
	profile: BudgetProfile;
	current: BudgetUsage;
	requestCost?: number;
	requestDurationMs?: number;
}

export interface BudgetReconciliationResult {
	withinLimits: boolean;
	reason?: 'max_total_req_exceeded' | 'max_total_duration_exceeded' | 'max_total_cost_exceeded';
	projectedUsage: BudgetUsage;
}

// ---------------------------------------------------------------------------

// SPIFFE ID Schema
export const SpiffeIdSchema = z
	.string()
	.regex(
		/^spiffe:\/\/[^/]+\/[^/]+(?:\/.*)?$/,
		'SPIFFE ID must be in format spiffe://trust-domain/workload-path',
	);

// SPIFFE ID Type
export type SpiffeId = z.infer<typeof SpiffeIdSchema>;

// Workload Identity Schema
export const WorkloadIdentitySchema = z.object({
	spiffeId: SpiffeIdSchema,
	trustDomain: z.string(),
	workloadPath: z.string(),
	selectors: z.record(z.string(), z.string()),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type WorkloadIdentity = z.infer<typeof WorkloadIdentitySchema>;

// Certificate Bundle Schema
export const CertificateBundleSchema = z.object({
	certificates: z.array(z.string()), // PEM-encoded certificates
	privateKey: z.string().optional(), // PEM-encoded private key
	trustBundle: z.array(z.string()), // PEM-encoded trust bundle
});

export type CertificateBundle = z.infer<typeof CertificateBundleSchema>;

// mTLS Configuration Schema
export const MTLSConfigSchema = z.object({
	caCertificate: z.string(),
	clientCertificate: z.string(),
	clientKey: z.string(),
	serverName: z.string().optional(),
	rejectUnauthorized: z.boolean().default(true),
	minVersion: z.enum(['TLSv1.2', 'TLSv1.3']).default('TLSv1.2'),
	maxVersion: z.enum(['TLSv1.2', 'TLSv1.3']).optional(),
});

export type MTLSConfig = z.infer<typeof MTLSConfigSchema>;

// Security Context Schema
export const SecurityContextSchema = z.object({
	workloadIdentity: WorkloadIdentitySchema,
	certificateBundle: CertificateBundleSchema,
	mTLSConfig: MTLSConfigSchema,
	createdAt: z.date(),
	expiresAt: z.date().optional(),
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;

// SPIFFE Workload API Response Schema
export const SpiffeWorkloadResponseSchema = z.object({
	spiffe_id: SpiffeIdSchema,
	trust_domain: z.string(),
	selectors: z.array(
		z.object({
			type: z.string(),
			value: z.string(),
		}),
	),
	svid: z
		.object({
			certificate: z.string(),
			private_key: z.string(),
			bundle: z.string(),
		})
		.optional(),
});

export type SpiffeWorkloadResponse = z.infer<typeof SpiffeWorkloadResponseSchema>;

// Security Event Types
export enum SecurityEventType {
	WORKLOAD_ATTESTED = 'workload.attested',
	CERTIFICATE_ROTATED = 'certificate.rotated',
	MTLS_CONNECTION_ESTABLISHED = 'mtls.connection.established',
	MTLS_CONNECTION_FAILED = 'mtls.connection.failed',
	SECURITY_CONTEXT_EXPIRED = 'security.context.expired',
	AUTHENTICATION_FAILED = 'authentication.failed',
	AUTHORIZATION_FAILED = 'authorization.failed',
}

// Security Event Schema
export const SecurityEventSchema = z.object({
	type: z.nativeEnum(SecurityEventType),
	spiffeId: SpiffeIdSchema,
	timestamp: z.date(),
	details: z.record(z.string(), z.unknown()),
	severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// Trust Domain Configuration
export const TrustDomainConfigSchema = z.object({
	name: z.string(),
	spireServerAddress: z.string(),
	spireServerPort: z.number().default(8081),
	workloadSocketPath: z.string().default('/tmp/spire-agent/public/api.sock'), // eslint-disable-line sonarjs/publicly-writable-directories
	certificateFile: z.string().optional(),
	keyFile: z.string().optional(),
	caBundleFile: z.string().optional(),
});

export type TrustDomainConfig = z.infer<typeof TrustDomainConfigSchema>;

// Security Manager Configuration
export const SecurityManagerConfigSchema = z.object({
	trustDomains: z.array(TrustDomainConfigSchema),
	defaultTrustDomain: z.string(),
	certificateRotationInterval: z.number().default(3600000), // 1 hour
	securityContextCacheSize: z.number().default(1000),
	enableMTLS: z.boolean().default(true),
	enableWorkloadAttestation: z.boolean().default(true),
	enableCertificateRotation: z.boolean().default(true),
});

export type SecurityManagerConfig = z.infer<typeof SecurityManagerConfigSchema>;

// Error Types
export class SecurityError extends Error {
	constructor(
		message: string,
		public code: string,
		public spiffeId?: SpiffeId,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'SecurityError';
	}
}

export class CapabilityTokenError extends SecurityError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'CAPABILITY_TOKEN_ERROR', undefined, details);
		this.name = 'CapabilityTokenError';
	}
}

export class BudgetError extends SecurityError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'BUDGET_ERROR', undefined, details);
		this.name = 'BudgetError';
	}
}

export class SPIFFEError extends SecurityError {
	constructor(message: string, spiffeId?: SpiffeId, details?: Record<string, unknown>) {
		super(message, 'SPIFFE_ERROR', spiffeId, details);
		this.name = 'SPIFFEError';
	}
}

export class MTLSError extends SecurityError {
	constructor(message: string, spiffeId?: SpiffeId, details?: Record<string, unknown>) {
		super(message, 'MTLS_ERROR', spiffeId, details);
		this.name = 'MTLSError';
	}
}

export class WorkloadIdentityError extends SecurityError {
	constructor(message: string, spiffeId?: SpiffeId, details?: Record<string, unknown>) {
		super(message, 'WORKLOAD_IDENTITY_ERROR', spiffeId, details);
		this.name = 'WorkloadIdentityError';
	}
}
