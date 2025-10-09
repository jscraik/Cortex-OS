/**
 * @file Signed Envelope System
 * @description JWS-based request envelope signing and validation for zero-trust A2A
 */

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { RequestContext, RequestEnvelope } from './types.js';

/**
 * Shared signature creation function to avoid duplication
 */
function createEnvelopeSignature(payload: string, secret: string | Buffer): string {
	const hmac = createHmac('sha256', secret);
	hmac.update(payload, 'utf8');
	return hmac.digest('base64url');
}

export interface EnvelopeSigningOptions {
	/** Secret key for HMAC signing */
	secret: string | Buffer;
	/** Clock function for testing */
	clock?: () => number;
}

export interface EnvelopeValidationOptions {
	/** Maximum envelope age in seconds */
	max_age_seconds?: number;
	/** Expected tenant (optional validation) */
	expected_tenant?: string;
	/** Clock function for testing */
	clock?: () => number;
}

export class RequestEnvelopeSigner {
	constructor(
		private readonly secret: string | Buffer,
		private readonly clock: () => number = () => Date.now(),
	) {}

	/**
	 * Sign a request envelope with JWS detached signature
	 */
	signEnvelope(
		agent_id: string,
		action: string,
		resource: string,
		context: RequestContext,
		capabilities: string[],
		attestations?: Record<string, boolean>,
	): RequestEnvelope {
		const req_id = randomUUID({ disableEntropyCache: true });

		const envelope: Omit<RequestEnvelope, 'sig'> = {
			req_id,
			agent_id,
			action,
			resource,
			context: {
				...context,
				ts: Math.floor(this.clock() / 1000),
			},
			capabilities,
			attestations,
		};

		const payload = this.createCanonicalPayload(envelope);
		const signature = this.signPayload(payload);

		return {
			...envelope,
			sig: signature,
		};
	}

	private createCanonicalPayload(envelope: Omit<RequestEnvelope, 'sig'>): string {
		// Create deterministic JSON representation for signing
		return JSON.stringify(
			envelope,
			Object.keys(envelope).sort((a, b) => a.localeCompare(b)),
		);
	}

	private signPayload(payload: string): string {
		return createEnvelopeSignature(payload, this.secret);
	}
}

export class SignedEnvelopeValidator {
	constructor(
		private readonly secret: string | Buffer,
		private readonly leeway_seconds = 30,
		private readonly clock: () => number = () => Date.now(),
	) {}

	/**
	 * Validate a signed request envelope
	 */
	validateEnvelope(
		envelope: RequestEnvelope,
		options: EnvelopeValidationOptions = {},
	): { valid: boolean; reason?: string; envelope_age_seconds: number } {
		try {
			// Extract signature
			const { sig: signature, ...unsigned_envelope } = envelope;

			if (!signature) {
				return { valid: false, reason: 'Missing signature', envelope_age_seconds: 0 };
			}

			// Verify signature
			const canonical_payload = this.createCanonicalPayload(unsigned_envelope);
			const expected_signature = this.signPayload(canonical_payload);

			if (!this.timingSafeCompare(signature, expected_signature)) {
				return { valid: false, reason: 'brAInwav signature mismatch', envelope_age_seconds: 0 };
			}

			// Check timestamp
			const now_seconds = Math.floor((options.clock?.() ?? this.clock()) / 1000);
			const envelope_age_seconds = now_seconds - envelope.context.ts;

			if (envelope_age_seconds < -this.leeway_seconds) {
				return {
					valid: false,
					reason: 'brAInwav envelope from future',
					envelope_age_seconds,
				};
			}

			const max_age = options.max_age_seconds ?? 300; // 5 minutes default
			if (envelope_age_seconds > max_age + this.leeway_seconds) {
				return {
					valid: false,
					reason: 'brAInwav envelope expired',
					envelope_age_seconds,
				};
			}

			// Optional tenant validation
			if (options.expected_tenant && envelope.context.tenant !== options.expected_tenant) {
				return {
					valid: false,
					reason: `brAInwav tenant mismatch: expected ${options.expected_tenant}`,
					envelope_age_seconds,
				};
			}

			return { valid: true, envelope_age_seconds };
		} catch (error) {
			return {
				valid: false,
				reason: `brAInwav envelope validation error: ${error instanceof Error ? error.message : 'unknown'}`,
				envelope_age_seconds: 0,
			};
		}
	}

	private createCanonicalPayload(envelope: Omit<RequestEnvelope, 'sig'>): string {
		return JSON.stringify(
			envelope,
			Object.keys(envelope).sort((a, b) => a.localeCompare(b)),
		);
	}

	private signPayload(payload: string): string {
		return createEnvelopeSignature(payload, this.secret);
	}

	private timingSafeCompare(a: string, b: string): boolean {
		const bufferA = Buffer.from(a, 'base64url');
		const bufferB = Buffer.from(b, 'base64url');

		if (bufferA.length !== bufferB.length) {
			return false;
		}

		return timingSafeEqual(bufferA, bufferB);
	}
}

export interface ReplayDetectionStore {
	hasRequestId(req_id: string): Promise<boolean>;
	storeRequestId(req_id: string, expires_at: Date): Promise<void>;
}

export class InMemoryReplayDetection implements ReplayDetectionStore {
	private readonly store = new Map<string, Date>();

	async hasRequestId(req_id: string): Promise<boolean> {
		const expires_at = this.store.get(req_id);
		if (!expires_at) {
			return false;
		}

		if (expires_at < new Date()) {
			this.store.delete(req_id);
			return false;
		}

		return true;
	}

	async storeRequestId(req_id: string, expires_at: Date): Promise<void> {
		this.store.set(req_id, expires_at);

		// Cleanup expired entries periodically
		if (this.store.size % 100 === 0) {
			this.cleanup();
		}
	}

	private cleanup(): void {
		const now = new Date();
		for (const [req_id, expires_at] of this.store.entries()) {
			if (expires_at < now) {
				this.store.delete(req_id);
			}
		}
	}
}
