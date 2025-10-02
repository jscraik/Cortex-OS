import type Database from 'better-sqlite3';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
// Create Express app
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '../../db/schema.ts';
import { betterAuthInstance } from '../../test/auth-config.ts';
import { createTestDatabase } from '../../test/database.ts';
import { createTestUser } from '../../test/utils.ts';

const app = express();
app.use(express.json());
app.use('/api/auth/*', betterAuthInstance.handler);

// Protected route for testing
app.get('/api/protected', async (req, res) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Missing authorization header' });
	}

	const token = authHeader.substring(7);
	const session = await betterAuthInstance.api.getSession({ sessionToken: token });

	if (!session) {
		return res.status(401).json({ error: 'Invalid session' });
	}

	res.json({
		message: 'Protected data',
		user: session.user,
	});
});

describe('Authentication Flow Integration', () => {
	let db: ReturnType<typeof drizzle>;
	let _testDb: Database;

	beforeEach(async () => {
		// Setup fresh database
		const { db: database, drizzleDb, migrate } = createTestDatabase();
		_testDb = database;
		db = drizzleDb;
		await migrate();
	});

	describe('Complete User Registration Flow', () => {
		it('should register, verify email, and login successfully', async () => {
			// 1. Register new user
			const registerResponse = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'integration@example.com',
					password: 'IntegrationPass123!',
					name: 'Integration User',
				})
				.expect(201);

			expect(registerResponse.body.user.email).toBe('integration@example.com');
			expect(registerResponse.body.user.emailVerified).toBe(false);

			const userId = registerResponse.body.user.id;

			// 2. Check if user exists in database
			const dbUser = await db
				.select()
				.from(schema.user)
				.where((user) => user.id.equals(userId))
				.limit(1);

			expect(dbUser[0]).toBeDefined();
			expect(dbUser[0].email).toBe('integration@example.com');

			// 3. Simulate email verification (in real app, this would be via email link)
			await db
				.update(schema.user)
				.set({ emailVerified: true })
				.where((user) => user.id.equals(userId));

			// 4. Login with verified account
			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'integration@example.com',
					password: 'IntegrationPass123!',
				})
				.expect(200);

			expect(loginResponse.body.session.token).toBeDefined();
			expect(loginResponse.body.user.emailVerified).toBe(true);

			// 5. Access protected route
			const protectedResponse = await request(app)
				.get('/api/protected')
				.set('Authorization', `Bearer ${loginResponse.body.session.token}`)
				.expect(200);

			expect(protectedResponse.body.user.email).toBe('integration@example.com');
		});

		it('should handle registration with weak password', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'weak@example.com',
					password: '123', // Too weak
					name: 'Weak Password User',
				})
				.expect(400);

			expect(response.body.error).toBeDefined();
			expect(response.body.error).toMatch(/password/i);
		});

		it('should prevent registration with invalid email', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'not-an-email',
					password: 'ValidPass123!',
					name: 'Invalid Email User',
				})
				.expect(400);

			expect(response.body.error).toBeDefined();
			expect(response.body.error).toMatch(/email/i);
		});
	});

	describe('Session Management Flow', () => {
		it('should create, use, and invalidate session', async () => {
			// Create test user
			const user = await createTestUser(db, {
				email: 'sessionflow@example.com',
				password: 'SessionFlow123!',
				name: 'Session Flow User',
			});

			// 1. Login to create session
			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'sessionflow@example.com',
					password: 'SessionFlow123!',
				})
				.expect(200);

			const sessionToken = loginResponse.body.session.token;

			// 2. Verify session exists in database
			const dbSession = await db
				.select()
				.from(schema.session)
				.where((session) => session.sessionToken.equals(sessionToken))
				.limit(1);

			expect(dbSession[0]).toBeDefined();
			expect(dbSession[0].userId).toBe(user.id);

			// 3. Use session to access protected resources
			const protectedResponse = await request(app)
				.get('/api/protected')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			expect(protectedResponse.body.user.id).toBe(user.id);

			// 4. Logout to invalidate session
			await request(app)
				.post('/api/auth/logout')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			// 5. Verify session is invalidated
			const afterLogoutResponse = await request(app)
				.get('/api/protected')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(401);

			expect(afterLogoutResponse.body.error).toContain('invalid');

			// 6. Verify session is removed from database
			const deletedSession = await db
				.select()
				.from(schema.session)
				.where((session) => session.sessionToken.equals(sessionToken))
				.limit(1);

			expect(deletedSession).toHaveLength(0);
		});

		it('should handle session expiration', async () => {
			const user = await createTestUser(db, {
				email: 'expire@example.com',
				password: 'ExpirePass123!',
				name: 'Expire User',
			});

			// Create session with immediate expiration
			const expiredSession = await betterAuthInstance.api.createSession({
				userId: user.id,
				expiresIn: -1, // Already expired
			});

			// Try to use expired session
			const response = await request(app)
				.get('/api/protected')
				.set('Authorization', `Bearer ${expiredSession.token}`)
				.expect(401);

			expect(response.body.error).toContain('expired');
		});
	});

	describe('OAuth Integration Flow', () => {
		it('should handle complete OAuth flow with GitHub', async () => {
			// Mock GitHub OAuth response
			const _mockGitHubUser = {
				id: '12345',
				email: 'github@example.com',
				name: 'GitHub User',
				avatar_url: 'https://github.com/avatar.jpg',
			};

			// Mock the OAuth flow
			vi.spyOn(betterAuthInstance.api, 'handleOAuthCallback').mockImplementationOnce(
				async ({ provider, code }) => {
					if (provider === 'github' && code === 'test-code') {
						// Check if user exists
						let user = await db
							.select()
							.from(schema.user)
							.where((u) => u.email.equals('github@example.com'))
							.limit(1);

						if (!user[0]) {
							// Create new user
							[user] = await db
								.insert(schema.user)
								.values({
									id: 'github-user-id',
									email: 'github@example.com',
									emailVerified: true,
									name: 'GitHub User',
									image: 'https://github.com/avatar.jpg',
									createdAt: Date.now(),
									updatedAt: Date.now(),
								})
								.returning();
						}

						// Create session
						const session = await betterAuthInstance.api.createSession({
							userId: user[0].id,
							expiresIn: 60 * 60 * 24 * 7,
						});

						return {
							user: user[0],
							session,
						};
					}
					throw new Error('Invalid OAuth callback');
				},
			);

			// 1. Get OAuth URL
			const authURLResponse = await request(app).get('/api/auth/github').expect(302);

			expect(authURLResponse.headers.location).toContain('github.com/oauth/authorize');

			// 2. Handle callback
			const callbackResponse = await request(app)
				.get('/api/auth/github/callback?code=test-code&state=test-state')
				.expect(302);

			expect(callbackResponse.headers.location).toBe('/dashboard');

			// 3. Verify user was created
			const createdUser = await db
				.select()
				.from(schema.user)
				.where((u) => u.email.equals('github@example.com'))
				.limit(1);

			expect(createdUser[0]).toBeDefined();
			expect(createdUser[0].name).toBe('GitHub User');
			expect(createdUser[0].emailVerified).toBe(true);
		});
	});

	describe('Password Reset Flow', () => {
		it('should handle complete password reset flow', async () => {
			const _user = await createTestUser(db, {
				email: 'reset@example.com',
				password: 'OldPass123!',
				name: 'Reset User',
			});

			// 1. Request password reset
			const forgotResponse = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'reset@example.com' })
				.expect(200);

			expect(forgotResponse.body.success).toBe(true);

			// 2. Check if reset token was created (in real app, this would be in verification table)
			const _verification = await db
				.select()
				.from(schema.verification)
				.where((v) => v.identifier.equals('reset@example.com'))
				.limit(1);

			// Note: Better Auth handles verification tokens internally

			// 3. Reset password with new password
			const resetResponse = await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'reset-token', // In real scenario, this comes from email
					password: 'NewPass123!',
				})
				.expect(200);

			expect(resetResponse.body.success).toBe(true);

			// 4. Login with new password
			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'reset@example.com',
					password: 'NewPass123!',
				})
				.expect(200);

			expect(loginResponse.body.user.email).toBe('reset@example.com');

			// 5. Verify old password doesn't work
			const oldPasswordResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'reset@example.com',
					password: 'OldPass123!',
				})
				.expect(401);

			expect(oldPasswordResponse.body.error).toContain('invalid');
		});
	});

	describe('Cross-Platform Session Management', () => {
		it('should maintain session across multiple requests', async () => {
			const _user = await createTestUser(db, {
				email: 'crossplatform@example.com',
				password: 'CrossPlatform123!',
				name: 'Cross Platform User',
			});

			// Login
			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'crossplatform@example.com',
					password: 'CrossPlatform123!',
				})
				.expect(200);

			const sessionToken = loginResponse.body.session.token;

			// Make multiple requests with same session
			const requests = [];
			for (let i = 0; i < 5; i++) {
				requests.push(
					request(app).get('/api/protected').set('Authorization', `Bearer ${sessionToken}`),
				);
			}

			const responses = await Promise.all(requests);

			// All requests should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.body.user.email).toBe('crossplatform@example.com');
			});
		});

		it('should handle concurrent sessions', async () => {
			const user = await createTestUser(db, {
				email: 'concurrent@example.com',
				password: 'Concurrent123!',
				name: 'Concurrent User',
			});

			// Create multiple sessions
			const sessions = [];
			for (let i = 0; i < 3; i++) {
				const response = await request(app).post('/api/auth/login').send({
					email: 'concurrent@example.com',
					password: 'Concurrent123!',
				});

				sessions.push(response.body.session.token);
			}

			// All sessions should be valid
			for (const sessionToken of sessions) {
				const response = await request(app)
					.get('/api/protected')
					.set('Authorization', `Bearer ${sessionToken}`)
					.expect(200);

				expect(response.body.user.email).toBe('concurrent@example.com');
			}

			// Check database has all sessions
			const dbSessions = await db
				.select()
				.from(schema.session)
				.where((session) => session.userId.equals(user.id));

			expect(dbSessions).toHaveLength(3);
		});
	});
});
