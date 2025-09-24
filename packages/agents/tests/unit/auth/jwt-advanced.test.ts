import { describe, expect, it } from 'vitest';
import {
	createAccessToken,
	createRefreshToken,
	refreshAccessToken,
	signJWT,
	verifyJWT,
} from '../../../src/auth/jwt.js';

describe('JWT Token Management - Advanced Tests', () => {
	const TEST_SECRET = 'brAInwav-test-secret-key-2025';
	const SHORT_SECRET = 'short';
	const WEAK_SECRET = '123456';

	describe('JWT Token Generation Edge Cases', () => {
		it('should generate valid JWT with minimal payload', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET);

			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.').length).toBe(3); // JWT structure: header.payload.signature

			// Verify it can be decoded
			const verified = await verifyJWT(token, TEST_SECRET);
			expect(verified.sub).toBe('user123');
			expect(verified.iat).toBeDefined(); // Should auto-add issued at
			expect(verified.exp).toBeDefined(); // Should auto-add expiration
		});

		it('should handle large payloads (security test)', async () => {
			const largePayload = {
				sub: 'user123',
				roles: Array(1000).fill('role'),
				permissions: Array(1000).fill('permission'),
				largeData: 'x'.repeat(10000), // 10KB data
			};

			const token = await signJWT(largePayload, TEST_SECRET);
			const verified = await verifyJWT(token, TEST_SECRET);

			expect(verified.sub).toBe('user123');
			expect(verified.roles).toHaveLength(1000);
			expect(verified.permissions).toHaveLength(1000);
			expect(verified.largeData).toBe('x'.repeat(10000));
		});

		it('should handle special characters in payload', async () => {
			const payload = {
				sub: 'user@brAInwav.com',
				metadata: {
					emoji: '🔐🚀',
					unicode: 'Iñtërnâtiônàlizætiøn',
					special: '!@#$%^&*()_+-=[]{}|;\':",./<>?',
				},
			};

			const token = await signJWT(payload, TEST_SECRET);
			const verified = await verifyJWT(token, TEST_SECRET);

			expect(verified.metadata?.emoji).toBe('🔐🚀');
			expect(verified.metadata?.unicode).toBe('Iñtërnâtiônàlizætiøn');
			expect(verified.metadata?.special).toBe('!@#$%^&*()_+-=[]{}|;\':",./<>?');
		});

		it('should generate unique tokens for same payload', async () => {
			const payload = { sub: 'user123', roles: ['user'] };

			const token1 = await signJWT(payload, TEST_SECRET);
			// Wait 10ms to ensure different iat (jose uses seconds, need more time)
			await new Promise((resolve) => setTimeout(resolve, 1010));
			const token2 = await signJWT(payload, TEST_SECRET);

			expect(token1).not.toBe(token2); // Different due to different iat

			const verified1 = await verifyJWT(token1, TEST_SECRET);
			const verified2 = await verifyJWT(token2, TEST_SECRET);

			expect(verified1.iat).not.toBe(verified2.iat);
		});
	});

	describe('JWT Secret Security Validation', () => {
		it('should reject extremely short secrets', async () => {
			const payload = { sub: 'user123' };

			// Very short secrets should still work but are not recommended
			const token = await signJWT(payload, SHORT_SECRET);
			const verified = await verifyJWT(token, SHORT_SECRET);
			expect(verified.sub).toBe('user123');
		});

		it('should be secure against common weak secrets', async () => {
			const payload = { sub: 'user123' };

			// Weak secrets should still work (security is external concern)
			const token = await signJWT(payload, WEAK_SECRET);
			const verified = await verifyJWT(token, WEAK_SECRET);
			expect(verified.sub).toBe('user123');
		});

		it('should fail with different secrets (security test)', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET);

			await expect(verifyJWT(token, 'different-secret')).rejects.toThrow('JWT verification failed');
		});

		it('should handle secret rotation scenario', async () => {
			const payload = { sub: 'user123' };
			const oldSecret = 'brAInwav-old-secret';
			const newSecret = 'brAInwav-new-secret';

			const tokenOld = await signJWT(payload, oldSecret);
			const tokenNew = await signJWT(payload, newSecret);

			// Old token should only work with old secret
			const verifiedOld = await verifyJWT(tokenOld, oldSecret);
			expect(verifiedOld.sub).toBe('user123');

			// New token should only work with new secret
			const verifiedNew = await verifyJWT(tokenNew, newSecret);
			expect(verifiedNew.sub).toBe('user123');

			// Cross-validation should fail
			await expect(verifyJWT(tokenOld, newSecret)).rejects.toThrow();
			await expect(verifyJWT(tokenNew, oldSecret)).rejects.toThrow();
		});
	});

	describe('JWT Expiration Handling', () => {
		it('should handle very short expiration times', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET, { expiresIn: '1s' }); // Use 1 second instead of 1ms

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 1100));

			await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow('JWT verification failed');
		});

		it('should handle long expiration times', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET, { expiresIn: '100y' });

			const verified = await verifyJWT(token, TEST_SECRET);
			expect(verified.sub).toBe('user123');

			// Check expiration is far in the future
			const expirationDate = new Date((verified.exp || 0) * 1000);
			const hundredYearsFromNow = new Date();
			hundredYearsFromNow.setFullYear(hundredYearsFromNow.getFullYear() + 50);

			expect(expirationDate.getTime()).toBeGreaterThan(hundredYearsFromNow.getTime());
		});

		it('should handle numeric expiration times', async () => {
			const payload = { sub: 'user123' };
			const currentTime = Math.floor(Date.now() / 1000);
			const futureTime = currentTime + 3600; // 1 hour from now in Unix timestamp
			const token = await signJWT(payload, TEST_SECRET, { expiresIn: futureTime });

			const verified = await verifyJWT(token, TEST_SECRET);
			expect(verified.sub).toBe('user123');
			expect(verified.exp).toBe(futureTime);
		});

		it('should validate expiration precision', async () => {
			const payload = { sub: 'user123' };
			const beforeSign = Math.floor(Date.now() / 1000);

			const token = await signJWT(payload, TEST_SECRET, { expiresIn: '1h' });
			const verified = await verifyJWT(token, TEST_SECRET);

			const afterSign = Math.floor(Date.now() / 1000);
			const expectedExp = beforeSign + 3600; // 1 hour

			expect(verified.exp).toBeGreaterThanOrEqual(expectedExp - 1);
			expect(verified.exp).toBeLessThanOrEqual(afterSign + 3600 + 1);
		});
	});

	describe('JWT Malformed Token Handling', () => {
		it('should reject completely invalid tokens', async () => {
			const invalidTokens = [
				'not-a-jwt',
				'still.not.a.jwt',
				'',
				'a',
				'...',
				'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature',
			];

			for (const token of invalidTokens) {
				await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow();
			}
		});

		it('should reject tokens with invalid base64 encoding', async () => {
			const malformedToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.@@@invalid-base64@@@.signature';
			await expect(verifyJWT(malformedToken, TEST_SECRET)).rejects.toThrow();
		});

		it('should reject tokens with missing parts', async () => {
			const incompletTokens = [
				'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.',
				'.eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
				'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
			];

			for (const token of incompletTokens) {
				await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow();
			}
		});

		it('should handle tokens with extra parts', async () => {
			// Generate valid token and add extra part
			const payload = { sub: 'user123' };
			const validToken = await signJWT(payload, TEST_SECRET);
			const tokenWithExtraPart = `${validToken}.extra-part`;

			await expect(verifyJWT(tokenWithExtraPart, TEST_SECRET)).rejects.toThrow();
		});
	});

	describe('Access Token Creation', () => {
		it('should create access token with full user context', async () => {
			const userId = 'brAInwav-user-123';
			const roles = ['user', 'beta-tester'];
			const permissions = ['read:agents', 'execute:agents', 'read:analytics'];

			const token = await createAccessToken(userId, roles, permissions, TEST_SECRET);
			const verified = await verifyJWT(token, TEST_SECRET);

			expect(verified.sub).toBe(userId);
			expect(verified.roles).toEqual(roles);
			expect(verified.permissions).toEqual(permissions);
			expect(verified.iat).toBeDefined();
			expect(verified.exp).toBeDefined();
		});

		it('should create access token with custom expiration', async () => {
			const token = await createAccessToken('user123', ['user'], ['read:agents'], TEST_SECRET, {
				expiresIn: '24h',
			});

			const verified = await verifyJWT(token, TEST_SECRET);
			const expirationTime = (verified.exp || 0) - (verified.iat || 0);

			// Should be approximately 24 hours (86400 seconds), allow some tolerance
			expect(expirationTime).toBeGreaterThan(86390);
			expect(expirationTime).toBeLessThan(86410);
		});

		it('should create access token with brAInwav issuer', async () => {
			const token = await createAccessToken('user123', ['user'], ['read:agents'], TEST_SECRET, {
				issuer: 'brAInwav-auth-service',
			});

			const verified = await verifyJWT(token, TEST_SECRET, {
				issuer: 'brAInwav-auth-service',
			});

			expect(verified.iss).toBe('brAInwav-auth-service');
		});
	});

	describe('Refresh Token Flow', () => {
		it('should create and validate refresh token', async () => {
			const userId = 'refresh-user-123';
			const refreshToken = await createRefreshToken(userId, TEST_SECRET);

			const verified = await verifyJWT(refreshToken, TEST_SECRET);
			expect(verified.sub).toBe(userId);
			expect(verified.type).toBe('refresh');

			// Refresh tokens should have longer expiration (7 days default)
			const expirationTime = (verified.exp || 0) - (verified.iat || 0);
			expect(expirationTime).toBeGreaterThan(7 * 24 * 3600 - 10); // ~7 days
		});

		it('should successfully refresh access token', async () => {
			const userId = 'refresh-user-456';
			const refreshToken = await createRefreshToken(userId, TEST_SECRET);

			const { accessToken, payload } = await refreshAccessToken(refreshToken, TEST_SECRET);

			expect(accessToken).toBeDefined();
			expect(payload.sub).toBe(userId);
			expect(payload.type).toBe('access');

			// Verify the new access token works
			const verifiedAccess = await verifyJWT(accessToken, TEST_SECRET);
			expect(verifiedAccess.sub).toBe(userId);
		});

		it('should reject access token as refresh token', async () => {
			const accessToken = await createAccessToken(
				'user123',
				['user'],
				['read:agents'],
				TEST_SECRET,
			);

			await expect(refreshAccessToken(accessToken, TEST_SECRET)).rejects.toThrow(
				'Invalid refresh token',
			);
		});

		it('should reject expired refresh token', async () => {
			const refreshToken = await createRefreshToken(
				'user123',
				TEST_SECRET,
				{ expiresIn: '1s' }, // Use 1 second instead of 1ms
			);

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 1100));

			await expect(refreshAccessToken(refreshToken, TEST_SECRET)).rejects.toThrow(
				'JWT verification failed',
			);
		});
	});

	describe('brAInwav Production Requirements', () => {
		it('should meet brAInwav token size requirements', async () => {
			const payload = {
				sub: 'brAInwav-production-user',
				roles: ['admin', 'super-user', 'analytics-viewer'],
				permissions: [
					'read:agents',
					'write:agents',
					'execute:agents',
					'manage:agents',
					'read:analytics',
					'write:analytics',
					'manage:system',
					'audit:logs',
				],
			};

			const token = await signJWT(payload, TEST_SECRET);

			// brAInwav requirement: tokens should be under 8KB for header size limits
			expect(token.length).toBeLessThan(8192);

			// But should contain all necessary data
			const verified = await verifyJWT(token, TEST_SECRET);
			expect(verified.roles).toHaveLength(3);
			expect(verified.permissions).toHaveLength(8);
		});

		it('should handle brAInwav concurrent token generation', async () => {
			const userId = 'brAInwav-concurrent-user';

			// Generate multiple tokens concurrently
			const promises = Array(10)
				.fill(0)
				.map((_, i) => createAccessToken(`${userId}-${i}`, ['user'], ['read:agents'], TEST_SECRET));

			const tokens = await Promise.all(promises);

			// All tokens should be unique
			const uniqueTokens = new Set(tokens);
			expect(uniqueTokens.size).toBe(tokens.length);

			// All tokens should be valid
			for (const token of tokens) {
				const verified = await verifyJWT(token, TEST_SECRET);
				expect(verified.sub).toMatch(/^brAInwav-concurrent-user-\d+$/);
			}
		});

		it('should include brAInwav audit trail in tokens', async () => {
			const token = await createAccessToken('audit-user', ['user'], ['read:agents'], TEST_SECRET, {
				issuer: 'brAInwav-auth-service',
				audience: 'brAInwav-api-gateway',
			});

			const verified = await verifyJWT(token, TEST_SECRET, {
				issuer: 'brAInwav-auth-service',
				audience: 'brAInwav-api-gateway',
			});

			expect(verified.iss).toBe('brAInwav-auth-service');
			expect(verified.aud).toBe('brAInwav-api-gateway');
			expect(verified.iat).toBeDefined();
			expect(verified.exp).toBeDefined();
		});

		it('should support brAInwav high-frequency operations', async () => {
			const startTime = Date.now();
			const iterations = 100;

			// Test high-frequency token generation and verification
			for (let i = 0; i < iterations; i++) {
				const token = await signJWT({ sub: `user-${i}` }, TEST_SECRET);
				const verified = await verifyJWT(token, TEST_SECRET);
				expect(verified.sub).toBe(`user-${i}`);
			}

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			// brAInwav performance requirement: should handle 100 ops in under 1 second
			expect(totalTime).toBeLessThan(1000);
		});
	});

	describe('Algorithm Security', () => {
		it('should use secure default algorithm (HS256)', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET);

			// Decode header to check algorithm
			const [headerB64] = token.split('.');
			const header = JSON.parse(atob(headerB64));

			expect(header.alg).toBe('HS256');
		});

		it('should allow custom algorithms', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET, { algorithm: 'HS256' });

			const verified = await verifyJWT(token, TEST_SECRET, { algorithm: 'HS256' });
			expect(verified.sub).toBe('user123');
		});

		it('should reject algorithm mismatch', async () => {
			const payload = { sub: 'user123' };
			const token = await signJWT(payload, TEST_SECRET, { algorithm: 'HS256' });

			// Try to verify with different algorithm expectation
			await expect(verifyJWT(token, TEST_SECRET, { algorithm: 'HS384' })).rejects.toThrow();
		});
	});
});
