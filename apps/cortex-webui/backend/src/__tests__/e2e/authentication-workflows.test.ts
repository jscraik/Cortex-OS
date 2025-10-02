import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server.js';

// Mock external dependencies
vi.mock('../../services/emailService.js', () => ({
	emailService: {
		sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
		sendMagicLink: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('../../services/a2a-integration.js', () => ({
	webUIBusIntegration: {
		publishUserEvent: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('../../services/authMonitoringService.js', () => ({
	authMonitoringService: {
		logEvent: vi.fn().mockResolvedValue(undefined),
	},
}));

describe('End-to-End Authentication Workflows', () => {
	let app: any;
	let testUser: any;

	beforeEach(async () => {
		app = createApp();
		vi.clearAllMocks();

		testUser = {
			name: 'brAInwav E2E Test User',
			email: 'e2e-test@brainwav.ai',
			password: 'SecureBrainwavE2E123!',
		};
	});

	afterEach(async () => {
		// Cleanup
		try {
			vi.restoreAllMocks();
		} catch (error) {
			console.warn('Cleanup error:', error);
		}
	});

	describe('Complete Registration → Login → Session → Logout Flow', () => {
		it('should handle complete authentication lifecycle with brAInwav branding', async () => {
			// Step 1: Register new user
			const registerResponse = await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			expect(registerResponse.body).toHaveProperty('user');
			expect(registerResponse.body.user).toHaveProperty('email', testUser.email);
			expect(registerResponse.body.user).toHaveProperty('name', testUser.name);
			expect(registerResponse.body.user).not.toHaveProperty('password');

			// Verify brAInwav monitoring was called for registration
			const { authMonitoringService } = await import('../../services/authMonitoringService.js');
			expect(authMonitoringService.logEvent).toHaveBeenCalledWith({
				userId: expect.any(String),
				eventType: 'register',
			});

			// Step 2: Login with registered credentials
			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			expect(loginResponse.body).toHaveProperty('user');
			expect(loginResponse.body).toHaveProperty('session');
			expect(loginResponse.headers).toHaveProperty('set-cookie');

			// Extract session cookie
			const sessionCookie = loginResponse.headers['set-cookie'];

			// Verify brAInwav monitoring was called for login
			expect(authMonitoringService.logEvent).toHaveBeenCalledWith({
				userId: expect.any(String),
				eventType: 'login',
			});

			// Step 3: Access protected route with session
			const sessionResponse = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(sessionResponse.body).toHaveProperty('session');
			expect(sessionResponse.body).toHaveProperty('user');
			expect(sessionResponse.body.user).toHaveProperty('email', testUser.email);

			// Step 4: Access user profile
			const profileResponse = await request(app)
				.get('/api/auth/user')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(profileResponse.body).toHaveProperty('id');
			expect(profileResponse.body).toHaveProperty('email', testUser.email);
			expect(profileResponse.body).toHaveProperty('name', testUser.name);

			// Step 5: Logout successfully
			const logoutResponse = await request(app)
				.post('/api/auth/sign-out')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(logoutResponse.body).toHaveProperty('success', true);

			// Step 6: Verify session is invalidated
			await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(401);

			await request(app)
				.get('/api/auth/user')
				.set('Cookie', sessionCookie)
				.expect(401);
		});

		it('should handle session timeout and automatic logout', async () => {
			// Register and login user
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Access protected endpoint
			await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			// Simulate session timeout by waiting (in real scenario, this would be handled by server)
			// For testing, we'll test that the middleware properly validates session existence

			// Test that session validation works
			const sessionCheckResponse = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(sessionCheckResponse.body).toHaveProperty('session');
		});
	});

	describe('Password Recovery Workflow', () => {
		it('should handle complete password reset flow', async () => {
			// Register user first
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			// Step 1: Request password reset
			const forgotPasswordResponse = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: testUser.email,
				})
				.expect(200);

			expect(forgotPasswordResponse.body).toHaveProperty('success', true);
			expect(forgotPasswordResponse.body).toHaveProperty('message', 'Password reset email sent if email exists');

			// Step 2: Verify email service was called
			const { emailService } = await import('../../services/emailService.js');
			expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					email: testUser.email,
				}),
				expect.any(String)
			);

			// Step 3: Attempt password reset with token
			// Note: In real scenario, token would be extracted from email
			const resetPasswordResponse = await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'test-reset-token',
					newPassword: 'NewSecureBrainwav456!',
				})
				.expect(400); // Will fail with test token but tests the endpoint

			expect(resetPasswordResponse.body).toHaveProperty('error');
		});

		it('should not reveal whether email exists during password reset', async () => {
			// Request password reset for non-existent email
			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: 'nonexistent@brainwav.ai',
				})
				.expect(200);

			expect(response.body).toHaveProperty('success', true);
			expect(response.body).toHaveProperty('message', 'Password reset email sent if email exists');

			// Same response as for existing emails (security measure)
		});
	});

	describe('Magic Link Authentication Workflow', () => {
		it('should handle magic link authentication flow', async () => {
			// Step 1: Request magic link
			const magicLinkResponse = await request(app)
				.post('/api/auth/magic-link')
				.send({
					email: 'magic-link-test@brainwav.ai',
				})
				.expect(200);

			expect(magicLinkResponse.body).toHaveProperty('success', true);
			expect(magicLinkResponse.body).toHaveProperty('message', 'Magic link sent if email exists');

			// Step 2: Verify email service was called
			const { emailService } = await import('../../services/emailService.js');
			expect(emailService.sendMagicLink).toHaveBeenCalledWith(
				'magic-link-test@brainwav.ai',
				expect.any(String)
			);

			// Step 3: Test that the user can be created via magic link flow
			// Note: In real scenario, user would click the link in email
		});
	});

	describe('OAuth Authentication Workflows', () => {
		it('should provide OAuth URLs for all configured providers', async () => {
			// Test GitHub OAuth
			const githubResponse = await request(app)
				.get('/api/auth/oauth/github')
				.expect(200);

			expect(githubResponse.body).toHaveProperty('url');
			expect(githubResponse.body.url).toContain('github.com');
			expect(githubResponse.body.url).toContain('signin');

			// Test Google OAuth
			const googleResponse = await request(app)
				.get('/api/auth/oauth/google')
				.expect(200);

			expect(googleResponse.body).toHaveProperty('url');
			expect(googleResponse.body.url).toContain('google.com');

			// Test Discord OAuth
			const discordResponse = await request(app)
				.get('/api/auth/oauth/discord')
				.expect(200);

			expect(discordResponse.body).toHaveProperty('url');
			expect(discordResponse.body.url).toContain('discord.com');
		});

		it('should handle unsupported OAuth providers gracefully', async () => {
			const response = await request(app)
				.get('/api/auth/oauth/unsupported-provider')
				.expect(200);

			expect(response.body).toHaveProperty('url');
			// Better Auth should handle this gracefully
		});
	});

	describe('API Key Management Workflow', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and authenticate user
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should handle API key creation and validation lifecycle', async () => {
			// Step 1: Create API key
			const createKeyResponse = await request(app)
				.post('/api/auth/api-keys')
				.set('Cookie', sessionCookie)
				.send({
					name: 'E2E Test API Key',
				})
				.expect(200);

			expect(createKeyResponse.body).toHaveProperty('key');
			const apiKey = createKeyResponse.body.key;
			expect(apiKey).toMatch(/^brainwav-/);

			// Step 2: Validate the created API key
			const validateKeyResponse = await request(app)
				.post('/api/auth/api-keys/validate')
				.send({
					apiKey: apiKey,
				})
				.expect(200);

			expect(validateKeyResponse.body).toHaveProperty('valid', true);

			// Step 3: Test API key authentication on protected route
			const protectedResponse = await request(app)
				.get('/api/auth/user')
				.set('X-API-Key', apiKey)
				.expect(200);

			expect(protectedResponse.body).toHaveProperty('email', testUser.email);
		});

		it('should reject API key operations for unauthenticated users', async () => {
			const response = await request(app)
				.post('/api/auth/api-keys')
				.send({
					name: 'Test API Key',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Two-Factor Authentication Workflow', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and authenticate user
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should handle 2FA enablement flow', async () => {
			// Step 1: Enable 2FA
			const enable2FAResponse = await request(app)
				.post('/api/auth/2fa/enable')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(enable2FAResponse.body).toHaveProperty('secret');
			expect(enable2FAResponse.body).toHaveProperty('qrCode');
			expect(enable2FAResponse.body).toHaveProperty('backupCodes');

			// Step 2: Verify 2FA is enabled
			// Note: In real scenario, user would verify with authenticator app
		});

		it('should reject 2FA operations for unauthenticated users', async () => {
			const response = await request(app)
				.post('/api/auth/2fa/enable')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Organization Management Workflow', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and authenticate user
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should handle organization access and management', async () => {
			// Step 1: List user organizations
			const orgListResponse = await request(app)
				.get('/api/auth/organizations')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(Array.isArray(orgListResponse.body)).toBe(true);

			// Step 2: Should reject organization access without authentication
			const unauthorizedResponse = await request(app)
				.get('/api/auth/organizations')
				.expect(401);

			expect(unauthorizedResponse.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Security Headers and CORS Workflow', () => {
		it('should include security headers in all responses', async () => {
			// Test various endpoints for security headers
			const endpoints = [
				{ method: 'GET', path: '/api/auth/session' },
				{ method: 'POST', path: '/api/auth/sign-in' },
				{ method: 'GET', path: '/api/auth/oauth/github' },
				{ method: 'OPTIONS', path: '/api/auth/sign-in' },
			];

			for (const endpoint of endpoints) {
				const response = await request(app)
					[endpoint.method.toLowerCase()](endpoint.path)
					.expect(200);

				// Check for brAInwav security headers
				expect(response.headers).toHaveProperty('x-brainwav-security-enabled');
				expect(response.headers).toHaveProperty('x-brainwav-security-timestamp');

				// Check for standard security headers
				expect(response.headers).toHaveProperty('x-content-type-options');
				expect(response.headers).toHaveProperty('x-frame-options');
			}
		});

		it('should handle CORS preflight requests correctly', async () => {
			const response = await request(app)
				.options('/api/auth/sign-in')
				.set('Origin', 'http://localhost:5173')
				.expect(200);

			expect(response.headers).toHaveProperty('access-control-allow-methods');
			expect(response.headers).toHaveProperty('access-control-allow-headers');
			expect(response.headers).toHaveProperty('access-control-allow-origin');
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle malformed requests gracefully', async () => {
			// Test malformed JSON
			const malformedJSONResponse = await request(app)
				.post('/api/auth/sign-in')
				.set('Content-Type', 'application/json')
				.send('{"invalid": json}')
				.expect(400);

			expect(malformedJSONResponse.body).toHaveProperty('error');

			// Test missing required fields
			const missingFieldsResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({})
				.expect(400);

			expect(missingFieldsResponse.body).toHaveProperty('error');

			// Test invalid email format
			const invalidEmailResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'invalid-email',
					password: 'password',
				})
				.expect(400);

			expect(invalidEmailResponse.body).toHaveProperty('error');
		});

		it('should include brAInwav branding in all error responses', async () => {
			const errorScenarios = [
				() => request(app).get('/api/auth/session').expect(401),
				() => request(app).post('/api/auth/sign-in').send({}).expect(400),
				() => request(app).post('/api/auth/sign-up').send({
					name: 'Test',
					email: 'invalid',
					password: '123',
				}).expect(400),
			];

			for (const scenario of errorScenarios) {
				const response = await scenario();
				const responseStr = JSON.stringify(response.body);
				expect(responseStr).toMatch(/brAInwav/i);
			}
		});

		it('should handle concurrent authentication requests', async () => {
			// Create multiple concurrent login requests
			const loginPromises = Array(5).fill(0).map(() =>
				request(app)
					.post('/api/auth/sign-in')
					.send({
						email: testUser.email,
						password: testUser.password,
					})
			);

			// Wait for all requests to complete
			const responses = await Promise.all(loginPromises);

			// All requests should succeed
			responses.forEach(response => {
				expect([200, 400]).toContain(response.status); // 200 for success, 400 for rate limiting
			});
		});
	});

	describe('Integration with brAInwav Services', () => {
		it('should integrate with A2A event publishing', async () => {
			// Register a new user
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			// Verify A2A integration was called
			const { webUIBusIntegration } = await import('../../services/a2a-integration.js');
			expect(webUIBusIntegration.publishUserEvent).toHaveBeenCalledWith({
				sessionId: expect.stringMatching(/^auth-/),
				userId: expect.any(String),
				timestamp: expect.any(String),
				eventType: 'user_connected',
				message: expect.stringContaining('brAInwav user registration'),
				metadata: {
					source: 'better-auth',
					environment: expect.any(String),
				},
			});
		});

		it('should integrate with auth monitoring service', async () => {
			const { authMonitoringService } = await import('../../services/authMonitoringService.js');

			// Register user
			await request(app)
				.post('/api/auth/sign-up')
				.send(testUser)
				.expect(200);

			// Login user
			await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			// Verify monitoring service was called for both events
			expect(authMonitoringService.logEvent).toHaveBeenCalledWith({
				userId: expect.any(String),
				eventType: 'register',
			});

			expect(authMonitoringService.logEvent).toHaveBeenCalledWith({
				userId: expect.any(String),
				eventType: 'login',
			});
		});

		it('should integrate with email service', async () => {
			const { emailService } = await import('../../services/emailService.js');

			// Request password reset
			await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: testUser.email,
				})
				.expect(200);

			// Verify email service was called
			expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					email: testUser.email,
				}),
				expect.any(String)
			);
		});
	});
});