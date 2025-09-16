/**
 * Security MCP tool definitions and handlers.
 *
 * These tools expose Cortex security capabilities over the Model Context
 * Protocol. Each tool validates input using Zod schemas, applies
 * security-specific logic, and returns structured responses that include
 * correlation metadata for downstream observability.
 */

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { ZodError, type ZodIssue, type ZodSchema, z } from 'zod';

import { createSecurityContextId } from '../utils/security-utils.js';

const SECURITY_MCP_VERSION = '2025.02.0';

type Primitive = string | number | boolean | null;

type NormalizedMetadata = Record<string, Primitive | Primitive[]>;

type NormalizedPayloadResult = NormalizedMetadata | Record<string, unknown>;

type ToolExecutionContext = {
	correlationId: string;
	tool: string;
};

export type SecurityToolErrorCode =
	| 'validation_error'
	| 'security_error'
	| 'internal_error';

export class SecurityToolError extends Error {
	constructor(
		public readonly code: SecurityToolErrorCode,
		message: string,
		public readonly details: string[] = [],
	) {
		super(message);
		this.name = 'SecurityToolError';
	}
}

export interface SecurityToolResponse {
	content: Array<{ type: 'text'; text: string }>;
	metadata: {
		tool: string;
		version: string;
		timestamp: string;
		correlationId: string;
		executionMs: number;
	};
	isError?: boolean;
	error?: {
		code: SecurityToolErrorCode;
		message: string;
		details?: string[];
	};
}

export interface SecurityTool<TSchema extends ZodSchema> {
	name: string;
	description: string;
	inputSchema: TSchema;
	handler: (params: unknown) => Promise<SecurityToolResponse>;
}

function mapZodIssues(issues: ZodIssue[]): string[] {
	return issues.map((issue) => {
		const path = issue.path.join('.') || issue.code;
		return `${path}: ${issue.message}`;
	});
}

function normalizeError(error: unknown): SecurityToolError {
	if (error instanceof SecurityToolError) {
		return error;
	}
	if (error instanceof ZodError) {
		return new SecurityToolError(
			'validation_error',
			'Invalid input received for security tool',
			mapZodIssues(error.issues),
		);
	}
	if (error instanceof Error) {
		return new SecurityToolError('internal_error', error.message);
	}
	return new SecurityToolError('internal_error', 'Unknown tool error');
}

function createSuccessResponse(
	tool: string,
	payload: NormalizedPayloadResult,
	startedAt: number,
	correlationId: string,
): SecurityToolResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(payload),
			},
		],
		metadata: {
			tool,
			version: SECURITY_MCP_VERSION,
			timestamp: new Date().toISOString(),
			correlationId,
			executionMs: Math.round(performance.now() - startedAt),
		},
		isError: false,
	};
}

function createErrorResponse(
	tool: string,
	error: SecurityToolError,
	startedAt: number,
	correlationId: string,
): SecurityToolResponse {
	console.error(`[security][${tool}] tool error (${correlationId})`, {
		code: error.code,
		message: error.message,
		details: error.details,
	});

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					code: error.code,
					message: error.message,
					details: error.details,
				}),
			},
		],
		metadata: {
			tool,
			version: SECURITY_MCP_VERSION,
			timestamp: new Date().toISOString(),
			correlationId,
			executionMs: Math.round(performance.now() - startedAt),
		},
		isError: true,
		error: {
			code: error.code,
			message: error.message,
			details: error.details.length > 0 ? error.details : undefined,
		},
	};
}

function buildHandler<TSchema extends ZodSchema>(
	toolName: string,
	schema: TSchema,
	executor: (
		input: z.infer<TSchema>,
		context: ToolExecutionContext,
	) => Promise<NormalizedPayloadResult> | NormalizedPayloadResult,
): (params: unknown) => Promise<SecurityToolResponse> {
	return async (params: unknown) => {
		const correlationId = createSecurityContextId();
		const startedAt = performance.now();

		try {
			const input = schema.parse(params);
			const payload = await executor(input, {
				correlationId,
				tool: toolName,
			});
			return createSuccessResponse(toolName, payload, startedAt, correlationId);
		} catch (unknownError: unknown) {
			const normalized = normalizeError(unknownError);
			return createErrorResponse(
				toolName,
				normalized,
				startedAt,
				correlationId,
			);
		}
	};
}

// ---------------------------------------------------------------------------
// Access control tool
// ---------------------------------------------------------------------------

