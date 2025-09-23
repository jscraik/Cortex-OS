import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseAdapter } from '../src/auth/database-adapter.js';
import { app } from '../src/server.js';

// Mock environment variables
process.env.BETTER_AUTH_SECRET = 'test-secret';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';
process.env.GITHUB_CLIENT_ID = 'test-github-client';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';

describe('API Authentication', () => {
	let dbAdapter: DatabaseAdapter;

	beforeEach(() => {
		dbAdapter = new DatabaseAdapter();
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clean up database
	});

	describe('POST /auth/register', () => {
		it('should register a new user with valid data', async () => {
			const userData = {
				email: 'test@example.com',
				password: 'SecurePass123!',
				name: 'Test User',
			};

			const response = await request(app).post('/auth/register').send(userData).expect(201);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe(userData.email);
			expect(response.body.user.name).toBe(userData.name);
			expect(response.body.user).not.toHaveProperty('password');
		});

		it('should reject registration with invalid email', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'invalid-email',
					password: 'SecurePass123!',
					name: 'Test User',
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should reject registration with weak password', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'test@example.com',
					password: 'weak',
					name: 'Test User',
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should reject duplicate email registration', async () => {
			// First registration
			await request(app)
				.post('/auth/register')
				.send({
					email: 'duplicate@example.com',
					password: 'SecurePass123!',
					name: 'Test User',
				})
				.expect(201);

			// Second registration with same email
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'duplicate@example.com',
					password: 'SecurePass123!',
					name: 'Test User',
				})
				.expect(409);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('POST /auth/login', () => {
		beforeEach(async () => {
			// Register a user first
			await request(app).post('/auth/register').send({
				email: 'login@example.com',
				password: 'LoginPass123!',
				name: 'Login User',
			});
		});

		it('should login with valid credentials', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'login@example.com',
					password: 'LoginPass123!',
				})
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body).toHaveProperty('session');
			expect(response.body.user.email).toBe('login@example.com');
		});

		it('should reject login with wrong password', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'login@example.com',
					password: 'wrong-password',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});

		it('should reject login with non-existent email', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					email: 'nonexistent@example.com',
					password: 'LoginPass123!',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('GET /api/me', () => {
		let authToken: string;

		beforeEach(async () => {
			// Register and login to get token
			await request(app).post('/auth/register').send({
				email: 'me@example.com',
				password: 'MePass123!',
				name: 'Me User',
			});

			const loginResponse = await request(app).post('/auth/login').send({
				email: 'me@example.com',
				password: 'MePass123!',
			});

			authToken = loginResponse.body.session.token;
		});

		it('should return user profile with valid token', async () => {
			const response = await request(app)
				.get('/api/me')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user.email).toBe('me@example.com');
			expect(response.body.user.name).toBe('Me User');
		});

		it('should reject request without token', async () => {
			const response = await request(app).get('/api/me').expect(401);

			expect(response.body).toHaveProperty('error');
		});

		it('should reject request with invalid token', async () => {
			const response = await request(app)
				.get('/api/me')
				.set('Authorization', 'Bearer invalid-token')
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});

		it('should reject request with expired token', async () => {
			const expiredToken = jwt.sign(
				{ user: { id: 'test' }, session: { id: 'test' } },
				process.env.BETTER_AUTH_SECRET!,
				{ expiresIn: '-1h' },
			);

			const response = await request(app)
				.get('/api/me')
				.set('Authorization', `Bearer ${expiredToken}`)
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('PUT /api/me', () => {
		let authToken: string;

		beforeEach(async () => {
			// Register and login to get token
			await request(app).post('/auth/register').send({
				email: 'update@example.com',
				password: 'UpdatePass123!',
				name: 'Update User',
			});

			const loginResponse = await request(app).post('/auth/login').send({
				email: 'update@example.com',
				password: 'UpdatePass123!',
			});

			authToken = loginResponse.body.session.token;
		});

		it('should update user profile', async () => {
			const updateData = {
				name: 'Updated Name',
				image: 'https://example.com/avatar.jpg',
			};

			const response = await request(app)
				.put('/api/me')
				.set('Authorization', `Bearer ${authToken}`)
				.send(updateData)
				.expect(200);

			expect(response.body.user.name).toBe(updateData.name);
			expect(response.body.user.image).toBe(updateData.image);
		});

		it('should not update email through this endpoint', async () => {
			const response = await request(app)
				.put('/api/me')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ email: 'new@example.com' })
				.expect(200);

			expect(response.body.user.email).toBe('update@example.com');
		});
	});

	describe('Session Management', () => {
		let authToken: string;

		beforeEach(async () => {
			// Register and login to get token
			await request(app).post('/auth/register').send({
				email: 'session@example.com',
				password: 'SessionPass123!',
				name: 'Session User',
			});

			const loginResponse = await request(app).post('/auth/login').send({
				email: 'session@example.com',
				password: 'SessionPass123!',
			});

			authToken = loginResponse.body.session.token;
		});

		describe('GET /api/sessions', () => {
			it('should return user sessions', async () => {
				const response = await request(app)
					.get('/api/sessions')
					.set('Authorization', `Bearer ${authToken}`)
					.expect(200);

				expect(response.body).toHaveProperty('sessions');
				expect(Array.isArray(response.body.sessions)).toBe(true);
				expect(response.body.sessions.length).toBeGreaterThan(0);
				expect(response.body.sessions[0]).toHaveProperty('current', true);
			});
		});

		describe('DELETE /auth/logout', () => {
			it('should logout user and invalidate session', async () => {
				const response = await request(app)
					.post('/auth/logout')
					.set('Authorization', `Bearer ${authToken}`)
					.expect(200);

				// Try to access protected endpoint with same token
				await request(app).get('/api/me').set('Authorization', `Bearer ${authToken}`).expect(401);
			});
		});
	});

	describe('OAuth Integration', () => {
		describe('GET /auth/oauth/github', () => {
			it('should redirect to GitHub OAuth', async () => {
				const response = await request(app).get('/auth/oauth/github').expect(302);

				expect(response.headers.location).toContain('github.com/oauth/authorize');
			});
		});

		describe('POST /auth/oauth/github', () => {
			it('should handle GitHub OAuth callback', async () => {
				// This would require mocking GitHub's OAuth response
				// For now, just test the endpoint exists
				const response = await request(app)
					.post('/auth/oauth/github/callback')
					.send({ code: 'test-code', state: 'test-state' })
					.expect(400); // Should fail without proper setup

				expect(response.body).toHaveProperty('error');
			});
		});
	});

	describe('Security Features', () => {
		describe('Rate Limiting', () => {
			it('should reject too many login attempts', async () => {
				const attempts = Array(11).fill(0);

				for (let i = 0; i < attempts.length; i++) {
					const response = await request(app).post('/auth/login').send({
						email: 'rate@example.com',
						password: 'wrong-password',
					});

					if (i === attempts.length - 1) {
						expect(response.status).toBe(429);
					}
				}
			});
		});

		describe('CSRF Protection', () => {
			it('should include CSRF token in responses', async () => {
				const response = await request(app).get('/auth/csrf').expect(200);

				expect(response.body).toHaveProperty('csrfToken');
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle database errors gracefully', async () => {
			// Mock database failure
			vi.spyOn(dbAdapter, 'getAdapter').mockImplementationOnce(() => {
				throw new Error('Database connection failed');
			});

			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'dberror@example.com',
					password: 'SecurePass123!',
					name: 'DB Error User',
				})
				.expect(500);

			expect(response.body).toHaveProperty('error');
		});

		it('should validate request body', async () => {
			const response = await request(app)
				.post('/auth/register')
				.send({
					email: 'missing-fields@example.com',
					// Missing password and name
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});
	});
});
