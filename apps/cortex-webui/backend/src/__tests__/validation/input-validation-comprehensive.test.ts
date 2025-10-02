import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server.js';
import { z } from 'zod';
import {
	validateRequestBody,
	validateRequestQuery,
	validateRequestParams
} from '../../middleware/validation.js';
import express from 'express';

describe('Input Validation Comprehensive Tests', () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Request Body Validation', () => {
		const userSchema = z.object({
			name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
			email: z.string().email('Invalid email format'),
			age: z.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
			preferences: z.object({
				theme: z.enum(['light', 'dark']).default('light'),
				notifications: z.boolean().default(true)
			}).optional()
		});

		it('should validate valid request body', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const validData = {
				name: 'brAInwav Test User',
				email: 'test@brainwav.ai',
				age: 25,
				preferences: {
					theme: 'dark',
					notifications: true
				}
			};

			const response = await request(app)
				.post('/test')
				.send(validData)
				.expect(200);

			expect(response.body).toHaveProperty('validated');
			expect(response.body.validated).toEqual(validData);
		});

		it('should reject request body with missing required fields', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const invalidData = {
				name: 'Test User',
				// Missing email and age
			};

			const response = await request(app)
				.post('/test')
				.send(invalidData)
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body).toHaveProperty('details');
		});

		it('should reject request body with invalid email format', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const invalidData = {
				name: 'Test User',
				email: 'invalid-email',
				age: 25
			};

			const response = await request(app)
				.post('/test')
				.send(invalidData)
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body.details).toContain('Invalid email format');
		});

		it('should reject request body with invalid field values', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const invalidData = {
				name: 'Test User',
				email: 'test@brainwav.ai',
				age: 15 // Too young
			};

			const response = await request(app)
				.post('/test')
				.send(invalidData)
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body.details).toContain('Must be at least 18');
		});

		it('should handle request body with extra fields', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const dataWithExtra = {
				name: 'Test User',
				email: 'test@brainwav.ai',
				age: 25,
				extraField: 'should be ignored',
				nested: {
					unexpected: 'data'
				}
			};

			const response = await request(app)
				.post('/test')
				.send(dataWithExtra)
				.expect(200);

			// Zod strips extra fields by default
			expect(response.body.validated).not.toHaveProperty('extraField');
			expect(response.body.validated).not.toHaveProperty('nested');
		});

		it('should apply default values for optional fields', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const minimalData = {
				name: 'Test User',
				email: 'test@brainwav.ai',
				age: 25
			};

			const response = await request(app)
				.post('/test')
				.send(minimalData)
				.expect(200);

			expect(response.body.validated).not.toHaveProperty('preferences');
		});

		it('should handle malformed JSON in request body', async () => {
			app.use('/test', validateRequestBody(userSchema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const response = await request(app)
				.post('/test')
				.set('Content-Type', 'application/json')
				.send('{"invalid": json}')
				.expect(400);

			// Should be caught by Express JSON middleware before validation
			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Request Query Validation', () => {
		const querySchema = z.object({
			page: z.string().regex(/^\d+$/).transform(Number).pipe(
				z.number().int().min(1).default(1)
			),
			limit: z.string().regex(/^\d+$/).transform(Number).pipe(
				z.number().int().min(1).max(100).default(20)
			),
			search: z.string().optional(),
			category: z.enum(['users', 'posts', 'comments']).optional(),
			active: z.enum(['true', 'false']).transform(val => val === 'true').optional()
		});

		it('should validate valid query parameters', async () => {
			app.use('/test', validateRequestQuery(querySchema));
			app.get('/test', (req, res) => res.json({ validated: req.query }));

			const response = await request(app)
				.get('/test?page=2&limit=10&search=brainwav&category=users&active=true')
				.expect(200);

			expect(response.body.validated).toEqual({
				page: 2,
				limit: 10,
				search: 'brainwav',
				category: 'users',
				active: true
			});
		});

		it('should apply default values for missing query parameters', async () => {
			app.use('/test', validateRequestQuery(querySchema));
			app.get('/test', (req, res) => res.json({ validated: req.query }));

			const response = await request(app)
				.get('/test')
				.expect(200);

			expect(response.body.validated).toEqual({
				page: 1,
				limit: 20
			});
		});

		it('should reject invalid query parameter values', async () => {
			app.use('/test', validateRequestQuery(querySchema));
			app.get('/test', (req, res) => res.json({ validated: req.query }));

			const response = await request(app)
				.get('/test?page=invalid&limit=200')
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body).toHaveProperty('details');
		});

		it('should reject invalid enum values', async () => {
			app.use('/test', validateRequestQuery(querySchema));
			app.get('/test', (req, res) => res.json({ validated: req.query }));

			const response = await request(app)
				.get('/test?category=invalid-category')
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});
	});

	describe('Request Parameters Validation', () => {
		const paramsSchema = z.object({
			id: z.string().regex(/^\d+$/).transform(Number).pipe(
				z.number().int().positive()
			),
			slug: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50),
			category: z.enum(['users', 'posts', 'comments', 'admin'])
		});

		it('should validate valid URL parameters', async () => {
			app.use('/test/:id/:slug/:category', validateRequestParams(paramsSchema));
			app.get('/test/:id/:slug/:category', (req, res) => res.json({ validated: req.params }));

			const response = await request(app)
				.get('/test/123/brainwav-test/users')
				.expect(200);

			expect(response.body.validated).toEqual({
				id: 123,
				slug: 'brainwav-test',
				category: 'users'
			});
		});

		it('should reject invalid URL parameters', async () => {
			app.use('/test/:id/:slug/:category', validateRequestParams(paramsSchema));
			app.get('/test/:id/:slug/:category', (req, res) => res.json({ validated: req.params }));

			const response = await request(app)
				.get('/test/invalid-id/invalid slug/users')
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should reject negative ID values', async () => {
			app.use('/test/:id/:slug/:category', validateRequestParams(paramsSchema));
			app.get('/test/:id/:slug/:category', (req, res) => res.json({ validated: req.params }));

			const response = await request(app)
				.get('/test/-1/brainwav-test/users')
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should reject invalid enum category values', async () => {
			app.use('/test/:id/:slug/:category', validateRequestParams(paramsSchema));
			app.get('/test/:id/:slug/:category', (req, res) => res.json({ validated: req.params }));

			const response = await request(app)
				.get('/test/123/brainwav-test/invalid-category')
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});
	});

	describe('Complex Validation Scenarios', () => {
		const complexUserSchema = z.object({
			username: z.string()
				.min(3, 'Username must be at least 3 characters')
				.max(30, 'Username must be at most 30 characters')
				.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
			email: z.string().email('Invalid email format'),
			password: z.string()
				.min(8, 'Password must be at least 8 characters')
				.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
					'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
			confirmPassword: z.string(),
			profile: z.object({
				firstName: z.string().min(1).max(50),
				lastName: z.string().min(1).max(50),
				bio: z.string().max(500).optional(),
				website: z.string().url().optional().or(z.literal('')),
				dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
			}),
			preferences: z.object({
				theme: z.enum(['light', 'dark', 'auto']),
				language: z.string().min(2).max(5),
				timezone: z.string().min(1),
				emailNotifications: z.boolean(),
				pushNotifications: z.boolean()
			})
		}).refine((data) => data.password === data.confirmPassword, {
			message: "Passwords don't match",
			path: ["confirmPassword"]
		});

		it('should validate complex user registration data', async () => {
			app.use('/register', validateRequestBody(complexUserSchema));
			app.post('/register', (req, res) => res.json({ validated: req.body }));

			const validUser = {
				username: 'brainwav_user',
				email: 'user@brainwav.ai',
				password: 'SecurePass123!',
				confirmPassword: 'SecurePass123!',
				profile: {
					firstName: 'brAInwav',
					lastName: 'User',
					bio: 'Test user bio',
					website: 'https://brainwav.ai',
					dateOfBirth: '1990-01-01'
				},
				preferences: {
					theme: 'dark',
					language: 'en',
					timezone: 'UTC',
					emailNotifications: true,
					pushNotifications: false
				}
			};

			const response = await request(app)
				.post('/register')
				.send(validUser)
				.expect(200);

			expect(response.body).toHaveProperty('validated');
			expect(response.body.validated.username).toBe('brainwav_user');
			expect(response.body.validated.email).toBe('user@brainwav.ai');
		});

		it('should reject passwords that don\'t match', async () => {
			app.use('/register', validateRequestBody(complexUserSchema));
			app.post('/register', (req, res) => res.json({ validated: req.body }));

			const invalidUser = {
				username: 'brainwav_user',
				email: 'user@brainwav.ai',
				password: 'SecurePass123!',
				confirmPassword: 'DifferentPass123!',
				profile: {
					firstName: 'brAInwav',
					lastName: 'User'
				},
				preferences: {
					theme: 'dark',
					language: 'en',
					timezone: 'UTC',
					emailNotifications: true,
					pushNotifications: false
				}
			};

			const response = await request(app)
				.post('/register')
				.send(invalidUser)
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body.details).toContain("Passwords don't match");
		});

		it('should reject weak passwords', async () => {
			app.use('/register', validateRequestBody(complexUserSchema));
			app.post('/register', (req, res) => res.json({ validated: req.body }));

			const invalidUser = {
				username: 'brainwav_user',
				email: 'user@brainwav.ai',
				password: 'weak', // Too weak
				confirmPassword: 'weak',
				profile: {
					firstName: 'brAInwav',
					lastName: 'User'
				},
				preferences: {
					theme: 'dark',
					language: 'en',
					timezone: 'UTC',
					emailNotifications: true,
					pushNotifications: false
				}
			};

			const response = await request(app)
				.post('/register')
				.send(invalidUser)
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body.details).toContain('Password must contain at least one uppercase letter');
		});

		it('should reject invalid usernames', async () => {
			app.use('/register', validateRequestBody(complexUserSchema));
			app.post('/register', (req, res) => res.json({ validated: req.body }));

			const invalidUser = {
				username: 'invalid username!', // Contains space and exclamation mark
				email: 'user@brainwav.ai',
				password: 'SecurePass123!',
				confirmPassword: 'SecurePass123!',
				profile: {
					firstName: 'brAInwav',
					lastName: 'User'
				},
				preferences: {
					theme: 'dark',
					language: 'en',
					timezone: 'UTC',
					emailNotifications: true,
					pushNotifications: false
				}
			};

			const response = await request(app)
				.post('/register')
				.send(invalidUser)
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body.details).toContain('Username can only contain letters, numbers, underscores, and hyphens');
		});
	});

	describe('Error Message Formatting', () => {
		it('should provide clear validation error messages', async () => {
			const schema = z.object({
				name: z.string().min(5, 'Name must be at least 5 characters long'),
				email: z.string().email('Please provide a valid email address'),
				age: z.number().min(18, 'You must be at least 18 years old to register')
			});

			app.use('/test', validateRequestBody(schema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const response = await request(app)
				.post('/test')
				.send({
					name: 'abc', // Too short
					email: 'invalid-email',
					age: 16 // Too young
				})
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
			expect(response.body).toHaveProperty('details');

			const details = response.body.details;
			expect(details).toContain('Name must be at least 5 characters long');
			expect(details).toContain('Please provide a valid email address');
			expect(details).toContain('You must be at least 18 years old to register');
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle very large payloads efficiently', async () => {
			const schema = z.object({
				data: z.string().max(1000000) // 1MB max
			});

			app.use('/test', validateRequestBody(schema));
			app.post('/test', (req, res) => res.json({ size: req.body.data.length }));

			const largeData = 'x'.repeat(999999); // Just under the limit

			const response = await request(app)
				.post('/test')
				.send({ data: largeData })
				.expect(200);

			expect(response.body.size).toBe(999999);
		});

		it('should reject payloads that exceed size limits', async () => {
			const schema = z.object({
				data: z.string().max(1000) // 1KB max
			});

			app.use('/test', validateRequestBody(schema));
			app.post('/test', (req, res) => res.json({ size: req.body.data.length }));

			const oversizedData = 'x'.repeat(2000); // Over the limit

			const response = await request(app)
				.post('/test')
				.send({ data: oversizedData })
				.expect(400);

			expect(response.body).toHaveProperty('error', 'Validation failed');
		});

		it('should handle deeply nested objects', async () => {
			const schema = z.object({
				nested: z.object({
					level1: z.object({
						level2: z.object({
							level3: z.string()
						})
					})
				})
			});

			app.use('/test', validateRequestBody(schema));
			app.post('/test', (req, res) => res.json({ validated: req.body }));

			const validData = {
				nested: {
					level1: {
						level2: {
							level3: 'deep value'
						}
					}
				}
			};

			const response = await request(app)
				.post('/test')
				.send(validData)
				.expect(200);

			expect(response.body.validated.nested.level1.level2.level3).toBe('deep value');
		});
	});
});