const securitySubjectSchema = z.object({
	id: z.string().min(1, 'subject.id is required'),
	roles: z.array(z.string().min(1)).default([]),
	attributes: z
		.record(z.union([z.string(), z.number(), z.boolean()]).or(z.null()))
		.optional(),
	clearance: z.enum(['low', 'moderate', 'high', 'top-secret']).optional(),
});

const securityResourceSchema = z.object({
	id: z.string().min(1, 'resource.id is required'),
	type: z.string().min(1, 'resource.type is required'),
	ownerId: z.string().optional(),
	labels: z.array(z.string().min(1)).max(64).optional(),
	sensitivity: z
		.enum(['public', 'internal', 'confidential', 'restricted'])
		.default('internal'),
});

const accessControlContextSchema = z
	.object({
		environment: z.enum(['development', 'staging', 'production']).optional(),
		timestamp: z.string().datetime().optional(),
		ipAddress: z.string().ip().optional(),
		location: z.string().optional(),
	})
	.optional();

export const securityAccessControlToolSchema = z.object({
	subject: securitySubjectSchema,
	resource: securityResourceSchema,
	action: z.string().min(1, 'action is required'),
	context: accessControlContextSchema,
});

interface AccessControlDecision {
	effect: 'allow' | 'deny';
	action: string;
	resourceId: string;
	reasons: string[];
	score: number;
}

function evaluateAccessControl(
	input: z.infer<typeof securityAccessControlToolSchema>,
): {
	allowed: boolean;
	effect: 'allow' | 'deny';
	reasons: string[];
	decisions: AccessControlDecision[];
	riskScore: number;
	checks: Record<string, boolean>;
} {
	const privilegedRoles = new Set([
		'security-admin',
		'security-incident-responder',
		'compliance-officer',
	]);
	const readOnlyRoles = new Set(['auditor', 'security-analyst']);
	const sensitiveActions = new Set([
		'delete',
		'rotate-keys',
		'disable',
		'escalate-privileges',
	]);

	const reasons: string[] = [];
	let allowed = false;
	let decisionScore = 10;

	const matchedPrivilegedRole = input.subject.roles.find((role) =>
		privilegedRoles.has(role),
	);
	if (matchedPrivilegedRole) {
		allowed = true;
		reasons.push(`Subject has privileged role ${matchedPrivilegedRole}`);
		decisionScore += 40;
	}

	if (
		!allowed &&
		input.resource.ownerId &&
		input.resource.ownerId === input.subject.id &&
		(input.action === 'read' ||
			input.action === 'update' ||
			input.action === 'write')
	) {
		allowed = true;
		reasons.push('Subject is the resource owner');
		decisionScore += 25;
	}

	if (!allowed && readOnlyRoles.has(input.subject.roles.at(0) ?? '')) {
		if (input.action === 'read') {
			allowed = true;
			reasons.push('Read-only role granted limited access');
			decisionScore += 15;
		} else {
			reasons.push('Read-only role cannot perform this action');
		}
	}

	const environment = input.context?.environment ?? 'unknown';
	const highRiskEnvironment = environment === 'production';
	if (highRiskEnvironment && sensitiveActions.has(input.action)) {
		decisionScore += 30;
		reasons.push('Sensitive action in production environment');
		if (!privilegedRoles.has(input.subject.roles.at(0) ?? '')) {
			allowed = false;
			reasons.push('Sensitive actions in production require privileged role');
		}
	}

	if (input.resource.sensitivity === 'restricted') {
		reasons.push('Resource sensitivity level is restricted');
		decisionScore += 20;
		if (input.subject.clearance !== 'top-secret') {
			allowed = false;
			reasons.push('Subject clearance is insufficient for restricted resource');
		}
	}

	const riskScore = Math.min(100, Math.max(0, decisionScore));
	const decision: AccessControlDecision = {
		effect: allowed ? 'allow' : 'deny',
		action: input.action,
		resourceId: input.resource.id,
		reasons,
		score: riskScore,
	};

	return {
		allowed,
		effect: allowed ? 'allow' : 'deny',
		reasons,
		decisions: [decision],
		riskScore,
		checks: {
			productionGuard: highRiskEnvironment,
			resourceSensitivity: input.resource.sensitivity === 'restricted',
			privilegedRole: input.subject.roles.some((role) =>
				privilegedRoles.has(role),
			),
		},
	};
}

export const securityAccessControlTool: SecurityTool<
	typeof securityAccessControlToolSchema
