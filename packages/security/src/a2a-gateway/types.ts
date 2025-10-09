/**
 * @file A2A Gateway Types
 * @description TypeScript interfaces for zero-trust A2A gateway components
 */

import type { CapabilityDescriptor } from '../types.js';

export interface RequestEnvelope {
	/** Unique request identifier */
	req_id: string;
	/** Agent identifier making the request */
	agent_id: string;
	/** Action being requested */
	action: string;
	/** Resource being accessed */
	resource: string;
	/** Request context including tenant and cost information */
	context: RequestContext;
	/** Array of capability tokens */
	capabilities: string[];
	/** Attestations for high-risk operations */
	attestations?: Record<string, boolean>;
	/** JWS signature over the envelope */
	sig: string;
}

export interface RequestContext {
	/** Tenant identifier */
	tenant: string;
	/** Estimated request cost */
	request_cost: number;
	/** Request timestamp */
	ts: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

export interface A2ADecision {
	/** Whether the request is allowed */
	allow: boolean;
	/** Reason for the decision */
	reason?: string;
	/** Policy violations detected */
	violations?: string[];
	/** Warnings for the requester */
	warnings?: string[];
	/** Whether audit is required */
	audit_required: boolean;
	/** Policy metadata */
	policy_hash: string;
	/** Decision timestamp */
	decided_at: string;
	/** brAInwav branding */
	branding: string;
}

export interface A2AContext {
	/** Authentication information */
	authn: {
		valid: boolean;
		method: 'mtls' | 'jwt' | 'envelope';
		subject?: string;
	};
	/** Parsed envelope */
	envelope: RequestEnvelope;
	/** Validated capabilities */
	capabilities: CapabilityDescriptor[];
	/** Current budget usage */
	budget_usage?: {
		total_req: number;
		total_cost: number;
		total_duration_ms: number;
	};
	/** Request metadata */
	metadata: {
		source_ip?: string;
		user_agent?: string;
		correlation_id?: string;
	};
}

export interface A2AGatewayConfig {
	/** OPA WASM policy path */
	policy_wasm_path?: string;
	/** Capability token secret */
	capability_secret: string;
	/** mTLS configuration */
	mtls_config?: {
		ca_cert_path: string;
		cert_path: string;
		key_path: string;
	};
	/** Audit configuration */
	audit_config: {
		enabled: boolean;
		tamper_evident: boolean;
		sink_url?: string;
	};
	/** Circuit breaker thresholds */
	circuit_breaker: {
		failure_threshold: number;
		recovery_timeout_ms: number;
	};
	/** brAInwav branding configuration */
	branding: {
		organization: string;
		version: string;
	};
}

export interface AuditEvent {
	/** Unique audit event ID */
	audit_id: string;
	/** Event type */
	event_type: 'access_decision' | 'policy_violation' | 'capability_issued' | 'envelope_validated';
	/** Request ID being audited */
	request_id: string;
	/** Agent involved */
	agent_id: string;
	/** Decision or outcome */
	decision: A2ADecision;
	/** Hash of previous audit event for tamper evidence */
	prev_hash?: string;
	/** Current event hash */
	event_hash: string;
	/** Timestamp */
	timestamp: string;
	/** brAInwav metadata */
	branding: string;
}
