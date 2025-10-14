import type { JWTPayload, JSONWebKeySet } from 'jose';

export type VerifyAuth0JwtOptions = {
	domain: string;
	audience: string;
	requiredScopes?: string[];
	jwksCacheTtlMs?: number;
	clockToleranceSec?: number;
	jwks?: JSONWebKeySet;
};

export type Auth0JwtConfig = {
	issuer: string;
	jwksUrl: string;
	audience: string;
	requiredScopes: string[];
	jwksCacheTtlMs: number;
	clockToleranceSec: number;
};

export type Auth0JwtSuccess = {
	ok: true;
	subject: string;
	clientId: string | null;
	scopes: string[];
	permissions: string[];
	expiresAt: number | null;
	issuedAt: number | null;
	claims: JWTPayload;
};

export type Auth0JwtErrorCode =
	| 'token_missing'
	| 'invalid_token'
	| 'token_expired'
	| 'insufficient_scope'
	| 'issuer_mismatch'
	| 'audience_mismatch';

export type Auth0JwtError = {
	ok: false;
	code: Auth0JwtErrorCode;
	message: string;
	status: 401 | 400;
	details?: string;
	cause?: Error;
};
