/**
 * Complete API endpoint tests
 * Goal: Achieve comprehensive coverage of all API routes
 */

import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server';

describe('API Endpoints - Complete Coverage Tests', () => {
	let app: Express;

	beforeEach(() => {
		app = createApp();
		vi.clearAllMocks();
	});

	describe('Authentication Endpoints (/api/auth)', () => {
		describe('POST /api/auth/sign-up', () => {
			it('should register a new user with valid data', async () => {
				const userData = {
					name: 'Test User',
					email: 'test@example.com',
					password: 'SecurePass123!',
				};

				const response = await request(app).post('/api/auth/sign-up').send(userData).expect(201);

				expect(response.body).toHaveProperty('user');
				expect(response.body.user.email).toBe(userData.email);
				expect(response.body.user).not.toHaveProperty('password');
			});

			it('should reject registration with invalid email', async () => {
				const userData = {
					name: 'Test User',
					email: 'invalid-email',
					password: 'SecurePass123!',
				};

				const response = await request(app).post('/api/auth/sign-up').send(userData).expect(400);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('email');
			});

			it('should reject registration with weak password', async () => {
				const userData = {
					name: 'Test User',
					email: 'test@example.com',
					password: '123',
				};

				const response = await request(app).post('/api/auth/sign-up').send(userData).expect(400);

				expect(response.body).toHaveProperty('error');
			});

			it('should reject duplicate email registration', async () => {
				const userData = {
					name: 'Test User',
					email: 'existing@example.com',
					password: 'SecurePass123!',
				};

				// First registration
				await request(app).post('/api/auth/sign-up').send(userData).expect(201);

				// Second registration with same email
				const response = await request(app).post('/api/auth/sign-up').send(userData).expect(409);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('already exists');
			});
		});

		describe('POST /api/auth/login', () => {
			it('should login with valid credentials', async () => {
				const credentials = {
					email: 'admin@example.com',
					password: 'admin123',
				};

				const response = await request(app).post('/api/auth/login').send(credentials).expect(200);

				expect(response.body).toHaveProperty('user');
				expect(response.headers['set-cookie']).toBeDefined();
			});

			it('should reject login with invalid credentials', async () => {
				const credentials = {
					email: 'admin@example.com',
					password: 'wrongpassword',
				};

				const response = await request(app).post('/api/auth/login').send(credentials).expect(401);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('Invalid credentials');
			});

			it('should reject login for non-existent user', async () => {
				const credentials = {
					email: 'nonexistent@example.com',
					password: 'somepassword',
				};

				const response = await request(app).post('/api/auth/login').send(credentials).expect(401);

				expect(response.body).toHaveProperty('error');
			});

			it('should handle missing fields', async () => {
				const response = await request(app).post('/api/auth/login').send({}).expect(400);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('required');
			});
		});

		describe('POST /api/auth/logout', () => {
			it('should logout authenticated user', async () => {
				// First login
				const loginResponse = await request(app).post('/api/auth/login').send({
					email: 'admin@example.com',
					password: 'admin123',
				});

				const sessionCookie = loginResponse.headers['set-cookie'][0];

				// Then logout
				const response = await request(app)
					.post('/api/auth/logout')
					.set('Cookie', sessionCookie)
					.expect(200);

				expect(response.body).toHaveProperty('message');
			});

			it('should handle logout without session', async () => {
				const response = await request(app).post('/api/auth/logout').expect(401);

				expect(response.body).toHaveProperty('error');
			});
		});

		describe('GET /api/auth/me', () => {
			it('should return current user info', async () => {
				// Login first
				const loginResponse = await request(app).post('/api/auth/login').send({
					email: 'admin@example.com',
					password: 'admin123',
				});

				const sessionCookie = loginResponse.headers['set-cookie'][0];

				// Get user info
				const response = await request(app)
					.get('/api/auth/me')
					.set('Cookie', sessionCookie)
					.expect(200);

				expect(response.body).toHaveProperty('user');
				expect(response.body.user).toHaveProperty('id');
				expect(response.body.user).toHaveProperty('email');
				expect(response.body.user).not.toHaveProperty('password');
			});

			it('should require authentication', async () => {
				const response = await request(app).get('/api/auth/me').expect(401);

				expect(response.body).toHaveProperty('error');
			});
		});
	});

	describe('User Management Endpoints (/api/v1/users)', () => {
		let authCookie: string;

		beforeEach(async () => {
			// Authenticate as admin
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'admin@example.com',
				password: 'admin123',
			});
			authCookie = loginResponse.headers['set-cookie'][0];
		});

		describe('GET /api/v1/users', () => {
			it('should list users for admin', async () => {
				const response = await request(app)
					.get('/api/v1/users')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('users');
				expect(Array.isArray(response.body.users)).toBe(true);
			});

			it('should support pagination', async () => {
				const response = await request(app)
					.get('/api/v1/users?page=1&limit=10')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('users');
				expect(response.body).toHaveProperty('pagination');
				expect(response.body.pagination).toHaveProperty('page');
				expect(response.body.pagination).toHaveProperty('limit');
				expect(response.body.pagination).toHaveProperty('total');
			});

			it('should reject unauthenticated requests', async () => {
				const response = await request(app).get('/api/v1/users').expect(401);

				expect(response.body).toHaveProperty('error');
			});
		});

		describe('PUT /api/v1/users/:id', () => {
			it('should update user information', async () => {
				const updateData = {
					name: 'Updated Name',
					email: 'updated@example.com',
				};

				const response = await request(app)
					.put('/api/v1/users/user-123')
					.set('Cookie', authCookie)
					.send(updateData)
					.expect(200);

				expect(response.body).toHaveProperty('user');
				expect(response.body.user.name).toBe(updateData.name);
			});

			it('should validate update data', async () => {
				const response = await request(app)
					.put('/api/v1/users/user-123')
					.set('Cookie', authCookie)
					.send({ email: 'invalid-email' })
					.expect(400);

				expect(response.body).toHaveProperty('error');
			});

			it('should prevent updating other users without admin role', async () => {
				// Login as regular user
				const userLogin = await request(app).post('/api/auth/login').send({
					email: 'user@example.com',
					password: 'user123',
				});

				const userCookie = userLogin.headers['set-cookie'][0];

				const response = await request(app)
					.put('/api/v1/users/admin-user-id')
					.set('Cookie', userCookie)
					.send({ name: 'Hacked Name' })
					.expect(403);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('permission');
			});
		});

		describe('DELETE /api/v1/users/:id', () => {
			it('should delete user as admin', async () => {
				const response = await request(app)
					.delete('/api/v1/users/user-to-delete')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('message');
			});

			it('should prevent self-deletion', async () => {
				// Get current user ID
				const meResponse = await request(app).get('/api/auth/me').set('Cookie', authCookie);

				const userId = meResponse.body.user.id;

				const response = await request(app)
					.delete(`/api/v1/users/${userId}`)
					.set('Cookie', authCookie)
					.expect(400);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('Cannot delete yourself');
			});
		});
	});

	describe('Chat Endpoints (/api/v1/chat)', () => {
		let authCookie: string;

		beforeEach(async () => {
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'user@example.com',
				password: 'user123',
			});
			authCookie = loginResponse.headers['set-cookie'][0];
		});

		describe('POST /api/v1/chat', () => {
			it('should send a message', async () => {
				const message = {
					message: 'Hello, AI!',
					conversationId: 'conv-123',
				};

				const response = await request(app)
					.post('/api/v1/chat')
					.set('Cookie', authCookie)
					.send(message)
					.expect(200);

				expect(response.body).toHaveProperty('response');
				expect(response.body).toHaveProperty('messageId');
			});

			it('should validate message content', async () => {
				const response = await request(app)
					.post('/api/v1/chat')
					.set('Cookie', authCookie)
					.send({ message: '' })
					.expect(400);

				expect(response.body).toHaveProperty('error');
			});

			it('should handle rate limiting', async () => {
				const message = { message: 'Test message' };
				const promises = Array(20)
					.fill(null)
					.map(() => request(app).post('/api/v1/chat').set('Cookie', authCookie).send(message));

				const responses = await Promise.all(promises);
				const rateLimitedResponse = responses.find((r) => r.status === 429);
				expect(rateLimitedResponse).toBeDefined();
			});
		});

		describe('GET /api/v1/chat/conversations', () => {
			it('should list conversations', async () => {
				const response = await request(app)
					.get('/api/v1/chat/conversations')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('conversations');
				expect(Array.isArray(response.body.conversations)).toBe(true);
			});

			it('should filter conversations', async () => {
				const response = await request(app)
					.get('/api/v1/chat/conversations?active=true')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('conversations');
				response.body.conversations.forEach((conv) => {
					expect(conv.active).toBe(true);
				});
			});
		});

		describe('POST /api/v1/chat/conversations', () => {
			it('should create new conversation', async () => {
				const convData = {
					title: 'New Chat',
					model: 'gpt-4',
				};

				const response = await request(app)
					.post('/api/v1/chat/conversations')
					.set('Cookie', authCookie)
					.send(convData)
					.expect(201);

				expect(response.body).toHaveProperty('conversation');
				expect(response.body.conversation.title).toBe(convData.title);
			});
		});
	});

	describe('Document Management Endpoints (/api/v1/documents)', () => {
		let authCookie: string;

		beforeEach(async () => {
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'user@example.com',
				password: 'user123',
			});
			authCookie = loginResponse.headers['set-cookie'][0];
		});

		describe('POST /api/v1/documents/upload', () => {
			it('should upload PDF file', async () => {
				const response = await request(app)
					.post('/api/v1/documents/upload')
					.set('Cookie', authCookie)
					.attach('file', 'test/fixtures/sample.pdf', 'sample.pdf')
					.expect(200);

				expect(response.body).toHaveProperty('document');
				expect(response.body.document.filename).toBe('sample.pdf');
			});

			it('should validate file types', async () => {
				const response = await request(app)
					.post('/api/v1/documents/upload')
					.set('Cookie', authCookie)
					.attach('file', Buffer.from('fake content'), 'malware.exe')
					.expect(400);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('file type');
			});

			it('should limit file size', async () => {
				const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
				const response = await request(app)
					.post('/api/v1/documents/upload')
					.set('Cookie', authCookie)
					.attach('file', largeFile, 'large.pdf')
					.expect(400);

				expect(response.body).toHaveProperty('error');
				expect(response.body.error).toContain('too large');
			});
		});

		describe('GET /api/v1/documents', () => {
			it('should list user documents', async () => {
				const response = await request(app)
					.get('/api/v1/documents')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('documents');
				expect(Array.isArray(response.body.documents)).toBe(true);
			});

			it('should search documents', async () => {
				const response = await request(app)
					.get('/api/v1/documents?search=important')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('documents');
			});
		});

		describe('DELETE /api/v1/documents/:id', () => {
			it('should delete document', async () => {
				const response = await request(app)
					.delete('/api/v1/documents/doc-123')
					.set('Cookie', authCookie)
					.expect(200);

				expect(response.body).toHaveProperty('message');
			});

			it('should prevent deleting others documents', async () => {
				const response = await request(app)
					.delete('/api/v1/documents/other-user-doc')
					.set('Cookie', authCookie)
					.expect(403);

				expect(response.body).toHaveProperty('error');
			});
		});
	});

	describe('Health and Status Endpoints', () => {
		describe('GET /health', () => {
			it('should return health status', async () => {
				const response = await request(app).get('/health').expect(200);

				expect(response.body).toHaveProperty('status');
				expect(response.body).toHaveProperty('timestamp');
				expect(response.body.status).toBe('healthy');
			});
		});

		describe('GET /ready', () => {
			it('should return readiness status', async () => {
				const response = await request(app).get('/ready').expect(200);

				expect(response.body).toHaveProperty('ready');
				expect(response.body).toHaveProperty('checks');
			});
		});

		describe('GET /live', () => {
			it('should return liveness status', async () => {
				const response = await request(app).get('/live').expect(200);

				expect(response.body).toHaveProperty('alive');
				expect(response.body.alive).toBe(true);
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle 404 for unknown endpoints', async () => {
			const response = await request(app).get('/api/unknown/endpoint').expect(404);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('Not found');
		});

		it('should handle malformed JSON', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.set('Content-Type', 'application/json')
				.send('invalid json')
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should handle oversized payloads', async () => {
			const largePayload = {
				data: 'x'.repeat(2 * 1024 * 1024), // 2MB
			};

			const response = await request(app).post('/api/v1/test').send(largePayload).expect(413);

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Security Tests', () => {
		it('should prevent XSS in message content', async () => {
			const maliciousPayload = {
				message: '<script>alert("xss")</script>',
			};

			const response = await request(app).post('/api/v1/chat').send(maliciousPayload).expect(401); // Unauthorized because no auth

			// Response should not contain unescaped script
			expect(response.body.error || '').not.toContain('<script>');
		});

		it('should sanitize error messages', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'admin@example.com',
					password: "'; DROP TABLE users; --",
				})
				.expect(401);

			// Error should be generic, not revealing database structure
			expect(response.body.error).not.toContain('DROP TABLE');
		});

		it('should enforce CSRF protection', async () => {
			// Test that state-changing operations require CSRF token
			const response = await request(app)
				.post('/api/v1/user/update')
				.set('Content-Type', 'application/json')
				.send({ name: 'Hacked' })
				.expect(403); // CSRF protection

			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Performance Tests', () => {
		it('should respond quickly to health checks', async () => {
			const start = Date.now();
			await request(app).get('/health').expect(200);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100); // Should respond in <100ms
		});

		it('should handle concurrent requests', async () => {
			const promises = Array(50)
				.fill(null)
				.map(() => request(app).get('/health').expect(200));

			const start = Date.now();
			await Promise.all(promises);
			const duration = Date.now() - start;

			// Should handle 50 concurrent requests in reasonable time
			expect(duration).toBeLessThan(1000);
		});
	});
});
