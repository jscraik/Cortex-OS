import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearAuthVerifierCache, verifyAuth0Jwt } from '../src/jwt/verifyAuth0Jwt.js';

const AUTH0_DOMAIN = 'unit-tests.auth0.com';
const ISSUER = `https://${AUTH0_DOMAIN}/`;
const AUDIENCE = 'https://api.cortex-os.dev/mcp';
const KID = 'test-key';
let privateKey: CryptoKey;
let jwks: { keys: Array<Record<string, unknown>> };

async function createToken(
	expiresInSeconds: number,
	claims: Record<string, unknown> = {},
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	return new SignJWT({
		sub: 'auth0|user',
		azp: 'chatgpt-client',
		permissions: ['search.read'],
		...claims,
	})
		.setProtectedHeader({ alg: 'RS256', kid: KID })
		.setIssuer(ISSUER)
		.setAudience(AUDIENCE)
		.setIssuedAt(now)
		.setExpirationTime(now + expiresInSeconds)
		.sign(privateKey);
}

beforeAll(async () => {
	const pair = await generateKeyPair('RS256');
	privateKey = pair.privateKey;
	const jwk = await exportJWK(pair.publicKey);
	jwks = { keys: [{ ...jwk, kid: KID, use: 'sig', alg: 'RS256' }] };
});

beforeEach(() => {
	clearAuthVerifierCache();
});

describe('verifyAuth0Jwt', () => {
	it('returns success with scopes from permissions', async () => {
		const token = await createToken(300);
	const result = await verifyAuth0Jwt(token, {
		domain: AUTH0_DOMAIN,
		audience: AUDIENCE,
		requiredScopes: ['search.read'],
		jwks,
	});
	expect(result.ok).toBe(true);
	if (result.ok) {
		expect(result.scopes).toContain('search.read');
			expect(result.clientId).toBe('chatgpt-client');
			expect(result.subject).toBe('auth0|user');
		}
	});

	it('supports space-delimited scope claim', async () => {
		const token = await createToken(300, { permissions: undefined, scope: 'search.read docs.write' });
		const result = await verifyAuth0Jwt(token, {
			domain: AUTH0_DOMAIN,
			audience: AUDIENCE,
			requiredScopes: ['docs.write'],
			jwks,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.scopes).toEqual(['search.read', 'docs.write']);
		}
	});

	it('rejects expired token', async () => {
		const token = await createToken(-60);
		const result = await verifyAuth0Jwt(token, {
			domain: AUTH0_DOMAIN,
			audience: AUDIENCE,
			jwks,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe('token_expired');
		}
	});

	it('rejects wrong audience', async () => {
		const token = await createToken(300);
		const result = await verifyAuth0Jwt(token, {
			domain: AUTH0_DOMAIN,
			audience: 'https://other.example/api',
			jwks,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe('audience_mismatch');
		}
	});

	it('rejects wrong issuer', async () => {
	const token = await createToken(300);
	const result = await verifyAuth0Jwt(token, {
		domain: 'malicious.example.com',
		audience: AUDIENCE,
		jwks,
	});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe('issuer_mismatch');
		}
	});

	it('rejects missing required scope', async () => {
		const token = await createToken(300, { permissions: ['search.read'] });
		const result = await verifyAuth0Jwt(token, {
			domain: AUTH0_DOMAIN,
			audience: AUDIENCE,
			requiredScopes: ['docs.write'],
			jwks,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe('insufficient_scope');
		}
	});
});
