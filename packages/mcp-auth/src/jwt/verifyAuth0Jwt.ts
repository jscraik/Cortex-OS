import { createLocalJWKSet, createRemoteJWKSet, errors, jwtVerify } from 'jose';
import type { JWTPayload, JWTVerifyOptions, JSONWebKeySet } from 'jose';
import type { KeyLike } from 'jose';
import {
	type Auth0JwtConfig,
	type Auth0JwtError,
	type Auth0JwtSuccess,
	type VerifyAuth0JwtOptions,
} from '../types.js';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CLOCK_TOLERANCE_SEC = 5;
type RemoteJWKResolver = ReturnType<typeof createRemoteJWKSet<KeyLike>>;
const jwksCache = new Map<string, RemoteJWKResolver>();

function normalizeDomain(domain: string): string {
	const trimmed = domain.trim();
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return new URL(trimmed).hostname;
	}
	return trimmed;
}

function buildIssuer(domain: string): string {
	const normalized = normalizeDomain(domain);
	return `https://${normalized}/`;
}

function buildJwksUrl(issuer: string): string {
	const base = issuer.endsWith('/') ? issuer : `${issuer}/`;
	return `${base}.well-known/jwks.json`;
}

function toConfig(options: VerifyAuth0JwtOptions): Auth0JwtConfig {
	const requiredScopes = options.requiredScopes?.filter(Boolean) ?? [];
	const issuer = buildIssuer(options.domain);
	return {
		issuer,
		jwksUrl: buildJwksUrl(issuer),
		audience: options.audience,
		requiredScopes,
		jwksCacheTtlMs: options.jwksCacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
		clockToleranceSec: options.clockToleranceSec ?? DEFAULT_CLOCK_TOLERANCE_SEC,
	};
}

function getJwks(
	config: Auth0JwtConfig,
	overrideSet?: JSONWebKeySet,
): RemoteJWKResolver {
	const cacheKey = `${config.issuer}:${config.jwksCacheTtlMs}`;
	const cached = jwksCache.get(cacheKey);
	if (cached) {
		return cached;
	}
	if (overrideSet) {
		const local = createLocalJWKSet(overrideSet);
		jwksCache.set(cacheKey, local);
		return local;
	}
	const remote = createRemoteJWKSet<KeyLike>(new URL(config.jwksUrl), {
		cacheMaxAge: config.jwksCacheTtlMs,
		cooldownDuration: 5_000,
		timeoutDuration: 5_000,
	});
	jwksCache.set(cacheKey, remote);
	return remote;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
	const seen = new Set<string>();
	for (const value of values) {
		if (value && value.trim()) {
			seen.add(value.trim());
		}
	}
	return [...seen];
}

function extractScopes(payload: JWTPayload): { scopes: string[]; permissions: string[] } {
	const scopeClaim = typeof payload.scope === 'string' ? payload.scope.split(/\s+/) : [];
	const permissionsClaim = Array.isArray(payload.permissions)
		? payload.permissions.filter((item): item is string => typeof item === 'string')
		: [];
	const permissions = uniqueStrings(permissionsClaim);
	return {
		scopes: uniqueStrings(scopeClaim.concat(permissions)),
		permissions,
	};
}

function ensureRequiredScopes(scopes: string[], required: string[]): void {
	for (const scope of required) {
		if (!scopes.includes(scope)) {
			throw Object.assign(new Error(`Missing required scope: ${scope}`), {
				code: 'insufficient_scope',
			});
		}
	}
}

function toSuccess(payload: JWTPayload, scopes: string[], permissions: string[]): Auth0JwtSuccess {
	const subject = typeof payload.sub === 'string' ? payload.sub : 'unknown';
	const azp = typeof payload.azp === 'string' ? payload.azp : null;
	const clientId =
		azp ?? (typeof payload.client_id === 'string' ? payload.client_id : null);
	return {
		ok: true,
		subject,
		clientId,
		scopes,
		permissions,
		expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : null,
		issuedAt: typeof payload.iat === 'number' ? payload.iat * 1000 : null,
		claims: payload,
	};
}

function classifyJoseError(error: unknown): Auth0JwtError {
	if (error instanceof errors.JWTExpired) {
		return {
			ok: false,
			code: 'token_expired',
			message: 'Access token expired',
			status: 401,
			cause: error,
		};
	}
	if (error instanceof errors.JWTClaimValidationFailed) {
		if (error.claim === 'iss') {
			return {
				ok: false,
				code: 'issuer_mismatch',
				message: 'Issuer does not match expected Auth0 tenant',
				status: 401,
				cause: error,
			};
		}
		if (error.claim === 'aud') {
			return {
				ok: false,
				code: 'audience_mismatch',
				message: 'Audience does not match configured resource identifier',
				status: 401,
				cause: error,
			};
		}
	}
	if (error instanceof Error && (error as any).code === 'insufficient_scope') {
		return {
			ok: false,
			code: 'insufficient_scope',
			message: error.message,
			status: 401,
			cause: error,
		};
	}
	if (error instanceof errors.JOSEError) {
		return {
			ok: false,
			code: 'invalid_token',
			message: error.message,
			status: 401,
			cause: error,
		};
	}
	const message = error instanceof Error ? error.message : 'Token verification failed';
	return { ok: false, code: 'invalid_token', message, status: 401 };
}

export async function verifyAuth0Jwt(
	token: string | null | undefined,
	options: VerifyAuth0JwtOptions,
): Promise<Auth0JwtSuccess | Auth0JwtError> {
	if (!token) {
		return {
			ok: false,
			code: 'token_missing',
			message: 'Authorization header missing bearer token',
			status: 400,
		};
	}
	const config = toConfig(options);
	try {
		const jwks = getJwks(config, options.jwks);
		const verifyOptions: JWTVerifyOptions = {
			issuer: config.issuer,
			audience: config.audience,
			clockTolerance: config.clockToleranceSec,
		};
		const { payload } = await jwtVerify(token, jwks, verifyOptions);
		const { scopes, permissions } = extractScopes(payload);
		ensureRequiredScopes(scopes.concat(permissions), config.requiredScopes);
		return toSuccess(payload, scopes, permissions);
	} catch (error) {
		return classifyJoseError(error);
	}
}

export function clearAuthVerifierCache(): void {
	jwksCache.clear();
}
