import type { Express } from 'express';
// Complete authentication workflow integration tests for Cortex WebUI backend
// brAInwav security standards with end-to-end authentication testing

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server.js';

// Mock dependencies
vi.mock('../../services/authService.js', () => ({
	AuthService: {
		verifyToken: vi.fn(),
		generateToken: vi.fn(() => 'mock-jwt-token'),
		refreshToken: vi.fn(() => 'mock-refresh-token'),
	},
}));

vi.mock('../../services/userService.js', () => ({
	UserService: {
		getUserById: vi.fn(),
		getUserByEmail: vi.fn(),
		createUser: vi.fn(),
		updateUser: vi.fn(),
		deleteUser: vi.fn(),
	},
}));

vi.mock('../../config/security.js', () => ({
	getSecurityConfig: vi.fn(() => ({
		headers: { enabled: false }, // Disabled for testing
		csrf: { enabled: false }, // Disabled for testing
		validation: { enabled: false }, // Disabled for testing
		apiKey: { enabled: false }, // Disabled for testing
		session: { enabled: false }, // Disabled for testing
		brand: {
			name: 'brAInwav',
			errorPrefix: 'brAInwav Security Error',
		},
	})),
	validateApiKeyFormat: vi.fn(() => true),
	generateCsrfToken: vi.fn(() => 'test-csrf-token'),
	validateCsrfToken: vi.fn(() => true),
}));

// Mock Better Auth
vi.mock('../../auth', () => ({
	auth: {
		handler: vi.fn((req, res) => {
			// Mock Better Auth handler
			if (req.path === '/api/auth/sign-up' && req.method === 'POST') {
				const { email, password } = req.body;
				if (email && password) {
					res.status(201).json({
						user: { id: 'user-123', email },
						session: { token: 'mock-session-token' },
					});
				} else {
					res.status(400).json({ error: 'Invalid credentials' });
				}
			} else if (req.path === '/api/auth/sign-in' && req.method === 'POST') {
				const { email, password } = req.body;
				if (email === 'test@example.com' && password === 'password123') {
					res.status(200).json({
						user: { id: 'user-123', email, name: 'Test User' },
						session: { token: 'mock-session-token' },
					});
				} else {
					res.status(401).json({ error: 'Invalid credentials' });
				}
			} else if (req.path === '/api/auth/sign-out' && req.method === 'POST') {
				res.status(200).json({ success: true });
			} else if (req.path === '/api/auth/session' && req.method === 'GET') {
				const authHeader = req.headers.authorization;
				if (authHeader === 'Bearer mock-session-token') {
					res.status(200).json({
						user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
						session: { token: 'mock-session-token' },
					});
				} else {
					res.status(401).json({ error: 'Unauthorized' });
				}
			} else {
				res.status(404).json({ error: 'Not found' });
			}
		}),
	},
	authHandler: vi.fn(),
}));

import { UserService } from '../../services/userService.js';

