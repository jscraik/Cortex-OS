// Create Express app with Better Auth
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { betterAuthInstance } from '../../test/auth-config.js';
import { createTestUser, testDb } from '../../test/database.js';
import { authTestScenarios } from '../../test/utils.js';

const app = express();
app.use(express.json());
app.use('/api/auth/*', betterAuthInstance.handler);

describe('Authentication Methods', () => {
	let db: any;

	beforeEach(async () => {
		// Setup fresh database for each test
		const { drizzleDb, migrate } = testDb;
		db = drizzleDb;
		await migrate();
	});

	describe('Email & Password Authentication', () => {
		it('should register a new user with email and password', async () => {
			const userData = {
				email: 'newuser@example.com',
				password: 'SecurePass123!',
				name: 'New User',
			};

			const response = await request(app).post('/api/auth/register').send(userData).expect(201);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe(userData.email);
			expect(response.body.user.name).toBe(userData.name);
			expect(response.body.user).not.toHaveProperty('passwordHash');
		});

		it('should login with valid credentials', async () => {
			// Create test user first
			await createTestUser(db, {
				email: 'login@example.com',
				password: 'LoginPass123!',
				name: 'Login User',
			});

			const response = await request(app)
				.post('/api/auth/login')
				.send(authTestScenarios.validLogin)
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body.session).toHaveProperty('token');
			expect(response.body.user.email).toBe('login@example.com');
		});

		it('should reject login with invalid password', async () => {
			await createTestUser(db, {
				email: 'login@example.com',
				password: 'LoginPass123!',
				name: 'Login User',
			});

			const response = await request(app)
				.post('/api/auth/login')
				.send(authTestScenarios.invalidPassword)
				.expect(401);

			expect(response.body.error).toBeDefined();
		});

		it('should reject login for non-existent user', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send(authTestScenarios.nonExistentUser)
				.expect(401);

			expect(response.body.error).toBeDefined();
		});

		it('should validate email format on registration', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'invalid-email',
					password: 'ValidPass123!',
					name: 'Invalid Email User',
				})
				.expect(400);

			expect(response.body.error).toContain('email');
		});

		it('should validate password strength', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'weak@example.com',
					password: 'weak',
					name: 'Weak Password User',
				})
				.expect(400);

			expect(response.body.error).toContain('password');
		});

		it('should prevent duplicate email registration', async () => {
			const userData = {
				email: 'duplicate@example.com',
				password: 'SecurePass123!',
				name: 'Duplicate User',
			};

			// Register first user
			await request(app).post('/api/auth/register').send(userData).expect(201);

			// Try to register with same email
			const response = await request(app).post('/api/auth/register').send(userData).expect(409);

			expect(response.body.error).toContain('already exists');
		});
	});

	describe('Session Management', () => {
		it('should create session on successful login', async () => {
			await createTestUser(db, {
				email: 'session@example.com',
				password: 'SessionPass123!',
				name: 'Session User',
			});

			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'session@example.com',
					password: 'SessionPass123!',
				})
				.expect(200);

			expect(loginResponse.body.session).toBeDefined();
			expect(loginResponse.body.session.token).toBeDefined();
			expect(loginResponse.body.session.expires).toBeDefined();
		});

		it('should validate active session', async () => {
			await createTestUser(db, {
				email: 'validate@example.com',
				password: 'ValidatePass123!',
				name: 'Validate User',
			});

			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'validate@example.com',
				password: 'ValidatePass123!',
			});

			const sessionToken = loginResponse.body.session.token;

			// Access protected route with session
			const protectedResponse = await request(app)
				.get('/api/auth/session')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			expect(protectedResponse.body.session).toBeDefined();
			expect(protectedResponse.body.user.email).toBe('validate@example.com');
		});

		it('should invalidate session on logout', async () => {
			await createTestUser(db, {
				email: 'logout@example.com',
				password: 'LogoutPass123!',
				name: 'Logout User',
			});

			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'logout@example.com',
				password: 'LogoutPass123!',
			});

			const sessionToken = loginResponse.body.session.token;

			// Logout
			await request(app)
				.post('/api/auth/logout')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			// Try to access protected route
			const protectedResponse = await request(app)
				.get('/api/auth/session')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(401);

			expect(protectedResponse.body.error).toContain('invalid');
		});
	});

	describe('OAuth Authentication', () => {
		it('should generate OAuth URL for GitHub', async () => {
			const response = await request(app).get('/api/auth/github').expect(302);

			expect(response.headers.location).toContain('github.com/oauth/authorize');
			expect(response.headers.location).toContain('client_id=test-github-client');
		});

		it('should handle OAuth callback', async () => {
			// Mock the OAuth callback
			vi.spyOn(betterAuthInstance.api, 'handleOAuthCallback').mockResolvedValueOnce({
				user: {
					id: 'github-user-id',
					email: 'github@example.com',
					name: 'GitHub User',
				},
				session: {
					token: 'github-session-token',
					expires: Date.now() + 3600000,
				},
			});

			const response = await request(app)
				.get('/api/auth/github/callback?code=test-code&state=test-state')
				.expect(302);

			expect(response.headers.location).toContain('/dashboard');
		});

		it('should handle OAuth errors', async () => {
			const response = await request(app)
				.get('/api/auth/github/callback?error=access_denied')
				.expect(302);

			expect(response.headers.location).toContain('/auth/login');
			expect(response.headers.location).toContain('error=access_denied');
		});
	});

	describe('Password Reset Flow', () => {
		it('should initiate password reset', async () => {
			await createTestUser(db, {
				email: 'reset@example.com',
				password: 'ResetPass123!',
				name: 'Reset User',
			});

			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'reset@example.com' })
				.expect(200);

			expect(response.body.success).toBe(true);
		});

		it('should not reveal if email exists on password reset', async () => {
			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'nonexistent@example.com' })
				.expect(200);

			expect(response.body.success).toBe(true);
		});
	});

	describe('Security Features', () => {
		it('should enforce rate limiting on login attempts', async () => {
			const loginData = {
				email: 'ratelimit@example.com',
				password: 'WrongPassword!',
			};

			// Make multiple requests to trigger rate limit
			const requests = [];
			for (let i = 0; i < 110; i++) {
				requests.push(request(app).post('/api/auth/login').send(loginData));
			}

			const responses = await Promise.all(requests);
			const rateLimitedResponse = responses[responses.length - 1];

			expect(rateLimitedResponse.status).toBe(429);
		});

		it('should sanitize user data in responses', async () => {
			await createTestUser(db, {
				email: 'sanitize@example.com',
				password: 'SanitizePass123!',
				name: 'Sanitize User',
			});

			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'sanitize@example.com',
					password: 'SanitizePass123!',
				})
				.expect(200);

			expect(response.body.user).not.toHaveProperty('passwordHash');
			expect(response.body.user).not.toHaveProperty('sessions');
		});

		it('should handle CSRF protection', async () => {
			// Test that CSRF protection is enabled
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'csrf@example.com',
					password: 'CSRFPass123!',
				})
				.set('X-CSRF-Token', 'invalid-token')
				.expect(400);

			expect(response.body.error).toContain('CSRF');
		});
	});
});
