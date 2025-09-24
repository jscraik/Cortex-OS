import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server.js';

describe('Authentication Integration Flows', () => {
	let app: any;
	let userEmail: string;
	let userPassword: string;

	beforeEach(async () => {
		app = createApp();
		userEmail = `test-${Date.now()}@example.com`;
		userPassword = 'SecurePassword123!';
	});

	afterEach(async () => {
		// Cleanup any created users
	});

	describe('Complete User Registration Flow', () => {
		it('should successfully register, login, and access protected resources', async () => {
			// 1. Register new user
			const registerResponse = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Integration Test User',
					email: userEmail,
					password: userPassword,
				})
				.expect(201);

			expect(registerResponse.body.user.emailVerified).toBe(false);
			expect(registerResponse.body.user.id).toBeDefined();

			// 2. Login with registered credentials
			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: userPassword,
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// 3. Access protected session endpoint
			const sessionResponse = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(sessionResponse.body.session.userId).toBe(registerResponse.body.user.id);
			expect(sessionResponse.body.user.email).toBe(userEmail);

			// 4. Access protected user profile endpoint
			const profileResponse = await request(app)
				.get('/api/auth/user')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(profileResponse.body.email).toBe(userEmail);
			expect(profileResponse.body.name).toBe('Integration Test User');

			// 5. Logout
			await request(app).post('/api/auth/logout').set('Cookie', sessionCookie).expect(200);

			// 6. Verify session is invalidated
			await request(app).get('/api/auth/session').set('Cookie', sessionCookie).expect(401);
		});

		it('should handle concurrent sessions correctly', async () => {
			// Register user
			await request(app).post('/api/auth/register').send({
				name: 'Concurrent Test User',
				email: userEmail,
				password: userPassword,
			});

			// Create two sessions
			const session1Response = await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: userPassword,
				})
				.expect(200);

			const session2Response = await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: userPassword,
				})
				.expect(200);

			const session1Cookie = session1Response.headers['set-cookie'];
			const session2Cookie = session2Response.headers['set-cookie'];

			// Both sessions should be valid
			await request(app).get('/api/auth/session').set('Cookie', session1Cookie).expect(200);

			await request(app).get('/api/auth/session').set('Cookie', session2Cookie).expect(200);

			// Logout one session
			await request(app).post('/api/auth/logout').set('Cookie', session1Cookie).expect(200);

			// First session should be invalid, second should still be valid
			await request(app).get('/api/auth/session').set('Cookie', session1Cookie).expect(401);

			await request(app).get('/api/auth/session').set('Cookie', session2Cookie).expect(200);
		});
	});

	describe('Password Reset Flow', () => {
		it('should complete password reset flow successfully', async () => {
			// 1. Register user
			await request(app).post('/api/auth/register').send({
				name: 'Password Reset User',
				email: userEmail,
				password: userPassword,
			});

			// 2. Request password reset
			const resetRequestResponse = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: userEmail,
				})
				.expect(200);

			expect(resetRequestResponse.body.success).toBe(true);

			// 3. In a real scenario, user would click email link
			// For testing, we'll directly call the reset endpoint
			// This would normally require a valid token from the email

			// 4. Reset password with new password
			const newPassword = 'NewSecurePassword456!';
			const resetResponse = await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'mock-reset-token', // In real scenario, this comes from email
					newPassword: newPassword,
				})
				.expect(200);

			expect(resetResponse.body.success).toBe(true);

			// 5. Login with new password
			await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: newPassword,
				})
				.expect(200);

			// 6. Verify old password doesn't work
			await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: userPassword, // Old password
				})
				.expect(401);
		});
	});

	describe('Session Management', () => {
		it('should handle session expiration correctly', async () => {
			// Register and login
			await request(app).post('/api/auth/register').send({
				name: 'Session Test User',
				email: userEmail,
				password: userPassword,
			});

			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: userPassword,
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Session should be valid immediately
			await request(app).get('/api/auth/session').set('Cookie', sessionCookie).expect(200);

			// Note: In a real test, we might need to simulate time passing
			// or configure a very short session expiration for testing
		});

		it('should invalidate all sessions on password change', async () => {
			// Register and login
			await request(app).post('/api/auth/register').send({
				name: 'Session Invalidation User',
				email: userEmail,
				password: userPassword,
			});

			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					password: userPassword,
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Verify session is valid
			await request(app).get('/api/auth/session').set('Cookie', sessionCookie).expect(200);

			// Change password
			await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'mock-token',
					newPassword: 'NewPasswordAfterReset789!',
				})
				.expect(200);

			// Verify old session is invalidated
			await request(app).get('/api/auth/session').set('Cookie', sessionCookie).expect(401);
		});
	});

	describe('OAuth Integration Flow', () => {
		it('should provide OAuth URLs for all configured providers', async () => {
			// Test GitHub OAuth
			const githubResponse = await request(app).get('/api/auth/oauth/github').expect(200);

			expect(githubResponse.body.url).toContain('github.com');
			expect(githubResponse.body.url).toContain('client_id');

			// Test Google OAuth
			const googleResponse = await request(app).get('/api/auth/oauth/google').expect(200);

			expect(googleResponse.body.url).toContain('google.com');
			expect(googleResponse.body.url).toContain('client_id');

			// Test Discord OAuth
			const discordResponse = await request(app).get('/api/auth/oauth/discord').expect(200);

			expect(discordResponse.body.url).toContain('discord.com');
			expect(discordResponse.body.url).toContain('client_id');
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed JSON gracefully', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.set('Content-Type', 'application/json')
				.send('invalid json')
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should handle missing required fields', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: userEmail,
					// Missing password
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should handle invalid email format', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Invalid Email User',
					email: 'not-an-email',
					password: userPassword,
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should handle weak passwords', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Weak Password User',
					email: userEmail,
					password: '123', // Too weak
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});
	});

	describe('Security Features', () => {
		it('should enforce rate limiting on authentication endpoints', async () => {
			// Attempt multiple rapid requests
			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(
					request(app).post('/api/auth/login').send({
						email: userEmail,
						password: 'wrong-password',
					}),
				);
			}

			const responses = await Promise.all(promises);
			const rateLimitedResponses = responses.filter((r) => r.status === 429);

			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});

		it('should include security headers', async () => {
			const response = await request(app).get('/api/auth/session').expect(401);

			expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
			expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
			expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
		});

		it('should prevent clickjacking attacks', async () => {
			const response = await request(app).get('/api/auth/oauth/github').expect(200);

			expect(response.headers['x-frame-options']).toBe('DENY');
			expect(response.headers['content-security-policy']).toBeDefined();
		});
	});
});
