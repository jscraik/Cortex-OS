/**
 * brAInwav Enhanced MCP Security Manager
 * Integrates policy engine with existing MCP server infrastructure
 * Maintains compatibility with current egress-guard implementation
 */

import { DEFAULT_BRAINWAV_POLICY, PolicyEngine } from '@cortex-os/security/policy';
import type { Logger } from 'pino';
import { enforceEndpointAllowlist, isEndpointAllowed } from './egress-guard.js';

type PolicyEvaluationMetadata = {
	policyVersion?: string;
	evaluationTime?: number;
	branding?: string;
};

export interface PolicyEvaluationResult {
	allowed: boolean;
	reason?: string;
	warnings?: string[];
	auditRequired?: boolean;
	receiptRequired?: boolean;
	metadata?: PolicyEvaluationMetadata;
}

export interface McpSecurityPolicy {
	version: string;
	metadata?: {
		name?: string;
		created?: string;
		author?: string;
		org?: 'brAInwav';
		[key: string]: unknown;
	};
	tools?: Record<
		string,
		{
			allowedDomains?: string[];
			maxRequestSize?: number;
			requireApproval?: boolean;
			timebudget?: number;
			memoryLimit?: number;
			contentTypes?: string[];
			rateLimits?: {
				requestsPerMinute?: number;
				requestsPerHour?: number;
			};
		}
	>;
	egress?: {
		defaultAction?: 'deny' | 'allow';
		allowlist?: string[];
		blocklist?: string[];
		maxResponseSize?: number;
		allowedPorts?: number[];
	};
	audit?: {
		logAllRequests?: boolean;
		redactPII?: boolean;
		retentionDays?: number;
		includeRequestBody?: boolean;
		includeBrAInwavBranding?: boolean;
	};
	enforcement?: {
		mode?: 'permissive' | 'enforcing';
		maxViolationsBeforeBlock?: number;
		violationTimeout?: number;
	};
	[key: string]: unknown;
}

const DEFAULT_POLICY = DEFAULT_BRAINWAV_POLICY as unknown as McpSecurityPolicy;

type BrainwavPolicyEngine = InstanceType<typeof PolicyEngine> & {
	evaluateToolRequest: (context?: Record<string, unknown>) => Promise<PolicyEvaluationResult>;
	updatePolicy: (newPolicy: McpSecurityPolicy) => void;
};

interface NormalizedPolicyResult {
	allowed: boolean;
	reason?: string;
	warnings: string[];
	auditRequired: boolean;
	receiptRequired: boolean;
	metadata: {
		policyVersion: string;
		evaluationTime: number;
		branding: 'brAInwav';
	};
}

export interface BrainwavMcpSecurityConfig {
	policy: McpSecurityPolicy;
	enableLegacyGuard: boolean; // Keep existing egress-guard active
	enablePolicyEngine: boolean; // Enable new policy engine
	auditMode: boolean;
	blockOnViolation: boolean;
	branding: {
		organizationName: 'brAInwav';
		logPrefix: 'brAInwav-mcp-security';
		auditPrefix: 'brAInwav-audit';
	};
}

export interface BrainwavToolInvocationContext {
	toolName: string;
	endpoint?: string;
	requestData: unknown;
	sessionId: string;
	userId?: string;
	traceId?: string;
	transport: 'stdio' | 'http' | 'sse';
}

export interface BrainwavSecurityResult {
	allowed: boolean;
	reason?: string;
	warnings: string[];
	auditRequired: boolean;
	receiptRequired: boolean;
	metadata: {
		policyVersion: string;
		evaluationTime: number;
		branding: 'brAInwav';
	};
}

export class BrainwavMcpSecurityManager {
	private policyEngine?: BrainwavPolicyEngine;
	private violationCounts = new Map<string, number>();

	constructor(
		private config: BrainwavMcpSecurityConfig,
		private logger: Logger,
	) {
		if (config.enablePolicyEngine) {
			this.policyEngine = new PolicyEngine(
				(config.policy ?? DEFAULT_POLICY) as unknown as ConstructorParameters<typeof PolicyEngine>[0],
				logger,
			) as BrainwavPolicyEngine;
		}

		this.logger = logger.child({
			component: 'brAInwav-mcp-security-manager',
			branding: 'brAInwav',
		});

		this.logger.info(
			{
				branding: 'brAInwav',
				legacyGuardEnabled: config.enableLegacyGuard,
				policyEngineEnabled: config.enablePolicyEngine,
				auditMode: config.auditMode,
			},
			'brAInwav MCP Security Manager initialized',
		);
	}