> = {
	name: 'security_access_control',
	description:
		'Evaluate access control decisions for Cortex security resources',
	inputSchema: securityAccessControlToolSchema,
	handler: buildHandler(
		'security_access_control',
		securityAccessControlToolSchema,
		async (input, context) => {
			const result = evaluateAccessControl(input);
			console.debug(
				`[security][${context.tool}] access evaluation (${context.correlationId})`,
				{
					subject: input.subject.id,
					resource: input.resource.id,
					action: input.action,
					allowed: result.allowed,
					riskScore: result.riskScore,
				},
			);

			return {
				allowed: result.allowed,
				effect: result.effect,
				reasons: result.reasons,
				decisions: result.decisions,
				riskScore: result.riskScore,
				checks: result.checks,
				subject: {
					id: input.subject.id,
					roles: input.subject.roles,
				},
				resource: {
					id: input.resource.id,
					type: input.resource.type,
					sensitivity: input.resource.sensitivity,
				},
				context: {
					environment: input.context?.environment ?? 'unknown',
					location: input.context?.location,
				},
			};
		},
	),
};

// ---------------------------------------------------------------------------
// Policy validation tool
// ---------------------------------------------------------------------------

export const securityPolicyValidationToolSchema = z.object({
	policy: z.string().min(1, 'policy must be provided'),
	format: z.enum(['json', 'rego', 'cedar']).default('json'),
	metadata: z
		.object({
			name: z.string().min(1).optional(),
			version: z.string().optional(),
			owner: z.string().optional(),
		})
		.optional(),
});

interface NormalizedPolicyAnalysis {
	valid: boolean;
	issues: string[];
	policyHash: string;
	metadata?: Record<string, unknown>;
	normalized?: Record<string, unknown>;
}

function analyseJsonPolicy(policy: string): NormalizedPolicyAnalysis {
	let parsed: unknown;
	try {
		parsed = JSON.parse(policy);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Invalid JSON policy payload';
		throw new SecurityToolError('validation_error', message, [message]);
	}

	if (typeof parsed !== 'object' || parsed === null) {
		throw new SecurityToolError(
			'validation_error',
			'Policy must be a JSON object',
			['Policy root must be an object'],
		);
	}

	const issues: string[] = [];
	const obj = parsed as Record<string, unknown>;

	if (!Array.isArray(obj.rules)) {
		issues.push('Policy must contain a rules array');
	}

	const rules = Array.isArray(obj.rules) ? obj.rules : [];
	for (const rule of rules) {
		if (!rule || typeof rule !== 'object') {
			issues.push('Policy rules must be objects');
			continue;
		}
		const data = rule as Record<string, unknown>;
		if (
			data.effect === 'allow' &&
			data.condition &&
			typeof data.condition === 'object'
		) {
			const condition = data.condition as Record<string, unknown>;
			if (condition.action === '*') {
				issues.push(
					`Rule ${String(data.id ?? '<unnamed>')} allows wildcard action`,
				);
			}
		}
	}

	const policyHash = createHash('sha256').update(policy).digest('hex');

	return {
		valid: issues.length === 0,
		issues,
		policyHash,
		normalized: obj,
	};
}

export const securityPolicyValidationTool: SecurityTool<
	typeof securityPolicyValidationToolSchema
> = {
	name: 'security_policy_validation',
	description:
		'Validate Cortex security policy definitions for unsafe patterns',
	inputSchema: securityPolicyValidationToolSchema,
	handler: buildHandler(
		'security_policy_validation',
		securityPolicyValidationToolSchema,
		async (input, context) => {
			let analysis: NormalizedPolicyAnalysis;
			switch (input.format) {
				case 'json':
					analysis = analyseJsonPolicy(input.policy);
					break;
				case 'rego':
					if (/allow\s*=\s*true/.test(input.policy)) {
						analysis = {
							valid: false,
							issues: ['Rego policy contains unconditional allow statement'],
							policyHash: createHash('sha256')
								.update(input.policy)
								.digest('hex'),
						};
					} else {
						analysis = {
							valid: true,
							issues: [],
							policyHash: createHash('sha256')
								.update(input.policy)
								.digest('hex'),
						};
					}
					break;
				case 'cedar':
					analysis = {
						valid: !/permit\s+\(principal,\s+action,\s+resource\)/.test(
							input.policy,
						),
						issues: /permit\s+\(principal,\s+action,\s+resource\)/.test(
							input.policy,
						)
							? [
									'Cedar policy appears to permit all principals, actions, and resources',
								]
							: [],
						policyHash: createHash('sha256').update(input.policy).digest('hex'),
					};
					break;
			}

			console.debug(
				`[security][${context.tool}] policy validation (${context.correlationId})`,
				{
					format: input.format,
					valid: analysis.valid,
					issues: analysis.issues,
				},
			);

			return {
				valid: analysis.valid,
				issues: analysis.issues,
				policyHash: analysis.policyHash,
				metadata: input.metadata,
			};
		},
	),
};

