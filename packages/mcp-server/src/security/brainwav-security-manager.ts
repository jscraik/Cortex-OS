/**
 * brAInwav Enhanced MCP Security Manager
 * Integrates policy engine with existing MCP server infrastructure
 * Maintains compatibility with current egress-guard implementation
 */

import { DEFAULT_BRAINWAV_POLICY, type McpSecurityPolicy, PolicyEngine } from '@cortex-os/security';
import type { Logger } from 'pino';
import { enforceEndpointAllowlist, isEndpointAllowed } from './egress-guard.js';

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
	private policyEngine?: PolicyEngine;
	private violationCounts = new Map<string, number>();

	constructor(
		private config: BrainwavMcpSecurityConfig,
		private logger: Logger,
	) {
		// Initialize policy engine if enabled
		if (config.enablePolicyEngine) {
			this.policyEngine = new PolicyEngine(config.policy, logger);
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
			// Step 1: Legacy egress-guard validation (if enabled and endpoint provided)
			if (this.config.enableLegacyGuard && context.endpoint) {
				const legacyResult = isEndpointAllowed(context.endpoint);
				if (!legacyResult.allowed) {
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

			// Step 2: Enhanced policy engine validation (if enabled)
			if (this.config.enablePolicyEngine && this.policyEngine && context.endpoint) {
				const requestJson = JSON.stringify(context.requestData);
				const requestSize = Buffer.byteLength(requestJson, 'utf8');
				const targetDomain = this.extractDomain(context.endpoint);

				const policyContext = {
					toolName: context.toolName,
					requestSize,
					targetDomain,
					contentType: 'application/json',
					userId: context.userId,
					sessionId: context.sessionId,
					timestamp: new Date().toISOString(),
					traceId: context.traceId || `brainwav-${Date.now()}`,
				};

				const policyResult = await this.policyEngine.evaluateToolRequest(policyContext);

				if (!policyResult.allowed) {
					if (this.config.blockOnViolation) {
						this.auditSecurityEvent('policy_engine_blocked', {
							toolName: context.toolName,
							endpoint: context.endpoint,
							reason: policyResult.reason,
							sessionId: context.sessionId,
							policyVersion: policyResult.metadata.policyVersion,
						});

						return {
							allowed: false,
							reason: `brAInwav Policy: ${policyResult.reason}`,
							warnings: policyResult.warnings,
							auditRequired: true,
							receiptRequired: policyResult.receiptRequired,
							metadata: {
								policyVersion: policyResult.metadata.policyVersion,
								evaluationTime: Date.now() - startTime,
								branding: 'brAInwav',
							},
						};
					} else {
						// Audit mode: log but allow
						warnings.push(`Policy violation (audit mode): ${policyResult.reason}`);
					}
				}

				// Log policy evaluation result
				this.auditSecurityEvent('policy_evaluated', {
					toolName: context.toolName,
					endpoint: context.endpoint,
					allowed: policyResult.allowed,
					warnings: policyResult.warnings.length,
					sessionId: context.sessionId,
					policyVersion: policyResult.metadata.policyVersion,
				});
			}

			// Success case
			return {
				allowed: true,
				reason: undefined,
				warnings,
				auditRequired: this.config.auditMode,
				receiptRequired: false,
				metadata: {
					policyVersion: this.config.policy?.version || 'legacy',
					evaluationTime: Date.now() - startTime,
					branding: 'brAInwav',
				},
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

			// Fail secure: deny on evaluation error unless in audit mode
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
			this.policyEngine.updatePolicy(newPolicy);
		}

		this.config.policy = newPolicy;

		this.logger.info(
			{
				branding: 'brAInwav',
				policyVersion: newPolicy.version,
				policyName: newPolicy.metadata.name,
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
		...DEFAULT_BRAINWAV_POLICY,
		metadata: {
			...DEFAULT_BRAINWAV_POLICY.metadata,
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
		...DEFAULT_BRAINWAV_POLICY,
		metadata: {
			...DEFAULT_BRAINWAV_POLICY.metadata,
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
