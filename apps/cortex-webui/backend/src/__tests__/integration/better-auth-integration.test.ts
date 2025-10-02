import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server';

// Mock external dependencies
vi.mock('../../services/emailService', () => ({
	emailService: {
		sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
		sendMagicLink: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('../../services/a2a-integration', () => ({
	webUIBusIntegration: {
		publishUserEvent: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('../../services/authMonitoringService', () => ({
	authMonitoringService: {
		logEvent: vi.fn().mockResolvedValue(undefined),
	},
}));

describe('Better Auth Integration Tests', () => {
	let app: Express;

	beforeEach(async () => {
		app = createApp();
		// Clear any existing test data
		vi.clearAllMocks();
	});

	afterEach(async () => {
		// Cleanup test data
		try {
			// Clean up any created users if possible
		} catch (error) {
			console.warn('Cleanup error:', error);
		}
	});

	describe('User Registration Flow', () => {
		const validUserData = {
			name: 'brAInwav Test User',
			email: 'test@brainwav.ai',
			password: 'SecureBrainwav123!',
		};

		it('should register a new user successfully with brAInwav branding', async () => {
			const response = await request(app).post('/api/auth/sign-up').send(validUserData).expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', validUserData.email);
			expect(response.body.user).toHaveProperty('name', validUserData.name);
			expect(response.body.user).not.toHaveProperty('password');

			// Verify brAInwav monitoring was called
			const { authMonitoringService } = await import('../../services/authMonitoringService');
			expect(authMonitoringService.logEvent).toHaveBeenCalledWith({
				userId: expect.any(String),
				eventType: 'register',
			});
		});

		it('should enforce email validation for brAInwav users', async () => {
			const invalidUserData = {
				...validUserData,
				email: 'invalid-email',
			};

			const response = await request(app)
				.post('/api/auth/sign-up')
				.send(invalidUserData)
				.expect(400);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav');
		});

		it('should enforce password strength requirements', async () => {
			const weakPasswordData = {
				...validUserData,
				password: '123', // Too weak
			};

			const response = await request(app)
				.post('/api/auth/sign-up')
				.send(weakPasswordData)
				.expect(400);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav');
		});

		it('should prevent duplicate email registrations', async () => {
			// Register first user
			await request(app).post('/api/auth/sign-up').send(validUserData).expect(200);

			// Attempt to register with same email
			const response = await request(app).post('/api/auth/sign-up').send(validUserData).expect(400);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('already exists');
		});
	});

	describe('User Login Flow', () => {
		const userCredentials = {
			email: 'login-test@brainwav.ai',
			password: 'SecureBrainwav123!',
		};

		beforeEach(async () => {
			// Create test user
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Login Test User',
					...userCredentials,
				})
				.expect(200);
		});

		it('should login successfully with valid credentials', async () => {
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send(userCredentials)
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', userCredentials.email);
			expect(response.headers).toHaveProperty('set-cookie');

			// Verify brAInwav monitoring was called
			const { authMonitoringService } = await import('../../services/authMonitoringService');
			expect(authMonitoringService.logEvent).toHaveBeenCalledWith({
				userId: expect.any(String),
				eventType: 'login',
			});
		});

		it('should reject login with invalid email', async () => {
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'nonexistent@brainwav.ai',
					password: userCredentials.password,
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav');
		});

		it('should reject login with invalid password', async () => {
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: userCredentials.email,
					password: 'wrong-password',
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav');
		});

		it('should handle rate limiting for repeated failed attempts', async () => {
			// Attempt multiple failed logins
			for (let i = 0; i < 6; i++) {
				await request(app).post('/api/auth/sign-in').send({
					email: userCredentials.email,
					password: 'wrong-password',
				});
			}

			// Next attempt should be rate limited
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send(userCredentials)
				.expect(429);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('rate limit');
		});
	});

	describe('Session Management', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and login test user
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Session Test User',
					email: 'session-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'session-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should return active session information', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', 'session-test@brainwav.ai');
		});

		it('should return user profile information', async () => {
			const response = await request(app)
				.get('/api/auth/user')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('email', 'session-test@brainwav.ai');
			expect(response.body).toHaveProperty('name', 'Session Test User');
			expect(response.body).not.toHaveProperty('password');
		});

		it('should reject requests without valid session', async () => {
			const response = await request(app).get('/api/auth/session').expect(401);

			expect(response.body).toHaveProperty('error', 'No active session');
		});

		it('should handle logout successfully', async () => {
			const response = await request(app)
				.post('/api/auth/sign-out')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('success');

			// Verify session is invalidated
			await request(app).get('/api/auth/session').set('Cookie', sessionCookie).expect(401);
		});
	});

	describe('Password Reset Flow', () => {
		const testUser = {
			name: 'Password Reset User',
			email: 'password-reset@brainwav.ai',
			password: 'SecureBrainwav123!',
		};

		beforeEach(async () => {
			// Create test user
			await request(app).post('/api/auth/sign-up').send(testUser).expect(200);
		});

		it('should send password reset email for existing user', async () => {
			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: testUser.email,
				})
				.expect(200);

			expect(response.body).toHaveProperty('success', true);
			expect(response.body).toHaveProperty('message', 'Password reset email sent if email exists');
		});

		it('should return success message for non-existing email (security)', async () => {
			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: 'nonexistent@brainwav.ai',
				})
				.expect(200);

			expect(response.body).toHaveProperty('success', true);
			// Same message as for existing emails (security measure)
		});

		it('should handle password reset with valid token', async () => {
			// Request password reset
			await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: testUser.email,
				})
				.expect(200);

			// Note: In a real test, you would need to extract the token from the email
			// For this test, we'll simulate the reset with a mock token
			const response = await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'mock-reset-token',
					newPassword: 'NewSecureBrainwav456!',
				})
				.expect(400); // Will fail with mock token, but tests the endpoint

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Magic Link Authentication', () => {
		const testEmail = 'magic-link-test@brainwav.ai';

		it('should send magic link for valid email', async () => {
			const response = await request(app)
				.post('/api/auth/magic-link')
				.send({
					email: testEmail,
				})
				.expect(200);

			expect(response.body).toHaveProperty('success', true);
			expect(response.body).toHaveProperty('message', 'Magic link sent if email exists');

			// Verify email service was called
			const { emailService } = await import('../../services/emailService');
			expect(emailService.sendMagicLink).toHaveBeenCalledWith(testEmail, expect.any(String));
		});
	});

	describe('OAuth Provider URLs', () => {
		it('should return OAuth URL for GitHub', async () => {
			const response = await request(app).get('/api/auth/oauth/github').expect(200);

			expect(response.body).toHaveProperty('url');
			expect(response.body.url).toContain('github.com');
		});

		it('should return OAuth URL for Google', async () => {
			const response = await request(app).get('/api/auth/oauth/google').expect(200);

			expect(response.body).toHaveProperty('url');
			expect(response.body.url).toContain('google.com');
		});

		it('should return OAuth URL for Discord', async () => {
			const response = await request(app).get('/api/auth/oauth/discord').expect(200);

			expect(response.body).toHaveProperty('url');
			expect(response.body.url).toContain('discord.com');
		});

		it('should handle unsupported OAuth providers', async () => {
			const response = await request(app).get('/api/auth/oauth/unsupported-provider').expect(200);

			// Should still return a URL, as Better Auth handles unknown providers
			expect(response.body).toHaveProperty('url');
		});
	});

	describe('API Key Management', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and login test user
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'API Key User',
					email: 'apikey-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'apikey-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should create API key for authenticated user', async () => {
			const response = await request(app)
				.post('/api/auth/api-keys')
				.set('Cookie', sessionCookie)
				.send({
					name: 'Test API Key',
				})
				.expect(200);

			expect(response.body).toHaveProperty('key');
			expect(response.body.key).toMatch(/^brainwav-/);
		});

		it('should reject API key creation for unauthenticated users', async () => {
			const response = await request(app)
				.post('/api/auth/api-keys')
				.send({
					name: 'Test API Key',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});

		it('should validate API key format', async () => {
			const response = await request(app)
				.post('/api/auth/api-keys/validate')
				.send({
					apiKey: 'brainwav-validkey12345678901234567890',
				})
				.expect(200);

			expect(response.body).toHaveProperty('valid');
		});
	});

	describe('Two-Factor Authentication', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and login test user
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: '2FA User',
					email: '2fa-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: '2fa-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should enable 2FA for authenticated user', async () => {
			const response = await request(app)
				.post('/api/auth/2fa/enable')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('secret');
			expect(response.body).toHaveProperty('qrCode');
		});

		it('should reject 2FA setup for unauthenticated users', async () => {
			const response = await request(app).post('/api/auth/2fa/enable').expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Organization Management', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and login test user
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Organization User',
					email: 'org-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'org-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should list user organizations', async () => {
			const response = await request(app)
				.get('/api/auth/organizations')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});

		it('should reject organization access for unauthenticated users', async () => {
			const response = await request(app).get('/api/auth/organizations').expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Passkey (WebAuthn) Support', () => {
		let sessionCookie: string;

		beforeEach(async () => {
			// Create and login test user
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Passkey User',
					email: 'passkey-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'passkey-test@brainwav.ai',
					password: 'SecureBrainwav123!',
				})
				.expect(200);

			sessionCookie = loginResponse.headers['set-cookie'];
		});

		it('should handle passkey registration request', async () => {
			const response = await request(app)
				.post('/api/auth/passkeys/register')
				.set('Cookie', sessionCookie)
				.send({
					credential: {},
					origin: 'http://localhost:5173',
				})
				.expect(200);

			// Response structure depends on Better Auth implementation
			expect(response.body).toBeDefined();
		});

		it('should reject passkey registration for unauthenticated users', async () => {
			const response = await request(app)
				.post('/api/auth/passkeys/register')
				.send({
					credential: {},
					origin: 'http://localhost:5173',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Security Headers and CORS', () => {
		it('should include security headers in responses', async () => {
			const response = await request(app).get('/api/auth/session').expect(401);

			// Check for basic security headers
			expect(response.headers).toHaveProperty('x-content-type-options');
			expect(response.headers).toHaveProperty('x-frame-options');
		});

		it('should handle CORS preflight requests', async () => {
			const response = await request(app).options('/api/auth/sign-in').expect(200);

			expect(response.headers).toHaveProperty('access-control-allow-methods');
			expect(response.headers).toHaveProperty('access-control-allow-headers');
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed JSON requests gracefully', async () => {
			const response = await request(app)
				.post('/api/auth/sign-in')
				.set('Content-Type', 'application/json')
				.send('invalid-json')
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should handle missing required fields', async () => {
			const response = await request(app).post('/api/auth/sign-in').send({}).expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should include brAInwav branding in error responses', async () => {
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'invalid-email',
					password: '',
				})
				.expect(400);

			// Should contain brAInwav branding somewhere in the response
			const responseStr = JSON.stringify(response.body);
			expect(responseStr).toMatch(/brAInwav/i);
		});
	});
});
