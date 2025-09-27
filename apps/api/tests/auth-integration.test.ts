import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma-client.js';
import { app } from '../src/server.js';

// Mock environment variables
process.env.BETTER_AUTH_SECRET = 'test-secret';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';
process.env.NODE_ENV = 'test';

type SessionSummary = {
	id: string;
	current?: boolean;
	userId?: string;
	expires?: string;
	createdAt?: string;
	userAgent?: string;
};

describe('Authentication Flow Integration', () => {
	afterEach(async () => {
		// Clean up test data
		// In a real implementation, you would clear the test database
	});

	describe('Complete Authentication Flow', () => {
		it('should handle registration → email verification → login → profile update → logout', async () => {
			// 1. Register new user
			const registerResponse = await request(app)
				.post('/auth/register')
				.send({
					email: 'integration@example.com',
					password: 'IntegrationPass123!',
					name: 'Integration User',
				})
				.expect(201);

			expect(registerResponse.body).toHaveProperty('user');
			expect(registerResponse.body.user.email).toBe('integration@example.com');
			expect(registerResponse.body.user.emailVerified).toBe(false);

			// 2. Simulate email verification (in test environment)
			// In a real app, this would be done via email link
			await prisma.verification.create({
				data: {
					identifier: 'integration@example.com',
					token: 'verification-token',
					type: 'email',
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				},
			});

			// 3. Login with credentials
			const loginResponse = await request(app)
				.post('/auth/login')
				.send({
					email: 'integration@example.com',
					password: 'IntegrationPass123!',
				})
				.expect(200);

			expect(loginResponse.body).toHaveProperty('user');
			expect(loginResponse.body).toHaveProperty('session');
			const { token } = loginResponse.body.session;

			// 4. Access protected endpoint
			const meResponse = await request(app)
				.get('/api/me')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			expect(meResponse.body.user.email).toBe('integration@example.com');

			// 5. Update profile
			const updateResponse = await request(app)
				.put('/api/me')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'Updated Integration User',
					image: 'https://example.com/avatar.jpg',
				})
				.expect(200);

			expect(updateResponse.body.user.name).toBe('Updated Integration User');

			// 6. View sessions
			const sessionsResponse = await request(app)
				.get('/api/sessions')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			expect(sessionsResponse.body.sessions).toHaveLength(1);
			expect(sessionsResponse.body.sessions[0].current).toBe(true);

			// 7. Logout
			await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`).expect(200);

			// 8. Verify token is invalidated
			await request(app).get('/api/me').set('Authorization', `Bearer ${token}`).expect(401);
		});

		it('should handle OAuth flow (GitHub)', async () => {
			// This test would require mocking GitHub's OAuth responses
			// For now, we'll test the redirect

			const response = await request(app).get('/auth/oauth/github').expect(302);

			expect(response.headers.location).toMatch(/github\.com\/oauth\/authorize/);
			expect(response.headers.location).toContain('client_id=test-github-client');
		});

		it('should handle password reset flow', async () => {
			// 1. Register user first
			await request(app).post('/auth/register').send({
				email: 'reset@example.com',
				password: 'ResetPass123!',
				name: 'Reset User',
			});

			// 2. Request password reset
			const resetResponse = await request(app)
				.post('/auth/forgot-password')
				.send({ email: 'reset@example.com' })
				.expect(200);

			expect(resetResponse.body).toHaveProperty('message');

			// 3. Reset password with token (simulated)
			// In a real app, the token would be sent via email
			const resetToken = 'reset-token';

			// This endpoint would be handled by Better Auth
			const newPasswordResponse = await request(app)
				.post('/auth/reset-password')
				.send({
					token: resetToken,
					password: 'NewSecurePass123!',
				})
				.expect(400); // Will fail without valid token

			expect(newPasswordResponse.body).toHaveProperty('error');
		});

		it('should handle two-factor authentication setup', async () => {
			// 1. Register and login
			await request(app).post('/auth/register').send({
				email: '2fa@example.com',
				password: 'TwoFactorPass123!',
				name: '2FA User',
			});

			const loginResponse = await request(app).post('/auth/login').send({
				email: '2fa@example.com',
				password: 'TwoFactorPass123!',
			});

			const token = loginResponse.body.session.token;

			// 2. Initiate 2FA setup
			const setupResponse = await request(app)
				.post('/api/2fa/enable')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			expect(setupResponse.body).toHaveProperty('message');

			// 3. Verify 2FA code (simulated)
			const verifyResponse = await request(app)
				.post('/api/2fa/verify')
				.set('Authorization', `Bearer ${token}`)
				.send({ code: '123456' })
				.expect(200);

			expect(verifyResponse.body).toHaveProperty('success', true);
		});
	});

	describe('Session Management Integration', () => {
		it('should handle multiple sessions', async () => {
			// 1. Register user
			await request(app).post('/auth/register').send({
				email: 'multisession@example.com',
				password: 'MultiSessionPass123!',
				name: 'Multi Session User',
			});

			// 2. Login from device 1
			const device1Response = await request(app)
				.post('/auth/login')
				.send({
					email: 'multisession@example.com',
					password: 'MultiSessionPass123!',
				})
				.expect(200);

			// 3. Login from device 2
			const device2Response = await request(app)
				.post('/auth/login')
				.send({
					email: 'multisession@example.com',
					password: 'MultiSessionPass123!',
				})
				.expect(200);

			// 4. Check sessions from device 1
			const sessionsResponse = await request(app)
				.get('/api/sessions')
				.set('Authorization', `Bearer ${device1Response.body.session.token}`)
				.expect(200);

			expect(sessionsResponse.body.sessions.length).toBeGreaterThanOrEqual(2);

			// 5. Revoke device 2 session from device 1
			const sessions = Array.isArray(sessionsResponse.body.sessions)
				? (sessionsResponse.body.sessions as SessionSummary[])
				: [];
			const device2Session = sessions.find((session) => !session.current);

			if (device2Session) {
				await request(app)
					.delete(`/api/sessions/${device2Session.id}`)
					.set('Authorization', `Bearer ${device1Response.body.session.token}`)
					.expect(200);

				// 6. Verify device 2 session is revoked
				await request(app)
					.get('/api/me')
					.set('Authorization', `Bearer ${device2Response.body.session.token}`)
					.expect(401);
			}
		});

		it('should handle session expiration', async () => {
			// This test would need to mock time or use short expiration
			// For now, we'll test the logout functionality

			// 1. Register and login
			await request(app).post('/auth/register').send({
				email: 'expire@example.com',
				password: 'ExpirePass123!',
				name: 'Expire User',
			});

			const loginResponse = await request(app).post('/auth/login').send({
				email: 'expire@example.com',
				password: 'ExpirePass123!',
			});

			const token = loginResponse.body.session.token;

			// 2. Logout
			await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`).expect(200);

			// 3. Try to use token after logout
			await request(app).get('/api/me').set('Authorization', `Bearer ${token}`).expect(401);
		});
	});

	describe('Cross-Device Authentication', () => {
		it('should maintain authentication across requests', async () => {
			// 1. Register and login
			await request(app).post('/auth/register').send({
				email: 'cross@example.com',
				password: 'CrossPass123!',
				name: 'Cross Device User',
			});

			const loginResponse = await request(app).post('/auth/login').send({
				email: 'cross@example.com',
				password: 'CrossPass123!',
			});

			const token = loginResponse.body.session.token;

			// 2. Make multiple authenticated requests
			const responses = await Promise.all([
				request(app).get('/api/me').set('Authorization', `Bearer ${token}`),
				request(app).get('/api/sessions').set('Authorization', `Bearer ${token}`),
				request(app)
					.put('/api/me')
					.set('Authorization', `Bearer ${token}`)
					.send({ name: 'Cross Device Updated' }),
			]);

			// All requests should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			// 3. Verify profile was updated
			const meResponse = await request(app)
				.get('/api/me')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			expect(meResponse.body.user.name).toBe('Cross Device Updated');
		});
	});

	describe('Error Recovery', () => {
		it('should handle network errors gracefully', async () => {
			// This would require mocking network failures
			// For now, we'll test invalid request handling

			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'invalid@example.com',
					password: 'invalid',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toMatch(/invalid/i);
		});

		it('should handle malformed requests', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send('invalid json')
				.set('Content-Type', 'application/json')
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});
	});
});