// ---------------------------------------------------------------------------
// Audit tool
// ---------------------------------------------------------------------------

const auditEventSchema = z.object({
	id: z.string().min(1),
	actor: z.string().optional(),
	action: z.string().min(1),
	result: z.enum(['success', 'denied', 'error', 'pending']).default('success'),
	severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
	timestamp: z.string().datetime(),
	metadata: z.record(z.unknown()).optional(),
});

export const securityAuditToolSchema = z.object({
	resourceId: z.string().min(1),
	auditType: z.enum(['access', 'permission', 'activity']),
	timeRange: z
		.object({
			start: z.string().datetime(),
			end: z.string().datetime(),
		})
		.optional(),
	includeEvidence: z.boolean().default(false),
	events: z.array(auditEventSchema).optional(),
	filters: z
		.object({
			severity: z
				.array(z.enum(['low', 'medium', 'high', 'critical']))
				.optional(),
			actions: z.array(z.string()).optional(),
		})
		.optional(),
});

function summariseAuditEvents(events: z.infer<typeof auditEventSchema>[]): {
	summary: { totalEvents: number; denied: number; highSeverity: number };
	deniedEvents: z.infer<typeof auditEventSchema>[];
} {
	let denied = 0;
	let highSeverity = 0;

	for (const event of events) {
		if (event.result !== 'success') denied += 1;
		if (event.severity === 'high' || event.severity === 'critical') {
			highSeverity += 1;
		}
	}

	const deniedEvents = events.filter((event) => event.result === 'denied');

	return {
		summary: {
			totalEvents: events.length,
			denied,
			highSeverity,
		},
		deniedEvents,
	};
}

export const securityAuditTool: SecurityTool<typeof securityAuditToolSchema> = {
	name: 'security_audit',
	description: 'Audit security events and produce evidence summaries',
	inputSchema: securityAuditToolSchema,
	handler: buildHandler(
		'security_audit',
		securityAuditToolSchema,
		async (input, context) => {
			const events = (input.events ?? []).filter((event) => {
				if (
					input.filters?.severity &&
					!input.filters.severity.includes(event.severity)
				) {
					return false;
				}
				if (
					input.filters?.actions &&
					!input.filters.actions.includes(event.action)
				) {
					return false;
				}
				if (input.timeRange) {
					const timestamp = Date.parse(event.timestamp);
					const start = Date.parse(input.timeRange.start);
					const end = Date.parse(input.timeRange.end);
					return timestamp >= start && timestamp <= end;
				}
				return true;
			});

			const summary = summariseAuditEvents(events);
			console.debug(
				`[security][${context.tool}] audit summary (${context.correlationId})`,
				{
					resourceId: input.resourceId,
					totalEvents: summary.summary.totalEvents,
					highSeverity: summary.summary.highSeverity,
				},
			);

			return {
				resourceId: input.resourceId,
				auditType: input.auditType,
				filters: input.filters,
				summary: summary.summary,
				deniedEvents: input.includeEvidence ? summary.deniedEvents : undefined,
				timeRange: input.timeRange,
			};
		},
	),
};

// ---------------------------------------------------------------------------
// Encryption tool
// ---------------------------------------------------------------------------

export const securityEncryptionToolSchema = z.object({
	operation: z.enum(['encrypt', 'decrypt']),
	algorithm: z.enum(['aes-256-gcm']).default('aes-256-gcm'),
	data: z.string().min(1, 'data must be provided'),
	secret: z.string().min(8, 'secret must be at least 8 characters'),
	iv: z.string().optional(),
	authTag: z.string().optional(),
});

function deriveEncryptionKey(secret: string): Buffer {
	return createHash('sha256').update(secret).digest();
}

