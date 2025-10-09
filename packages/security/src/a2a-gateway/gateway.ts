/**
 * @file A2A Gateway Implementation
 * @description Central zero-trust enforcement point for Agent-to-Agent communications
 */

import { performance } from 'node:perf_hooks';
import type { Logger } from 'pino';
import { createSecurityBus } from '../a2a.js';
import { CapabilityTokenValidator } from '../capabilities/capability-token.js';
import { PolicyEngine, type PolicyEvaluationContext } from '../policy/policy-engine.js';
import type { CapabilityDescriptor } from '../types.js';
import {
	InMemoryReplayDetection,
	type ReplayDetectionStore,
	SignedEnvelopeValidator,
} from './envelope.js';
import type {
	A2AContext,
	A2ADecision,
	A2AGatewayConfig,
	AuditEvent,
	RequestEnvelope,
} from './types.js';

const DEFAULT_BRANDING = 'brAInwav Zero-Trust Gateway';

export interface CircuitBreakerState {
	failures: number;
	last_failure_time: number;
	state: 'closed' | 'open' | 'half-open';
}

export class A2AGateway {
	private readonly logger: Logger;
	private readonly policyEngine: PolicyEngine;
	private readonly capabilityValidator: CapabilityTokenValidator;
	private readonly envelopeValidator: SignedEnvelopeValidator;
	private readonly replayDetection: ReplayDetectionStore;
	private readonly securityBus;
	private readonly circuitBreaker = new Map<string, CircuitBreakerState>();
	private auditChain: { hash: string; timestamp: string } | null = null;

	constructor(
		private readonly config: A2AGatewayConfig,
		logger: Logger,
	) {
		this.logger = logger.child({
			component: 'a2a-gateway',
			branding: DEFAULT_BRANDING,
		});

		this.policyEngine = new PolicyEngine({
			logger: this.logger,
			policyWasmPath: config.policy_wasm_path,
		});

		this.capabilityValidator = new CapabilityTokenValidator(config.capability_secret);
		this.envelopeValidator = new SignedEnvelopeValidator(config.capability_secret);
		this.replayDetection = new InMemoryReplayDetection();

		const { bus } = createSecurityBus();
		this.securityBus = bus;
	}

