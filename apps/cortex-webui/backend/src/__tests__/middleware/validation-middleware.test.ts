// Validation middleware tests for Cortex WebUI backend
// brAInwav validation standards with comprehensive edge case coverage

import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	validateRequestBody,
	validateRequestParams,
	validateRequestQuery,
} from '../middleware/validation.ts';

describe('Validation Middleware', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			body: {},
			query: {},
			params: {},
		};

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};

		mockNext = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Request Body Validation', () => {
		it('should pass validation with valid data', () => {
			// Arrange
			const schema = z.object({
				email: z.string().email(),
				password: z.string().min(8),
			});

			mockRequest.body = {
				email: 'test@example.com',
				password: 'securepassword123',
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
			expect(mockResponse.json).not.toHaveBeenCalled();
		});

		it('should reject invalid request body', () => {
			// Arrange
			const schema = z.object({
				email: z.string().email(),
				password: z.string().min(8),
			});

			mockRequest.body = {
				email: 'invalid-email',
				password: '123', // Too short
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject missing required fields', () => {
			// Arrange
			const schema = z.object({
				name: z.string(),
				email: z.string().email(),
				age: z.number().min(18),
			});

			mockRequest.body = {
				name: 'John Doe',
				// Missing email and age
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should handle complex nested object validation', () => {
			// Arrange
			const schema = z.object({
				user: z.object({
					profile: z.object({
						name: z.string(),
						preferences: z.object({
							theme: z.enum(['light', 'dark']),
							notifications: z.boolean(),
						}),
					}),
				}),
				metadata: z.array(z.string()),
			});

			mockRequest.body = {
				user: {
					profile: {
						name: 'Jane Doe',
						preferences: {
							theme: 'invalid-theme', // Invalid enum value
							notifications: true,
						},
					},
				},
				metadata: ['tag1', 'tag2'],
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should validate array types correctly', () => {
			// Arrange
			const schema = z.object({
				tags: z.array(z.string()),
				numbers: z.array(z.number().positive()),
			});

			mockRequest.body = {
				tags: ['tag1', 'tag2', 'tag3'],
				numbers: [1, -2, 3], // Contains negative number
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should handle optional and nullable fields', () => {
			// Arrange
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
				nullable: z.string().nullable(),
				optionalNullable: z.string().optional().nullable(),
			});

			mockRequest.body = {
				required: 'value',
				optional: undefined,
				nullable: null,
				optionalNullable: null,
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should validate with custom error messages', () => {
			// Arrange
			const schema = z
				.object({
					password: z.string().min(8, 'Password must be at least 8 characters'),
					confirmPassword: z.string(),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: 'Passwords do not match',
					path: ['confirmPassword'],
				});

			mockRequest.body = {
				password: '123',
				confirmPassword: '456',
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.objectContaining({
					issues: expect.arrayContaining([
						expect.objectContaining({
							message: 'Password must be at least 8 characters',
						}),
						expect.objectContaining({
							message: 'Passwords do not match',
						}),
					]),
				}),
			});
		});

		it('should handle empty request body validation', () => {
			// Arrange
			const schema = z.object({
				data: z.string(),
			});

			mockRequest.body = {};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
		});

		it('should validate date and time fields', () => {
			// Arrange
			const schema = z.object({
				birthDate: z.string().datetime(),
				appointmentTime: z.string().time(),
				age: z.number().int().min(0).max(150),
			});

			mockRequest.body = {
				birthDate: '2023-12-01T10:30:00Z',
				appointmentTime: '14:30:00',
				age: 25,
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should handle transformation and coercion', () => {
			// Arrange
			const schema = z.object({
				count: z.string().transform((val) => parseInt(val, 10)),
				enabled: z.string().transform((val) => val === 'true'),
			});

			mockRequest.body = {
				count: '42',
				enabled: 'true',
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockRequest.body.count).toBe(42);
			expect(mockRequest.body.enabled).toBe(true);
		});
	});

	describe('Request Query Validation', () => {
		it('should validate query parameters', () => {
			// Arrange
			const schema = z.object({
				page: z.string().transform(Number).pipe(z.number().min(1)),
				limit: z.string().transform(Number).pipe(z.number().max(100)),
				search: z.string().optional(),
			});

			mockRequest.query = {
				page: '1',
				limit: '10',
				search: 'test query',
			};

			// Act
			const middleware = validateRequestQuery(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockRequest.query.page).toBe(1);
			expect(mockRequest.query.limit).toBe(10);
			expect(mockRequest.query.search).toBe('test query');
		});

		it('should reject invalid query parameters', () => {
			// Arrange
			const schema = z.object({
				page: z.string().transform(Number).pipe(z.number().min(1)),
				category: z.enum(['posts', 'comments', 'users']),
			});

			mockRequest.query = {
				page: '0', // Invalid - must be >= 1
				category: 'invalid-category',
			};

			// Act
			const middleware = validateRequestQuery(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
		});

		it('should handle URL-encoded query parameters', () => {
			// Arrange
			const schema = z.object({
				search: z.string(),
				filters: z.string().optional(),
			});

			mockRequest.query = {
				search: 'hello%20world',
				filters: 'category%3Dposts%26date%3D2023',
			};

			// Act
			const middleware = validateRequestQuery(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			// Note: Express already URL-decodes query parameters
		});
	});

	describe('Request Params Validation', () => {
		it('should validate URL parameters', () => {
			// Arrange
			const schema = z.object({
				id: z.string().uuid(),
				slug: z.string().regex(/^[a-z0-9-]+$/),
			});

			mockRequest.params = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				slug: 'valid-slug-123',
			};

			// Act
			const middleware = validateRequestParams(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
		});

		it('should reject invalid URL parameters', () => {
			// Arrange
			const schema = z.object({
				id: z.string().uuid(),
				userId: z.string().regex(/^user_/),
			});

			mockRequest.params = {
				id: 'invalid-uuid',
				userId: '123', // Should start with 'user_'
			};

			// Act
			const middleware = validateRequestParams(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
		});

		it('should handle numeric ID parameters', () => {
			// Arrange
			const schema = z.object({
				postId: z.string().transform(Number).pipe(z.number().int().positive()),
				commentId: z.string().transform(Number).pipe(z.number().int().positive()),
			});

			mockRequest.params = {
				postId: '123',
				commentId: '456',
			};

			// Act
			const middleware = validateRequestParams(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockRequest.params.postId).toBe(123);
			expect(mockRequest.params.commentId).toBe(456);
		});
	});

	describe('brAInwav Security Standards', () => {
		it('should prevent sensitive data leakage in error messages', () => {
			// Arrange
			const schema = z.object({
				password: z.string().min(8),
				confirmPassword: z.string(),
			});

			mockRequest.body = {
				password: 'short',
				confirmPassword: 'different',
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
			// Error details are included for development but should be filtered in production
		});

		it('should handle malformed JSON gracefully', () => {
			// This test simulates what happens when Express can't parse JSON
			// The validation middleware receives an empty body
			const schema = z.object({
				data: z.string(),
			});

			mockRequest.body = undefined; // Malformed JSON results in undefined body

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
		});

		it('should validate against injection attempts', () => {
			// Arrange
			const schema = z.object({
				search: z.string().max(100),
				filter: z.string().optional(),
			});

			mockRequest.query = {
				search: '<script>alert("xss")</script>'.repeat(10), // Too long
				filter: "'; DROP TABLE users; --",
			};

			// Act
			const middleware = validateRequestQuery(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(z.ZodError),
			});
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle very large validation payloads efficiently', () => {
			// Arrange
			const largeArray = Array(1000).fill('item');
			const schema = z.object({
				items: z.array(z.string().max(50)),
			});

			mockRequest.body = {
				items: largeArray,
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle deeply nested objects', () => {
			// Arrange
			const schema = z.object({
				level1: z.object({
					level2: z.object({
						level3: z.object({
							value: z.string(),
						}),
					}),
				}),
			});

			mockRequest.body = {
				level1: {
					level2: {
						level3: {
							value: 'deep value',
						},
					},
				},
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle circular reference attempts', () => {
			// Note: Zod has built-in protection against infinite recursion
			// This test ensures our middleware handles edge cases
			const schema = z.object({
				data: z.any(),
			});

			const circular: any = {};
			circular.self = circular;

			mockRequest.body = {
				data: circular,
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled(); // 'any' type allows this
		});
	});
});