function performEncryption(
	input: z.infer<typeof securityEncryptionToolSchema>,
): {
	operation: 'encrypt';
	algorithm: string;
	output: string;
	iv: string;
	authTag: string;
} {
	const iv = randomBytes(12);
	const key = deriveEncryptionKey(input.secret);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([
		cipher.update(Buffer.from(input.data, 'utf8')),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return {
		operation: 'encrypt',
		algorithm: input.algorithm,
		output: encrypted.toString('base64'),
		iv: iv.toString('base64'),
		authTag: authTag.toString('base64'),
	};
}

function performDecryption(
	input: z.infer<typeof securityEncryptionToolSchema>,
): { operation: 'decrypt'; algorithm: string; output: string } {
	if (!input.iv || !input.authTag) {
		throw new SecurityToolError(
			'validation_error',
			'iv and authTag are required to decrypt payloads',
			['Provide iv and authTag for decrypt operations'],
		);
	}

	const key = deriveEncryptionKey(input.secret);
	const decipher = createDecipheriv(
		'aes-256-gcm',
		key,
		Buffer.from(input.iv, 'base64'),
	);
	decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));

	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(input.data, 'base64')),
		decipher.final(),
	]);

	return {
		operation: 'decrypt',
		algorithm: input.algorithm,
		output: decrypted.toString('utf8'),
	};
}

export const securityEncryptionTool: SecurityTool<
	typeof securityEncryptionToolSchema
> = {
	name: 'security_encryption',
	description: 'Encrypt and decrypt payloads using Cortex security primitives',
	inputSchema: securityEncryptionToolSchema,
	handler: buildHandler(
		'security_encryption',
		securityEncryptionToolSchema,
		async (input, context) => {
			const payload =
				input.operation === 'encrypt'
					? performEncryption(input)
					: performDecryption(input);
			console.debug(
				`[security][${context.tool}] ${input.operation} (${context.correlationId})`,
				{ algorithm: input.algorithm },
			);
			return payload;
		},
	),
};

// ---------------------------------------------------------------------------
// Threat detection tool
// ---------------------------------------------------------------------------

const threatEventSchema = z.object({
	id: z.string().min(1),
	actor: z.string().optional(),
	action: z.string().min(1),
	severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
	timestamp: z.string().datetime().optional(),
	location: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const securityThreatDetectionToolSchema = z.object({
	events: z.array(threatEventSchema).min(1),
	context: z
		.object({
			environment: z.string().optional(),
			tenantId: z.string().optional(),
		})
		.optional(),
	thresholds: z
		.object({
			anomalyScore: z.number().min(0).max(100).default(45),
			criticalScore: z.number().min(0).max(100).default(80),
		})
		.default({ anomalyScore: 45, criticalScore: 80 }),
});

function scoreThreatEvent(event: z.infer<typeof threatEventSchema>): number {
	const severityScores = {
		low: 10,
		medium: 40,
		high: 70,
		critical: 90,
	};

	let score = severityScores[event.severity];

	const highRiskActions = new Set([
		'privilege-escalation',
		'credential-dump',
		'policy-disable',
		'data-exfiltration',
	]);
	if (highRiskActions.has(event.action)) {
		score += 20;
	}

	if (event.location && event.location.toLowerCase() === 'unknown') {
		score += 15;
	}

	return Math.min(score, 100);
}

export const securityThreatDetectionTool: SecurityTool<
	typeof securityThreatDetectionToolSchema
> = {
	name: 'security_threat_detection',
	description: 'Detect potential security threats from telemetry events',
	inputSchema: securityThreatDetectionToolSchema,
	handler: buildHandler(
		'security_threat_detection',
		securityThreatDetectionToolSchema,
		async (input, context) => {
			const suspiciousEvents: Array<{ id: string; score: number }> = [];
			const scores = input.events.map((event) => {
				const score = scoreThreatEvent(event);
				if (score >= input.thresholds.anomalyScore) {
					suspiciousEvents.push({ id: event.id, score });
				}
				if (score >= input.thresholds.criticalScore) {
					console.warn(
						`[security][${context.tool}] critical threat detected (${context.correlationId})`,
						{
							eventId: event.id,
							severity: event.severity,
							action: event.action,
							score,
						},
					);
				}
				return { id: event.id, score };
			});

			return {
				context: input.context,
				scores,
				suspiciousEvents,
				thresholds: input.thresholds,
				aggregate: {
					max: Math.max(...scores.map((item) => item.score)),
					mean:
						scores.reduce((acc, item) => acc + item.score, 0) / scores.length,
				},
			};
		},
	),
};

export const securityMcpTools: SecurityTool<any>[] = [
	securityAccessControlTool,
	securityPolicyValidationTool,
	securityAuditTool,
	securityEncryptionTool,
	securityThreatDetectionTool,
];

export type { AccessControlDecision, ToolExecutionContext };

export const securityToolSchemas = {
	securityAccessControlToolSchema,
	securityPolicyValidationToolSchema,
	securityAuditToolSchema,
	securityEncryptionToolSchema,
	securityThreatDetectionToolSchema,
};
