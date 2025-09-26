import { createHmac, timingSafeEqual } from 'node:crypto';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { z } from 'zod';

export const AuthTokenSchema = z.object({
	sub: z.string(),
	source: z.string().optional(),
	scopes: z.array(z.string()).optional(),
	exp: z.number(),
	iss: z.string(),
	aud: z.string().optional(),
});

export interface AuthContext {
	subject: string;
	source?: string;
	scopes: string[];
	expiresAt: Date;
}

export class AuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthenticationError';
	}
}

export class AuthorizationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthorizationError';
	}
}

export interface Authenticator {
	authenticate(envelope: A2AEventEnvelope): Promise<AuthContext>;
	authorize(context: AuthContext, operation: string): boolean;
}

export class SimpleTokenAuthenticator implements Authenticator {
	constructor(
		private readonly config: {
			secret: string;
			issuer: string;
			audience?: string;
		},
	) {}

	async authenticate(envelope: A2AEventEnvelope): Promise<AuthContext> {
		const token = this.extractToken(envelope);

		if (!token) {
			throw new AuthenticationError('No authentication token provided');
		}

		return this.verifyToken(token, envelope.source);
	}

	authorize(context: AuthContext, operation: string): boolean {
		return this.hasScope(context.scopes, operation);
	}

	private extractToken(envelope: A2AEventEnvelope): string | null {
		// OLD (BROKEN): envelope.metadata.labels?.authorization
		// NEW (FIXED): Use envelope.headers
		const authHeader = envelope.headers?.authorization || envelope.headers?.Authorization;
		if (authHeader) {
			const bearerRegex = /^Bearer (.+)$/;
			const match = bearerRegex.exec(authHeader);
			return match?.[1] || null;
		}

		return envelope.headers?.['auth-token'] || null;
	}

	private async verifyToken(token: string, envelopeSource: string): Promise<AuthContext> {
		try {
			// Simple token format: base64(payload).signature
			const parts = token.split('.');
			if (parts.length !== 2) {
				throw new Error('Invalid token format');
			}

			const payloadB64 = parts[0];
			const signature = parts[1];
			if (!payloadB64 || !signature) {
				throw new Error('Invalid token components');
			}

			const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')) as unknown;

			// Verify signature
			const expectedSignature = this.createSignature(payloadB64);
			const providedSignature = Buffer.from(signature, 'base64');

			if (!timingSafeEqual(expectedSignature, providedSignature)) {
				throw new Error('Invalid signature');
			}

			const validated = AuthTokenSchema.parse(payload);

			// Check expiration
			if (Date.now() >= validated.exp * 1000) {
				throw new Error('Token expired');
			}

			// Check issuer
			if (validated.iss !== this.config.issuer) {
				throw new Error('Invalid issuer');
			}

			// Check audience if configured
			if (this.config.audience && validated.aud !== this.config.audience) {
				throw new Error('Invalid audience');
			}

			// Verify source matches token if specified
			if (validated.source && envelopeSource !== validated.source) {
				throw new AuthenticationError('Source mismatch');
			}

			return {
				subject: validated.sub,
				source: validated.source,
				scopes: validated.scopes || [],
				expiresAt: new Date(validated.exp * 1000),
			};
		} catch (error) {
			if (error instanceof AuthenticationError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new AuthenticationError(`Invalid token: ${errorMessage}`);
		}
	}

	private createSignature(payload: string): Buffer {
		return createHmac('sha256', this.config.secret).update(payload).digest();
	}

	private hasScope(scopes: string[], operation: string): boolean {
		return scopes.includes(operation) || scopes.includes('*');
	}
}

export const createSimpleTokenAuthenticator = (config: {
	secret: string;
	issuer: string;
	audience?: string;
}): SimpleTokenAuthenticator => {
	return new SimpleTokenAuthenticator(config);
};