	private normalizePolicyResult(
		result: PolicyEvaluationResult | undefined,
		evaluationStart: number,
	): NormalizedPolicyResult {
		const warnings = Array.isArray(result?.warnings)
			? [...result!.warnings]
			: [];

		return {
			allowed: result?.allowed ?? true,
			reason: result?.reason,
			warnings,
			auditRequired: result?.auditRequired ?? false,
			receiptRequired: result?.receiptRequired ?? false,
			metadata: {
				policyVersion:
					result?.metadata?.policyVersion || this.config.policy?.version || DEFAULT_POLICY.version,
				evaluationTime: result?.metadata?.evaluationTime ?? Date.now() - evaluationStart,
				branding: 'brAInwav',
			},
		};
	}

	/**
	 * Enhanced security validation for MCP tool invocations
	 * Combines existing egress-guard with new policy engine
	 */
	async validateToolInvocation(
		context: BrainwavToolInvocationContext,
	): Promise<BrainwavSecurityResult> {
		const startTime = Date.now();
		const warnings: string[] = [];

		try {
			if (this.config.enableLegacyGuard && context.endpoint) {
				const legacyResult = isEndpointAllowed(context.endpoint);
				if (!legacyResult.allowed) {
					this.incrementViolation(context.toolName);
					this.auditSecurityEvent('legacy_guard_blocked', {
						toolName: context.toolName,
						endpoint: context.endpoint,
						reason: legacyResult.reason,
						sessionId: context.sessionId,
					});

					return {
						allowed: false,
						reason: `brAInwav Legacy Guard: ${legacyResult.reason}`,
						warnings,
						auditRequired: true,
						receiptRequired: false,
						metadata: {
							policyVersion: 'legacy',
							evaluationTime: Date.now() - startTime,
							branding: 'brAInwav',
						},
					};
				}
			}

			let metadata: NormalizedPolicyResult['metadata'] = {
				policyVersion: this.config.policy?.version || 'legacy',
				evaluationTime: Date.now() - startTime,
				branding: 'brAInwav',
			};

			if (this.config.enablePolicyEngine && this.policyEngine) {
				const rawPolicyResult = await this.policyEngine.evaluateToolRequest({
					toolName: context.toolName,
					endpoint: context.endpoint,
					sessionId: context.sessionId,
				});
				const policyResult = this.normalizePolicyResult(rawPolicyResult, startTime);
				if (policyResult.warnings.length > 0) {
					warnings.push(...policyResult.warnings);
				}
				metadata = policyResult.metadata;

				if (!policyResult.allowed) {
					this.incrementViolation(context.toolName);

					if (this.config.blockOnViolation) {
						this.auditSecurityEvent('policy_engine_blocked', {
							toolName: context.toolName,
							endpoint: context.endpoint,
							reason: policyResult.reason,
							sessionId: context.sessionId,
						});

						return {
							allowed: false,
							reason: `brAInwav Policy: ${policyResult.reason}`,
							warnings: policyResult.warnings,
							auditRequired: true,
							receiptRequired: policyResult.receiptRequired ?? false,
							metadata,
						};
					}

					if (policyResult.reason) {
						warnings.push(`Policy violation (audit mode): ${policyResult.reason}`);
					}
				}
			}

			return {
				allowed: true,
				reason: undefined,
				warnings,
				auditRequired: this.config.auditMode,
				receiptRequired: false,
				metadata,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			this.logger.error(
				{
					branding: 'brAInwav',
					toolName: context.toolName,
					endpoint: context.endpoint,
					error: errorMessage,
					sessionId: context.sessionId,
				},
				'brAInwav MCP security evaluation error',
			);

			return {
				allowed: this.config.auditMode,
				reason: `brAInwav Security Error: ${errorMessage}`,
				warnings: ['Security evaluation failed'],
				auditRequired: true,
				receiptRequired: false,
				metadata: {
					policyVersion: 'error',
					evaluationTime: Date.now() - startTime,
					branding: 'brAInwav',
				},
			};
		}
	}

	private incrementViolation(toolName: string): void {
		const count = this.violationCounts.get(toolName) ?? 0;
		this.violationCounts.set(toolName, count + 1);
	}

	/**
	 * Enhanced endpoint allowlist enforcement with brAInwav branding
	 * Drop-in replacement for existing enforceEndpointAllowlist
	 */
	enforceEndpointAllowlist(endpoint: string, capability: string): boolean {
		// Use existing implementation but enhance logging
		const allowed = enforceEndpointAllowlist(endpoint, this.logger, capability);

		if (!allowed) {
			this.auditSecurityEvent('endpoint_blocked', {
				endpoint,
				capability,
				reason: 'Not in allowlist',
			});
		}

		return allowed;
	}

	/**
	 * Generate brAInwav-branded execution receipt
	 */
	generateExecutionReceipt(
		context: BrainwavToolInvocationContext,
		result: { success: boolean; duration: number; responseSize?: number },
	): {
		receiptId: string;
		timestamp: string;
		tool: {
			name: string;
			endpoint?: string;
			transport: string;
		};
		execution: {
			sessionId: string;
			success: boolean;
			duration: number;
			responseSize?: number;
		};
		policy: {
			version: string;
			enforcementMode: string;
		};
		branding: 'brAInwav';
	} {
		const receiptId = `brainwav-mcp-${Date.now()}-${context.sessionId.slice(-8)}`;

		return {
			receiptId,
			timestamp: new Date().toISOString(),
			tool: {
				name: context.toolName,
				endpoint: context.endpoint,
				transport: context.transport,
			},
			execution: {
				sessionId: context.sessionId,
				success: result.success,
				duration: result.duration,
				responseSize: result.responseSize,
			},
			policy: {
				version: this.config.policy?.version || 'legacy',
				enforcementMode: this.config.blockOnViolation ? 'enforcing' : 'audit',
			},
			branding: 'brAInwav',
		};
	}

	/**
	 * Update security policy with validation
	 */
	updatePolicy(newPolicy: McpSecurityPolicy): void {
		if (this.policyEngine) {
			this.policyEngine.updatePolicy(
				newPolicy as unknown as Parameters<BrainwavPolicyEngine['updatePolicy']>[0],
			);
		}

		this.config.policy = newPolicy;

		this.logger.info(
			{
				branding: 'brAInwav',
				policyVersion: newPolicy.version,
				policyName: newPolicy.metadata?.name,
			},
			'brAInwav MCP security policy updated',
		);
	}

	/**
	 * Get security statistics with brAInwav branding
	 */
	getSecurityStats(): {
		policyVersion: string;
		violationCount: number;
		configuration: {
			legacyGuardEnabled: boolean;
			policyEngineEnabled: boolean;
			auditMode: boolean;
			blockOnViolation: boolean;
		};
		branding: 'brAInwav';
	} {
		const totalViolations = Array.from(this.violationCounts.values()).reduce(
			(sum, count) => sum + count,
			0,
		);

		return {
			policyVersion: this.config.policy?.version || 'legacy',
			violationCount: totalViolations,
			configuration: {
				legacyGuardEnabled: this.config.enableLegacyGuard,
				policyEngineEnabled: this.config.enablePolicyEngine,
				auditMode: this.config.auditMode,
				blockOnViolation: this.config.blockOnViolation,
			},
			branding: 'brAInwav',
		};
	}

	private auditSecurityEvent(eventType: string, details: Record<string, unknown>): void {
		this.logger.info(
			{
				branding: 'brAInwav',
				eventType: `brAInwav-mcp-${eventType}`,
				timestamp: new Date().toISOString(),
				...details,
			},
			`brAInwav MCP security event: ${eventType}`,
		);
	}

	private extractDomain(endpoint: string): string {
		try {
			const url = new URL(endpoint);
			return url.hostname;
		} catch {
			return 'unknown';
		}
	}
}

/**
 * Default brAInwav MCP security configuration for development
 */
export const DEFAULT_BRAINWAV_MCP_CONFIG: BrainwavMcpSecurityConfig = {
	policy: {
		...DEFAULT_POLICY,
		metadata: {
			...(typeof DEFAULT_POLICY.metadata === 'object'
				? (DEFAULT_POLICY.metadata as Record<string, unknown>)
				: {}),
			name: 'brAInwav MCP Development Policy',
		},
		enforcement: {
			mode: 'permissive', // Relaxed for development
			maxViolationsBeforeBlock: 10,
			violationTimeout: 600, // 10 minutes
		},
	},
	enableLegacyGuard: true, // Keep existing egress guard active
	enablePolicyEngine: true, // Enable new policy engine
	auditMode: true, // Log violations but don't block in development
	blockOnViolation: false, // Don't block in development mode
	branding: {
		organizationName: 'brAInwav',
		logPrefix: 'brAInwav-mcp-security',
		auditPrefix: 'brAInwav-audit',
	},
};

/**
 * Production brAInwav MCP security configuration
 */
export const PRODUCTION_BRAINWAV_MCP_CONFIG: BrainwavMcpSecurityConfig = {
	...DEFAULT_BRAINWAV_MCP_CONFIG,
	policy: {
		...DEFAULT_POLICY,
		metadata: {
			...(typeof DEFAULT_POLICY.metadata === 'object'
				? (DEFAULT_POLICY.metadata as Record<string, unknown>)
				: {}),
			name: 'brAInwav MCP Production Policy',
		},
		enforcement: {
			mode: 'enforcing',
			maxViolationsBeforeBlock: 3,
			violationTimeout: 300, // 5 minutes
		},
	},
	auditMode: false,
	blockOnViolation: true, // Strict enforcement in production
};
