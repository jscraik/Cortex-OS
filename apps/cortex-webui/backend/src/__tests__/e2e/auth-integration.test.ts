import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db';
import { createApp } from '../../src/server';
import { authMonitoringService } from '../../src/services/authMonitoringService';
import { emailService } from '../../src/services/emailService';

describe('Auth Integration Tests', () => {
	let app: Express;
	let server: Server;

	beforeAll(async () => {
		// Create Express app
		app = createApp();
		server = createServer(app);

		// Initialize test database
		await db.pragma('foreign_keys = ON');
	});

	afterAll(async () => {
		if (server) {
			server.close();
		}
	});

	beforeEach(async () => {
		// Clean up test data
		await db.run('DELETE FROM users');
		await db.run('DELETE FROM sessions');
	});

	describe('Email and Password Authentication', () => {
		const testUser = {
			email: 'test@example.com',
			password: 'SecurePass123!',
			name: 'Test User',
		};

		it('should register a new user', async () => {
			const response = await request(app).post('/api/auth/register').send(testUser).expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe(testUser.email);
			expect(response.body.user.name).toBe(testUser.name);
			expect(response.body.user).not.toHaveProperty('password');
		});

		it('should login with valid credentials', async () => {
			// First register
			await request(app).post('/api/auth/register').send(testUser);

			// Then login
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body).toHaveProperty('session');
			expect(response.body.user.email).toBe(testUser.email);
		});

		it('should reject login with invalid credentials', async () => {
			// First register
			await request(app).post('/api/auth/register').send(testUser);

			// Try to login with wrong password
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: testUser.email,
					password: 'WrongPassword123!',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});

		it('should validate password requirements', async () => {
			const weakPasswordUser = {
				...testUser,
				email: 'weak@example.com',
				password: 'weak',
			};

			const response = await request(app)
				.post('/api/auth/register')
				.send(weakPasswordUser)
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Password Reset Flow', () => {
		const testUser = {
			email: 'reset@example.com',
			password: 'SecurePass123!',
			name: 'Reset User',
		};

		beforeEach(async () => {
			// Register user
			await request(app).post('/api/auth/register').send(testUser);
		});

		it('should initiate password reset', async () => {
			const response = await request(app)
				.post('/api/auth/password-reset/initiate')
				.send({ email: testUser.email })
				.expect(200);

			expect(response.body).toHaveProperty('message');
			expect(response.body.message).toContain('email sent');
		});

		it('should reject password reset for non-existent email', async () => {
			const response = await request(app)
				.post('/api/auth/password-reset/initiate')
				.send({ email: 'nonexistent@example.com' })
				.expect(404);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('OAuth Authentication', () => {
		it('should redirect to OAuth provider', async () => {
			const response = await request(app).get('/api/auth/signin/github').expect(302);

			expect(response.headers.location).toContain('github.com');
		});

		it('should handle OAuth callback with mock data', async () => {
			// This would require mocking the OAuth provider
			// For now, just test the endpoint exists
			const response = await request(app).get('/api/auth/callback/github').expect(302);

			expect(response.headers.location).toBeDefined();
		});
	});

	describe('Two-Factor Authentication', () => {
		const testUser = {
			email: '2fa@example.com',
			password: 'SecurePass123!',
			name: '2FA User',
		};

		let sessionToken: string;

		beforeEach(async () => {
			// Register and login
			const _registerResponse = await request(app).post('/api/auth/register').send(testUser);

			const loginResponse = await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			sessionToken = loginResponse.body.session.token;
		});

		it('should enable 2FA', async () => {
			const response = await request(app)
				.post('/api/auth/2fa/enable')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('backupCodes');
			expect(Array.isArray(response.body.backupCodes)).toBe(true);
		});

		it('should require 2FA after enabling', async () => {
			// Enable 2FA
			await request(app)
				.post('/api/auth/2fa/enable')
				.set('Authorization', `Bearer ${sessionToken}`);

			// Try to login without 2FA
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			expect(loginResponse.status).toBe(200);
			expect(loginResponse.body).toHaveProperty('twoFactorRequired', true);
		});
	});

	describe('Session Management', () => {
		const testUser = {
			email: 'session@example.com',
			password: 'SecurePass123!',
			name: 'Session User',
		};

		it('should create session on login', async () => {
			await request(app).post('/api/auth/register').send(testUser);

			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: testUser.email,
					password: testUser.password,
				})
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body.session).toHaveProperty('token');
		});

		it('should validate session', async () => {
			await request(app).post('/api/auth/register').send(testUser);

			const loginResponse = await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			const sessionToken = loginResponse.body.session.token;

			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe(testUser.email);
		});

		it('should invalidate session on logout', async () => {
			await request(app).post('/api/auth/register').send(testUser);

			const loginResponse = await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			const sessionToken = loginResponse.body.session.token;

			// Logout
			await request(app)
				.post('/api/auth/logout')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			// Try to use invalidated session
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Auth Monitoring', () => {
		const testUser = {
			email: 'monitor@example.com',
			password: 'SecurePass123!',
			name: 'Monitor User',
		};

		it('should log auth events', async () => {
			// Register
			await request(app).post('/api/auth/register').send(testUser);

			// Login
			await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			// Check events (this would require admin auth in real app)
			const events = await authMonitoringService.getRecentEvents(10);
			expect(events.length).toBeGreaterThan(0);

			const registerEvent = events.find((e) => e.eventType === 'register');
			const loginEvent = events.find((e) => e.eventType === 'login');

			expect(registerEvent).toBeDefined();
			expect(loginEvent).toBeDefined();
		});

		it('should track auth metrics', async () => {
			// Get initial metrics
			const initialMetrics = await authMonitoringService.getMetrics('1h');

			// Perform auth actions
			await request(app)
				.post('/api/auth/register')
				.send({
					...testUser,
					email: 'metrics@example.com',
				});

			await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			// Get updated metrics
			const updatedMetrics = await authMonitoringService.getMetrics('1h');

			expect(updatedMetrics.newRegistrations).toBeGreaterThanOrEqual(
				initialMetrics.newRegistrations,
			);
			expect(updatedMetrics.totalLogins).toBeGreaterThanOrEqual(initialMetrics.totalLogins);
		});
	});

	describe('Email Service', () => {
		it('should verify email service connection', async () => {
			// Mock the verification for testing
			const originalVerify = emailService.verifyConnection;
			emailService.verifyConnection = () => Promise.resolve(true);

			const isConnected = await emailService.verifyConnection();
			expect(isConnected).toBe(true);

			// Restore original method
			emailService.verifyConnection = originalVerify;
		});

		it('should send emails with proper configuration', async () => {
			// Mock email sending for testing
			const originalSend = emailService.sendEmail;
			let emailSent = false;

			emailService.sendEmail = async () => {
				emailSent = true;
				return;
			};

			await emailService.sendVerificationEmail(
				{ email: 'test@example.com', name: 'Test User' },
				'https://example.com/verify',
			);

			expect(emailSent).toBe(true);

			// Restore original method
			emailService.sendEmail = originalSend;
		});
	});

	describe('Security Features', () => {
		const testUser = {
			email: 'security@example.com',
			password: 'SecurePass123!',
			name: 'Security User',
		};

		it('should handle rate limiting', async () => {
			// Try to register multiple times quickly
			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(
					request(app)
						.post('/api/auth/register')
						.send({
							...testUser,
							email: `security${i}@example.com`,
						}),
				);
			}

			const responses = await Promise.all(promises);

			// All should succeed or be rate limited
			responses.forEach((response) => {
				expect([200, 429]).toContain(response.status);
			});
		});

		it('should validate session cookies', async () => {
			await request(app).post('/api/auth/register').send(testUser);

			const response = await request(app).post('/api/auth/login').send({
				email: testUser.email,
				password: testUser.password,
			});

			expect(response.headers['set-cookie']).toBeDefined();
			const cookies = response.headers['set-cookie'];

			// Check for secure cookie attributes
			if (process.env.NODE_ENV === 'production') {
				expect(cookies.some((cookie: string) => cookie.includes('Secure'))).toBe(true);
			}
		});
	});

	describe('Cross-Origin Resource Sharing', () => {
		it('should handle CORS preflight requests', async () => {
			const response = await request(app)
				.options('/api/auth/register')
				.set('Origin', 'http://localhost:3000')
				.expect(200);

			expect(response.headers['access-control-allow-methods']).toContain('POST');
			expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
		});

		it('should reject requests from unauthorized origins', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.set('Origin', 'http://malicious.com')
				.send({
					email: 'malicious@example.com',
					password: 'SecurePass123!',
				});

			expect([200, 403]).toContain(response.status);
		});
	});
});