	/**
	 * Main authorization check for A2A requests
	 */
	async authorize(
		envelope: RequestEnvelope,
		_context: Partial<A2AContext> = {},
	): Promise<A2ADecision> {
		const start = performance.now();
		const decision_id = `decision-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

		try {
			// Step 1: Validate envelope signature and freshness
			const envelopeValidation = this.envelopeValidator.validateEnvelope(envelope, {
				max_age_seconds: 300, // 5 minutes
			});

			if (!envelopeValidation.valid) {
				return this.createDecision(
					false,
					`Envelope validation failed: ${envelopeValidation.reason}`,
					decision_id,
				);
			}

			// Step 2: Check circuit breaker
			if (this.isCircuitBreakerOpen(envelope.agent_id)) {
				return this.createDecision(false, 'brAInwav circuit breaker open for agent', decision_id);
			}

			// Step 3: Replay detection
			if (await this.replayDetection.hasRequestId(envelope.req_id)) {
				return this.createDecision(false, 'brAInwav request replay detected', decision_id);
			}

			// Step 4: Validate capabilities
			const capabilities = await this.validateCapabilities(envelope);
			if (capabilities.length === 0) {
				return this.createDecision(false, 'brAInwav no valid capabilities provided', decision_id);
			}

			// Step 5: Policy evaluation via OPA
			const policyContext: PolicyEvaluationContext = {
				tenant: envelope.context.tenant,
				action: envelope.action,
				resource: envelope.resource,
				capabilities,
				requestCost: envelope.context.request_cost,
				requiresAudit: this.requiresAudit(envelope),
				decisionId: decision_id,
			};

			const policyResult = await this.policyEngine.evaluateToolRequest(policyContext);

			// Step 6: Store request ID to prevent replay
			await this.replayDetection.storeRequestId(
				envelope.req_id,
				new Date(Date.now() + 300_000), // 5 minutes
			);

			// Step 7: Record successful decision
			if (policyResult.allowed) {
				this.recordSuccess(envelope.agent_id);
			} else {
				this.recordFailure(envelope.agent_id);
			}

			const decision = this.createDecision(
				policyResult.allowed,
				policyResult.reason,
				decision_id,
				policyResult.warnings,
				policyResult.auditRequired,
				policyResult.metadata.policyHash,
			);

			// Step 8: Emit security events
			await this.emitSecurityEvents(envelope, decision, capabilities);

			// Step 9: Audit logging
			if (this.config.audit_config.enabled) {
				await this.appendAuditEvent(envelope, decision);
			}

			const duration = performance.now() - start;
			this.logger.info(
				{
					decision_id,
					agent_id: envelope.agent_id,
					action: envelope.action,
					resource: envelope.resource,
					allowed: decision.allow,
					duration_ms: duration,
					branding: DEFAULT_BRANDING,
				},
				'A2A authorization decision completed',
			);

			return decision;
		} catch (error) {
			this.recordFailure(envelope.agent_id);
			const duration = performance.now() - start;

			this.logger.error(
				{
					decision_id,
					agent_id: envelope.agent_id,
					error: error instanceof Error ? error.message : 'unknown error',
					duration_ms: duration,
					branding: DEFAULT_BRANDING,
				},
				'A2A authorization failed',
			);

			return this.createDecision(
				false,
				`brAInwav authorization error: ${error instanceof Error ? error.message : 'unknown'}`,
				decision_id,
			);
		}
	}

	private async validateCapabilities(envelope: RequestEnvelope): Promise<CapabilityDescriptor[]> {
		const validCapabilities: CapabilityDescriptor[] = [];

		for (const capToken of envelope.capabilities) {
			try {
				const capability = this.capabilityValidator.verify(capToken, {
					expectedTenant: envelope.context.tenant,
					requiredAction: envelope.action,
				});
				validCapabilities.push(capability);
			} catch (error) {
				this.logger.warn(
					{
						agent_id: envelope.agent_id,
						error: error instanceof Error ? error.message : 'unknown capability error',
						branding: DEFAULT_BRANDING,
					},
					'Invalid capability token',
				);
			}
		}

		return validCapabilities;
	}

	private requiresAudit(envelope: RequestEnvelope): boolean {
		// High-risk operations require audit
		const highRiskActions = [
			'invoke:tool.shell',
			'invoke:tool.file-write',
			'invoke:tool.network-request',
			'invoke:tool.code-execution',
		];

		return (
			highRiskActions.includes(envelope.action) ||
			envelope.attestations?.code_review_passed !== true
		);
	}

	private isCircuitBreakerOpen(agent_id: string): boolean {
		const state = this.circuitBreaker.get(agent_id);
		if (!state) {
			return false;
		}

		const now = Date.now();
		const { failure_threshold, recovery_timeout_ms } = this.config.circuit_breaker;

		if (state.state === 'open') {
			if (now - state.last_failure_time > recovery_timeout_ms) {
				state.state = 'half-open';
				state.failures = 0;
				return false;
			}
			return true;
		}

		return state.failures >= failure_threshold;
	}

	private recordSuccess(agent_id: string): void {
		const state = this.circuitBreaker.get(agent_id);
		if (state) {
			state.failures = 0;
			state.state = 'closed';
		}
	}

	private recordFailure(agent_id: string): void {
		const state = this.circuitBreaker.get(agent_id) ?? {
			failures: 0,
			last_failure_time: 0,
			state: 'closed' as const,
		};

		state.failures++;
		state.last_failure_time = Date.now();

		if (state.failures >= this.config.circuit_breaker.failure_threshold) {
			state.state = 'open';
		}

		this.circuitBreaker.set(agent_id, state);
	}

	private createDecision(
		allow: boolean,
		reason?: string,
		_decision_id?: string,
		warnings?: string[],
		audit_required = false,
		policy_hash = 'unknown',
	): A2ADecision {
		return {
			allow,
			reason,
			violations: allow ? undefined : [reason || 'Access denied'],
			warnings: warnings || [],
			audit_required,
			policy_hash,
			decided_at: new Date().toISOString(),
			branding: DEFAULT_BRANDING,
		};
	}

	private async emitSecurityEvents(
		envelope: RequestEnvelope,
		decision: A2ADecision,
		capabilities: CapabilityDescriptor[],
	): Promise<void> {
		try {
			// Emit access decision event
			await this.securityBus.emit('security.access.evaluated', {
				accessId: `access-${envelope.req_id}`,
				subjectId: envelope.agent_id,
				resourceId: envelope.resource,
				action: envelope.action,
				decision: decision.allow ? 'allow' : 'deny',
				riskScore: this.calculateRiskScore(envelope, capabilities),
				environment: process.env.NODE_ENV || 'development',
				evaluatedAt: decision.decided_at,
			});

			// Emit policy violation if denied
			if (!decision.allow) {
				await this.securityBus.emit('security.policy.violation', {
					violationId: `violation-${envelope.req_id}`,
					policyId: decision.policy_hash,
					violationType: 'access',
					severity: this.getSeverity(envelope.action),
					subjectId: envelope.agent_id,
					resourceId: envelope.resource,
					description: decision.reason || 'Access denied',
					detectedAt: decision.decided_at,
				});
			}
		} catch (error) {
			this.logger.error(
				{
					error: error instanceof Error ? error.message : 'unknown event error',
					branding: DEFAULT_BRANDING,
				},
				'Failed to emit security events',
			);
		}
	}

	private calculateRiskScore(
		envelope: RequestEnvelope,
		capabilities: CapabilityDescriptor[],
	): number {
		let score = 0;

		// Base risk by action type
		if (envelope.action.includes('shell')) score += 50;
		if (envelope.action.includes('file-write')) score += 30;
		if (envelope.action.includes('network')) score += 20;

		// Capability-based risk
		score += capabilities.length * 5;

		// Time-based risk (off-hours)
		const hour = new Date().getHours();
		if (hour < 6 || hour > 22) score += 15;

		return Math.min(score, 100);
	}

	private getSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
		if (action.includes('shell') || action.includes('code-execution')) return 'critical';
		if (action.includes('file-write') || action.includes('network')) return 'high';
		if (action.includes('file-read')) return 'medium';
		return 'low';
	}

	private async appendAuditEvent(envelope: RequestEnvelope, decision: A2ADecision): Promise<void> {
		try {
			const auditEvent: AuditEvent = {
				audit_id: `audit-${envelope.req_id}`,
				event_type: 'access_decision',
				request_id: envelope.req_id,
				agent_id: envelope.agent_id,
				decision,
				prev_hash: this.auditChain?.hash,
				event_hash: '', // Will be calculated
				timestamp: new Date().toISOString(),
				branding: DEFAULT_BRANDING,
			};

			// Calculate tamper-evident hash
			const eventData = JSON.stringify({
				...auditEvent,
				prev_hash: this.auditChain?.hash || 'genesis',
			});

			const crypto = await import('node:crypto');
			auditEvent.event_hash = crypto.createHash('sha256').update(eventData).digest('hex');

			// Update audit chain
			this.auditChain = {
				hash: auditEvent.event_hash,
				timestamp: auditEvent.timestamp,
			};

			// Log audit event
			this.logger.info(
				{
					audit_event: auditEvent,
					branding: DEFAULT_BRANDING,
				},
				'Audit event appended to tamper-evident chain',
			);
		} catch (error) {
			this.logger.error(
				{
					error: error instanceof Error ? error.message : 'unknown audit error',
					branding: DEFAULT_BRANDING,
				},
				'Failed to append audit event',
			);
		}
	}
}
