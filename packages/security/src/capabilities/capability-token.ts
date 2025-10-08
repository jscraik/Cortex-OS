import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
	type CapabilityDescriptor,
	type CapabilityTokenClaims,
	CapabilityTokenClaimsSchema,
	CapabilityTokenError,
} from '../types.js';

const DEFAULT_ISSUER = 'brAInwav-capability-issuer';
const DEFAULT_TTL_SECONDS = 60;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

function base64UrlEncode(value: string | Uint8Array): string {
	return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(segment: string): Buffer {
	if (!BASE64URL_REGEX.test(segment)) {
		throw new CapabilityTokenError('Invalid base64url segment', { segment });
	}
	return Buffer.from(segment, 'base64url');
}

function encodeHeader(): string {
	const header = { alg: 'HS256', typ: 'BCAP' };
	return base64UrlEncode(JSON.stringify(header));
}

function encodePayload(payload: CapabilityTokenClaims): string {
	return base64UrlEncode(JSON.stringify(payload));
}

function sign(data: string, secret: string | Buffer): string {
	const hmac = createHmac('sha256', secret);
	hmac.update(data);
	return hmac.digest('base64url');
}

function timingSafeCompare(a: string, b: string): boolean {
	const bufferA = Buffer.from(a, 'base64url');
	const bufferB = Buffer.from(b, 'base64url');
	if (bufferA.length !== bufferB.length) {
		return false;
	}
	return timingSafeEqual(bufferA, bufferB);
}

export interface IssueCapabilityTokenOptions {
	tenant: string;
	action: string;
	resourcePrefix: string;
	maxCost?: number;
	budgetProfile?: string;
	ttlSeconds?: number;
	metadata?: Record<string, unknown>;
}

export interface CapabilityTokenResult {
	token: string;
	claims: CapabilityTokenClaims;
}

export interface VerifyCapabilityOptions {
	expectedTenant?: string;
	requiredAction?: string;
	requiredResourcePrefix?: string;
	currentEpochSeconds?: number;
}

export class CapabilityTokenIssuer {
	constructor(
		private readonly secret: string | Buffer,
		private readonly issuer: string = DEFAULT_ISSUER,
		private readonly clock: () => number = () => Date.now(),
	) {}

	issue(options: IssueCapabilityTokenOptions): CapabilityTokenResult {
		const nowSeconds = Math.floor(this.clock() / 1000);
		const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
		const claims: CapabilityTokenClaims = {
			iss: this.issuer,
			jti: randomUUID({ disableEntropyCache: true }),
			tenant: options.tenant,
			action: options.action,
			resourcePrefix: options.resourcePrefix,
			maxCost: options.maxCost,
			budgetProfile: options.budgetProfile,
			metadata: options.metadata,
			iat: nowSeconds,
			exp: nowSeconds + ttl,
		};

		const payload = CapabilityTokenClaimsSchema.parse(claims);
		const headerSegment = encodeHeader();
		const payloadSegment = encodePayload(payload);
		const signingInput = `${headerSegment}.${payloadSegment}`;
		const signatureSegment = sign(signingInput, this.secret);

		return {
			token: `${signingInput}.${signatureSegment}`,
			claims: payload,
		};
	}
}

export class CapabilityTokenValidator {
	constructor(
		private readonly secret: string | Buffer,
		private readonly leewaySeconds = 30,
		private readonly clock: () => number = () => Date.now(),
	) {}

	private validateHeader(headerSegment: string): void {
		try {
			const headerBuffer = base64UrlDecode(headerSegment);
			const header = JSON.parse(headerBuffer.toString('utf8')) as Record<string, unknown>;
			if (header?.alg !== 'HS256') {
				throw new CapabilityTokenError('Unsupported capability token algorithm', {
					alg: header?.alg,
				});
			}
		} catch (error) {
			if (error instanceof CapabilityTokenError) throw error;
			throw new CapabilityTokenError('Invalid capability token header', { error });
		}
	}

	verify(token: string, options: VerifyCapabilityOptions = {}): CapabilityDescriptor {
		// eslint-disable-next-line sonarjs/cognitive-complexity
		if (!token || typeof token !== 'string') {
			throw new CapabilityTokenError('Capability token must be a non-empty string');
		}

		const segments = token.split('.');
		if (segments.length !== 3) {
			throw new CapabilityTokenError('Capability token must have exactly three segments');
		}

		const [headerSegment, payloadSegment, signatureSegment] = segments;
		this.validateHeader(headerSegment);

		// Verify signature
		const signingInput = `${headerSegment}.${payloadSegment}`;
		const expectedSignature = sign(signingInput, this.secret);
		if (!timingSafeCompare(expectedSignature, signatureSegment)) {
			throw new CapabilityTokenError('Capability token signature mismatch');
		}

		let claims: CapabilityTokenClaims;
		try {
			const payloadBuffer = base64UrlDecode(payloadSegment);
			const rawClaims = JSON.parse(payloadBuffer.toString('utf8'));
			claims = CapabilityTokenClaimsSchema.parse(rawClaims);
		} catch (error) {
			throw new CapabilityTokenError('Capability token payload is invalid', { error });
		}

		const nowSeconds = Math.floor((options.currentEpochSeconds ?? this.clock()) / 1000);
		if (claims.exp + this.leewaySeconds < nowSeconds) {
			throw new CapabilityTokenError('Capability token has expired', {
				exp: claims.exp,
				now: nowSeconds,
			});
		}

		if (claims.iat - this.leewaySeconds > nowSeconds) {
			throw new CapabilityTokenError('Capability token not valid yet', {
				iat: claims.iat,
				now: nowSeconds,
			});
		}

		if (options.expectedTenant && options.expectedTenant !== claims.tenant) {
			throw new CapabilityTokenError('Capability token tenant mismatch', {
				expectedTenant: options.expectedTenant,
				actualTenant: claims.tenant,
			});
		}

		if (options.requiredAction && options.requiredAction !== claims.action) {
			throw new CapabilityTokenError('Capability token action mismatch', {
				requiredAction: options.requiredAction,
				claimAction: claims.action,
			});
		}

		if (
			options.requiredResourcePrefix &&
			!claims.resourcePrefix.startsWith(options.requiredResourcePrefix)
		) {
			throw new CapabilityTokenError('Capability token resource prefix mismatch', {
				requiredResourcePrefix: options.requiredResourcePrefix,
				claimResourcePrefix: claims.resourcePrefix,
			});
		}

		return {
			tenant: claims.tenant,
			action: claims.action,
			resourcePrefix: claims.resourcePrefix,
			maxCost: claims.maxCost,
			budgetProfile: claims.budgetProfile,
			claims,
		};
	}
}

export function createCapabilitySecret(): string {
	return base64UrlEncode(randomBytes(32));
}
