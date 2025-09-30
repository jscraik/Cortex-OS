import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalMemoryAuthHandler } from '../src/auth/auth-handler.js';
import { LocalMemoryOAuthClient } from '../src/auth/oauth-client.js';
import type { AuthOptions } from '../src/auth/types.js';

// Mock fetch for OAuth tests
// @ts-expect-error - global is available in test environment
globalThis.fetch = vi.fn();

describe('Local Memory OAuth authentication', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('should generate PKCE tokens successfully', async () => {
		const client = new LocalMemoryOAuthClient(
			'brainwav-local-memory',
			'http://localhost:3000/callback',
		);

		const tokens = await client.generatePKCETokens();

		expect(tokens.codeVerifier).toBeDefined();
		expect(tokens.codeChallenge).toBeDefined();
		expect(tokens.codeChallengeMethod).toBe('S256');
		expect(tokens.codeVerifier.length).toBeGreaterThan(20);
		expect(tokens.codeChallenge.length).toBeGreaterThan(20);
	});

	it('should validate loopback URLs only', () => {
		const validOptions: AuthOptions = {
			clientId: 'brainwav-local-memory',
			redirectUri: 'http://localhost:3000/callback',
		};

		// This should not throw
		expect(() => new LocalMemoryAuthHandler(validOptions)).not.toThrow();

		const invalidOptions: AuthOptions = {
			clientId: 'brainwav-local-memory',
			redirectUri: 'http://example.com/callback',
		};

		// This should throw due to non-loopback URI
		expect(() => new LocalMemoryAuthHandler(invalidOptions)).toThrow(/brAInwav security.*loopback/);
	});

	it('should handle OAuth callback URL parsing', async () => {
		const authOptions: AuthOptions = {
			clientId: 'brainwav-local-memory',
			redirectUri: 'http://localhost:3000/callback',
		};

		const authHandler = new LocalMemoryAuthHandler(authOptions);
		const callbackUrl = 'http://localhost:3000/callback?code=auth-123&state=xyz';

		const code = await authHandler.handleCallback(callbackUrl);
		expect(code).toBe('auth-123');
	});

	it('should reject callback with error parameter', async () => {
		const authOptions: AuthOptions = {
			clientId: 'brainwav-local-memory',
			redirectUri: 'http://localhost:3000/callback',
		};

		const authHandler = new LocalMemoryAuthHandler(authOptions);
		const callbackUrl = 'http://localhost:3000/callback?error=access_denied';

		await expect(authHandler.handleCallback(callbackUrl)).rejects.toThrow(
			/brAInwav OAuth callback error.*access_denied/,
		);
	});

	it('should validate JWT tokens correctly', async () => {
		const client = new LocalMemoryOAuthClient(
			'brainwav-local-memory',
			'http://localhost:3000/callback',
		);

		// Valid JWT structure (base64-encoded)
		const validToken =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.invalid';

		const isValid = await client.validateToken(validToken);
		expect(isValid).toBe(true);

		// Invalid token structure
		const invalidToken = 'invalid.token.structure';
		const isInvalid = await client.validateToken(invalidToken);
		expect(isInvalid).toBe(false);
	});

	it('should exchange code for token with proper payload', async () => {
		const mockFetch = vi.mocked(fetch);
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					access_token: 'test-token-123',
					token_type: 'Bearer',
					expires_in: 3600,
				}),
				{ status: 200 },
			),
		);

		const client = new LocalMemoryOAuthClient(
			'brainwav-local-memory',
			'http://localhost:3000/callback',
		);

		const token = await client.exchangeCodeForToken('auth-code', 'code-verifier');

		expect(token.access_token).toBe('test-token-123');
		expect(token.token_type).toBe('Bearer');
		expect(token.expires_in).toBe(3600);

		expect(mockFetch).toHaveBeenCalledWith(
			'http://127.0.0.1:3000/oauth/token',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'brAInwav-LocalMemory/1.0',
				}),
				body: expect.any(URLSearchParams),
			}),
		);
	});
});