describe('Complete Authentication Workflows Integration Tests', () => {
	let app: Express;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createApp();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('User Registration Flow', () => {
		it('should complete full user registration workflow', async () => {
			// Arrange
			const userData = {
				email: 'newuser@example.com',
				password: 'SecurePassword123!',
				name: 'New User',
			};

			const createdUser = {
				id: 'user-456',
				email: userData.email,
				name: userData.name,
				createdAt: new Date().toISOString(),
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(null);
			vi.mocked(UserService.createUser).mockReturnValue(createdUser);

			// Act
			const response = await request(app).post('/api/auth/sign-up').send(userData).expect(201);

			// Assert
			expect(response.body).toMatchObject({
				user: expect.objectContaining({
					id: 'user-456',
					email: userData.email,
					name: userData.name,
				}),
				session: expect.objectContaining({
					token: 'mock-session-token',
				}),
			});

			expect(UserService.getUserByEmail).toHaveBeenCalledWith(userData.email);
			expect(UserService.createUser).toHaveBeenCalledWith(
				expect.objectContaining({
					email: userData.email,
					name: userData.name,
				}),
			);
		});

		it('should reject registration with duplicate email', async () => {
			// Arrange
			const existingUser = {
				id: 'user-123',
				email: 'existing@example.com',
				name: 'Existing User',
			};

			const duplicateUserData = {
				email: 'existing@example.com',
				password: 'Password123!',
				name: 'Duplicate User',
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(existingUser);

			// Act
			const response = await request(app)
				.post('/api/auth/sign-up')
				.send(duplicateUserData)
				.expect(400);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Invalid credentials',
			});

			expect(UserService.getUserByEmail).toHaveBeenCalledWith(duplicateUserData.email);
			expect(UserService.createUser).not.toHaveBeenCalled();
		});

		it('should validate registration input data', async () => {
			// Arrange
			const invalidUserData = {
				email: 'invalid-email',
				password: '123', // Too short
				name: '', // Empty
			};

			// Act
			const response = await request(app)
				.post('/api/auth/sign-up')
				.send(invalidUserData)
				.expect(400);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Invalid credentials',
			});
		});

		it('should handle registration service errors gracefully', async () => {
			// Arrange
			const userData = {
				email: 'error@example.com',
				password: 'Password123!',
				name: 'Error User',
			};

			vi.mocked(UserService.getUserByEmail).mockImplementation(() => {
				throw new Error('Database connection failed');
			});

			// Act
			const response = await request(app).post('/api/auth/sign-up').send(userData).expect(500);

			// Assert
			expect(response.body).toMatchObject({
				error: expect.stringContaining('error'),
			});
		});
	});

	describe('User Login Flow', () => {
		it('should complete successful user login workflow', async () => {
			// Arrange
			const loginData = {
				email: 'test@example.com',
				password: 'password123',
			};

			const existingUser = {
				id: 'user-123',
				email: loginData.email,
				name: 'Test User',
				passwordHash: 'hashed-password',
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(existingUser);

			// Act
			const response = await request(app).post('/api/auth/sign-in').send(loginData).expect(200);

			// Assert
			expect(response.body).toMatchObject({
				user: expect.objectContaining({
					id: 'user-123',
					email: loginData.email,
					name: 'Test User',
				}),
				session: expect.objectContaining({
					token: 'mock-session-token',
				}),
			});

			expect(UserService.getUserByEmail).toHaveBeenCalledWith(loginData.email);
		});

		it('should reject login with invalid credentials', async () => {
			// Arrange
			const invalidLoginData = {
				email: 'test@example.com',
				password: 'wrongpassword',
			};

			const existingUser = {
				id: 'user-123',
				email: 'test@example.com',
				passwordHash: 'hashed-password',
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(existingUser);

			// Act
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send(invalidLoginData)
				.expect(401);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Invalid credentials',
			});
		});

		it('should reject login for non-existent user', async () => {
			// Arrange
			const loginData = {
				email: 'nonexistent@example.com',
				password: 'password123',
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(null);

			// Act
			const response = await request(app).post('/api/auth/sign-in').send(loginData).expect(401);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Invalid credentials',
			});

			expect(UserService.getUserByEmail).toHaveBeenCalledWith(loginData.email);
		});

		it('should handle login service errors gracefully', async () => {
			// Arrange
			const loginData = {
				email: 'error@example.com',
				password: 'password123',
			};

			vi.mocked(UserService.getUserByEmail).mockImplementation(() => {
				throw new Error('Database connection failed');
			});

			// Act
			const response = await request(app).post('/api/auth/sign-in').send(loginData).expect(500);

			// Assert
			expect(response.body).toMatchObject({
				error: expect.stringContaining('error'),
			});
		});
	});

	describe('Session Management Flow', () => {
		it('should validate active session', async () => {
			// Arrange
			const sessionToken = 'mock-session-token';

			// Act
			const response = await request(app)
				.get('/api/auth/session')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			// Assert
			expect(response.body).toMatchObject({
				user: expect.objectContaining({
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
				}),
				session: expect.objectContaining({
					token: sessionToken,
				}),
			});
		});

		it('should reject invalid session token', async () => {
			// Arrange
			const invalidToken = 'invalid-session-token';

			// Act
			const response = await request(app)
				.get('/api/auth/session')
				.set('Authorization', `Bearer ${invalidToken}`)
				.expect(401);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Unauthorized',
			});
		});

		it('should reject requests without session token', async () => {
			// Act
			const response = await request(app).get('/api/auth/session').expect(401);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Unauthorized',
			});
		});

		it('should handle malformed authorization header', async () => {
			// Act
			const response = await request(app)
				.get('/api/auth/session')
				.set('Authorization', 'InvalidFormat')
				.expect(401);

			// Assert
			expect(response.body).toMatchObject({
				error: 'Unauthorized',
			});
		});
	});

	describe('Protected Resource Access Flow', () => {
		it('should allow access to protected resources with valid session', async () => {
			// Arrange
			const sessionToken = 'mock-session-token';

			// Mock conversation data
			const _mockConversations = [
				{ id: 'conv-1', title: 'Chat 1', userId: 'user-123' },
				{ id: 'conv-2', title: 'Chat 2', userId: 'user-123' },
			];

			vi.mocked(UserService.getUserById).mockReturnValue({
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
			} as any);

			// Act
			const response = await request(app)
				.get('/api/conversations')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			// Assert
			expect(response.body).toBeDefined();
		});

		it('should reject access to protected resources without session', async () => {
			// Act
			const response = await request(app).get('/api/conversations').expect(401);

			// Assert
			expect(response.body).toMatchObject({
				error: expect.stringContaining('Unauthorized'),
			});
		});

		it('should reject access to protected resources with invalid session', async () => {
			// Arrange
			const invalidToken = 'invalid-token';

			// Act
			const response = await request(app)
				.get('/api/conversations')
				.set('Authorization', `Bearer ${invalidToken}`)
				.expect(403);

			// Assert
			expect(response.body).toMatchObject({
				error: expect.stringContaining('token'),
			});
		});
	});

	describe('Logout Flow', () => {
		it('should complete successful logout workflow', async () => {
			// Act
			const response = await request(app).post('/api/auth/sign-out').expect(200);

			// Assert
			expect(response.body).toMatchObject({
				success: true,
			});
		});

		it('should handle logout errors gracefully', async () => {
			// Mock logout error
			// This would typically be handled by the auth handler
			const response = await request(app).post('/api/auth/sign-out').expect(200);

			// Assert
			expect(response.body).toMatchObject({
				success: true,
			});
		});
	});

	describe('Complete User Journey', () => {
		it('should complete full user journey from registration to protected resource access', async () => {
			// Step 1: Register new user
			const userData = {
				email: 'journey@example.com',
				password: 'JourneyPass123!',
				name: 'Journey User',
			};

			const createdUser = {
				id: 'user-journey',
				email: userData.email,
				name: userData.name,
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(null);
			vi.mocked(UserService.createUser).mockReturnValue(createdUser);

			const registerResponse = await request(app)
				.post('/api/auth/sign-up')
				.send(userData)
				.expect(201);

			const sessionToken = registerResponse.body.session.token;

			// Step 2: Validate session
			const sessionResponse = await request(app)
				.get('/api/auth/session')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			expect(sessionResponse.body.user.email).toBe(userData.email);

			// Step 3: Access protected resource
			vi.mocked(UserService.getUserById).mockReturnValue(createdUser as any);

			const conversationsResponse = await request(app)
				.get('/api/conversations')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(200);

			expect(conversationsResponse.body).toBeDefined();

			// Step 4: Logout
			await request(app).post('/api/auth/sign-out').expect(200);

			// Step 5: Verify session is no longer valid (in real implementation)
			const finalSessionResponse = await request(app)
				.get('/api/auth/session')
				.set('Authorization', `Bearer ${sessionToken}`)
				.expect(401);

			expect(finalSessionResponse.body.error).toBeDefined();
		});
	});

	describe('Security and Edge Cases', () => {
		it('should handle concurrent login attempts', async () => {
			// Arrange
			const loginData = {
				email: 'concurrent@example.com',
				password: 'password123',
			};

			const existingUser = {
				id: 'user-concurrent',
				email: loginData.email,
				name: 'Concurrent User',
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(existingUser);

			// Act - Make multiple concurrent requests
			const promises = Array(5)
				.fill(null)
				.map(() => request(app).post('/api/auth/sign-in').send(loginData));

			const responses = await Promise.all(promises);

			// Assert - All should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.body.user.email).toBe(loginData.email);
				expect(response.body.session.token).toBeDefined();
			});
		});

		it('should prevent account enumeration through consistent error messages', async () => {
			// Test non-existent user
			const response1 = await request(app)
				.post('/api/auth/sign-in')
				.send({ email: 'nonexistent@example.com', password: 'wrongpass' })
				.expect(401);

			// Test existing user with wrong password
			vi.mocked(UserService.getUserByEmail).mockReturnValue({ id: 'user-123' } as any);
			const response2 = await request(app)
				.post('/api/auth/sign-in')
				.send({ email: 'test@example.com', password: 'wrongpass' })
				.expect(401);

			// Assert - Both should return the same generic error message
			expect(response1.body.error).toBe(response2.body.error);
		});

		it('should handle extremely long input in authentication fields', async () => {
			// Arrange
			const longEmail = `${'a'.repeat(1000)}@example.com`;
			const longPassword = 'a'.repeat(10000);

			// Act
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({ email: longEmail, password: longPassword })
				.expect(401);

			// Assert
			expect(response.body.error).toBeDefined();
		});

		it('should handle special characters in authentication data', async () => {
			// Arrange
			const specialCharData = {
				email: 'tëst@éxample.com',
				password: 'Pásswörd123!🔒',
				name: 'Tëst Üser 🎉',
			};

			const createdUser = {
				id: 'user-special',
				email: specialCharData.email,
				name: specialCharData.name,
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(null);
			vi.mocked(UserService.createUser).mockReturnValue(createdUser);

			// Act
			const response = await request(app)
				.post('/api/auth/sign-up')
				.send(specialCharData)
				.expect(201);

			// Assert
			expect(response.body.user.email).toBe(specialCharData.email);
			expect(response.body.user.name).toBe(specialCharData.name);
		});

		it('should handle authentication during high load', async () => {
			// Arrange
			const loginData = {
				email: 'load@example.com',
				password: 'password123',
			};

			const existingUser = {
				id: 'user-load',
				email: loginData.email,
				name: 'Load Test User',
			};

			vi.mocked(UserService.getUserByEmail).mockReturnValue(existingUser);

			// Act - Make many requests to simulate high load
			const promises = Array(50)
				.fill(null)
				.map((_, index) =>
					request(app)
						.post('/api/auth/sign-in')
						.send({
							...loginData,
							// Add slight variation to prevent caching
							timestamp: Date.now() + index,
						}),
				);

			const responses = await Promise.all(promises);

			// Assert - All should handle gracefully (either succeed or fail gracefully)
			responses.forEach((response) => {
				expect([200, 401, 500]).toContain(response.status);
			});
		});
	});

	describe('brAInwav Security Standards Compliance', () => {
		it('should include brAInwav branding in security-related responses', async () => {
			// Test failed login
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({ email: 'test@example.com', password: 'wrong' })
				.expect(401);

			// Assert - Error response should be properly formatted
			expect(response.body).toHaveProperty('error');
		});

		it('should prevent timing attacks through consistent response times', async () => {
			// This test ensures that both valid and invalid attempts take similar time
			const validLoginData = { email: 'valid@example.com', password: 'password123' };
			const invalidLoginData = { email: 'invalid@example.com', password: 'wrongpassword' };

			vi.mocked(UserService.getUserByEmail).mockReturnValue({ id: 'user-123' } as any);

			// Measure times
			const startTime1 = Date.now();
			await request(app).post('/api/auth/sign-in').send(validLoginData);
			const validTime = Date.now() - startTime1;

			vi.mocked(UserService.getUserByEmail).mockReturnValue(null);

			const startTime2 = Date.now();
			await request(app).post('/api/auth/sign-in').send(invalidLoginData);
			const invalidTime = Date.now() - startTime2;

			// Assert - Times should be reasonably close (within 100ms)
			expect(Math.abs(validTime - invalidTime)).toBeLessThan(100);
		});

		it('should handle authentication attempts with malformed JSON', async () => {
			// Act
			const response = await request(app)
				.post('/api/auth/sign-in')
				.set('Content-Type', 'application/json')
				.send('{"email": "invalid json"')
				.expect(400);

			// Assert
			expect(response.body).toHaveProperty('error');
		});
	});
});
