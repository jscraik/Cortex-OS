import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auth } from '../../auth';
import { createApp } from '../../server.js';

describe('Authentication API Endpoints', () => {
	let app: any;

	beforeEach(async () => {
		app = createApp();
		// Clear test database
		await auth.api.deleteUser({ userId: 'test-user-id' });
	});

	afterEach(async () => {
		// Cleanup
	});

	describe('POST /api/auth/register', () => {
		it('should register a new user successfully', async () => {
			const userData = {
				name: 'Test User',
				email: 'test@example.com',
				password: 'SecurePassword123!',
			};

			const response = await request(app).post('/api/auth/register').send(userData).expect(201);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', userData.email);
			expect(response.body.user).toHaveProperty('name', userData.name);
			expect(response.body.user).not.toHaveProperty('password');
		});

		it('should return error for duplicate email', async () => {
			const userData = {
				name: 'Test User',
				email: 'test@example.com',
				password: 'SecurePassword123!',
			};

			// Register first user
			await request(app).post('/api/auth/register').send(userData).expect(201);

			// Try to register with same email
			const response = await request(app).post('/api/auth/register').send(userData).expect(409);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('already exists');
		});

		it('should validate required fields', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					// Missing email and password
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should validate password strength', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					email: 'test@example.com',
					password: '123', // Too weak
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should validate email format', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					email: 'invalid-email',
					password: 'SecurePassword123!',
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});
	});

	describe('POST /api/auth/login', () => {
		beforeEach(async () => {
			// Create a test user
			await request(app).post('/api/auth/register').send({
				name: 'Test User',
				email: 'test@example.com',
				password: 'SecurePassword123!',
			});
		});

		it('should login successfully with valid credentials', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'test@example.com',
					password: 'SecurePassword123!',
				})
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', 'test@example.com');
		});

		it('should return error for invalid email', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'nonexistent@example.com',
					password: 'SecurePassword123!',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Invalid email or password');
		});

		it('should return error for invalid password', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'test@example.com',
					password: 'WrongPassword123!',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Invalid email or password');
		});

		it('should rate limit login attempts', async () => {
			// Attempt multiple failed logins
			for (let i = 0; i < 6; i++) {
				await request(app).post('/api/auth/login').send({
					email: 'test@example.com',
					password: 'WrongPassword123!',
				});
			}

			// Next attempt should be rate limited
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'test@example.com',
					password: 'SecurePassword123!',
				})
				.expect(429);

			expect(response.body).toHaveProperty('error', 'Too many attempts');
		});
	});

	describe('GET /api/auth/session', () => {
		it('should return active session when authenticated', async () => {
			// Register and login user
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'test@example.com',
				password: 'SecurePassword123!',
			});

			const sessionCookie = loginResponse.headers['set-cookie'];

			const response = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', 'test@example.com');
		});

		it('should return 401 when not authenticated', async () => {
			const response = await request(app).get('/api/auth/session').expect(401);

			expect(response.body).toHaveProperty('error', 'No active session');
		});
	});

	describe('GET /api/auth/user', () => {
		it('should return user profile when authenticated', async () => {
			// Register and login user
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'test@example.com',
				password: 'SecurePassword123!',
			});

			const sessionCookie = loginResponse.headers['set-cookie'];

			const response = await request(app)
				.get('/api/auth/user')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('email', 'test@example.com');
			expect(response.body).toHaveProperty('name', 'Test User');
			expect(response.body).not.toHaveProperty('password');
		});

		it('should return 401 when not authenticated', async () => {
			const response = await request(app).get('/api/auth/user').expect(401);

			expect(response.body).toHaveProperty('error', 'Not authenticated');
		});
	});

	describe('POST /api/auth/logout', () => {
		it('should logout successfully', async () => {
			// Register and login user
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'test@example.com',
				password: 'SecurePassword123!',
			});

			const sessionCookie = loginResponse.headers['set-cookie'];

			const response = await request(app)
				.post('/api/auth/logout')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('message', 'Logged out successfully');

			// Verify session is invalidated
			await request(app).get('/api/auth/session').set('Cookie', sessionCookie).expect(401);
		});
	});

	describe('POST /api/auth/forgot-password', () => {
		it('should send password reset email for existing user', async () => {
			// Create a user first
			await request(app).post('/api/auth/register').send({
				name: 'Test User',
				email: 'test@example.com',
				password: 'SecurePassword123!',
			});

			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: 'test@example.com',
				})
				.expect(200);

			expect(response.body).toHaveProperty('success', true);
			expect(response.body).toHaveProperty('message', 'Password reset email sent if email exists');
		});

		it('should return success for non-existing email (security)', async () => {
			const response = await request(app)
				.post('/api/auth/forgot-password')
				.send({
					email: 'nonexistent@example.com',
				})
				.expect(200);

			expect(response.body).toHaveProperty('success', true);
			// Same message as for existing emails (security measure)
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

		it('should return error for unsupported provider', async () => {
			const response = await request(app).get('/api/auth/oauth/unsupported-provider').expect(400);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Security Headers', () => {
		it('should include security headers in auth responses', async () => {
			const response = await request(app).get('/api/auth/oauth/github').expect(200);

			expect(response.headers).toHaveProperty('x-content-type-options');
			expect(response.headers).toHaveProperty('x-frame-options');
			expect(response.headers).toHaveProperty('x-xss-protection');
		});

		it('should prevent CSRF attacks', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.set('Content-Type', 'application/json')
				.send({
					email: 'test@example.com',
					password: 'SecurePassword123!',
				});

			// Verify CSRF protection headers
			expect(response.headers).toHaveProperty('x-csrf-token');
		});
	});

	describe('CORS Configuration', () => {
		it('should handle preflight requests correctly', async () => {
			const response = await request(app).options('/api/auth/login').expect(200);

			expect(response.headers).toHaveProperty('access-control-allow-methods');
			expect(response.headers).toHaveProperty('access-control-allow-headers');
			expect(response.headers).toHaveProperty('access-control-allow-origin');
		});

		it('should reject requests from unauthorized origins', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.set('Origin', 'http://malicious-site.com')
				.send({
					email: 'test@example.com',
					password: 'SecurePassword123!',
				})
				.expect(403);

			expect(response.body).toHaveProperty('error', 'Origin not allowed');
		});
	});
});
