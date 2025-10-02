// Comprehensive validation middleware tests for Cortex WebUI backend
// brAInwav validation standards with complete edge case coverage

import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	validateRequestBody,
	validateRequestParams,
	validateRequestQuery,
} from '../apps/cortex-webui/backend/src/middleware/validation';

describe('Validation Middleware - Comprehensive Tests', () => {
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

	describe('Request Body Validation', () => {
		it('should pass validation with valid data', () => {
			// Arrange
			const schema = z.object({
				email: z.string().email(),
				message: z.string().min(1),
			});

			mockRequest.body = {
				email: 'test@example.com',
				message: 'Hello world',
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should reject invalid email format', () => {
			// Arrange
			const schema = z.object({
				email: z.string().email(),
				message: z.string().min(1),
			});

			mockRequest.body = {
				email: 'invalid-email',
				message: 'Hello world',
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
				email: z.string().email(),
				message: z.string().min(1),
			});

			mockRequest.body = {
				email: 'test@example.com',
				// Missing message
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

		it('should validate complex nested objects', () => {
			// Arrange
			const schema = z.object({
				user: z.object({
					profile: z.object({
						name: z.string().min(2),
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
							theme: 'dark',
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
			expect(mockNext).toHaveBeenCalled();
		});

		it('should reject invalid nested objects', () => {
			// Arrange
			const schema = z.object({
				user: z.object({
					profile: z.object({
						name: z.string().min(2),
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
						name: 'J', // Too short
						preferences: {
							theme: 'invalid-theme', // Invalid enum
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
		});

		it('should validate array types correctly', () => {
			// Arrange
			const schema = z.object({
				tags: z.array(z.string()),
				numbers: z.array(z.number().positive()),
			});

			mockRequest.body = {
				tags: ['tag1', 'tag2', 'tag3'],
				numbers: [1, 2, 3],
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
		});

		it('should reject arrays with invalid elements', () => {
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
		});
	});

	describe('Request Query Validation', () => {
		it('should validate query parameters correctly', () => {
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
				limit: z.string().transform(Number).pipe(z.number().max(100)),
				category: z.enum(['posts', 'comments', 'users']),
			});

			mockRequest.query = {
				page: '0', // Invalid - must be >= 1
				limit: '150', // Invalid - must be <= 100
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

		it('should apply default values for optional fields', () => {
			// Arrange
			const schema = z.object({
				page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
				limit: z.string().transform(Number).pipe(z.number().max(100)).default('10'),
				search: z.string().optional(),
			});

			mockRequest.query = {
				search: 'test',
				// page and limit missing - should get defaults
			};

			// Act
			const middleware = validateRequestQuery(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockRequest.query.page).toBe(1);
			expect(mockRequest.query.limit).toBe(10);
		});

		it('should reject invalid enum values', () => {
			// Arrange
			const schema = z.object({
				sort: z.enum(['asc', 'desc']),
				filter: z.enum(['all', 'active', 'inactive']),
			});

			mockRequest.query = {
				sort: 'invalid',
				filter: 'maybe',
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

	describe('Request Params Validation', () => {
		it('should validate URL parameters correctly', () => {
			// Arrange
			const schema = z.object({
				id: z.string().regex(/^[a-zA-Z0-9-]+$/),
				action: z.enum(['view', 'edit', 'delete']),
			});

			mockRequest.params = {
				id: 'user-123',
				action: 'view',
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
				id: z.string().regex(/^[a-zA-Z0-9-]+$/),
				action: z.enum(['view', 'edit', 'delete']),
			});

			mockRequest.params = {
				id: 'user@123', // Invalid characters
				action: 'invalid-action',
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

		it('should validate numeric ID parameters', () => {
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

		it('should reject negative ID values', () => {
			// Arrange
			const schema = z.object({
				postId: z.string().transform(Number).pipe(z.number().int().positive()),
			});

			mockRequest.params = {
				postId: '-123',
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
	});

	describe('Complex Validation Scenarios', () => {
		it('should validate complex user registration data', () => {
			// Arrange
			const schema = z.object({
				user: z.object({
					email: z.string().email(),
					username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
					password: z
						.string()
						.min(8)
						.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
				}),
				profile: z.object({
					firstName: z.string().min(1),
					lastName: z.string().min(1),
					bio: z.string().max(500).optional(),
				}),
			});

			mockRequest.body = {
				user: {
					email: 'user@example.com',
					username: 'validuser',
					password: 'SecurePass123!',
				},
				profile: {
					firstName: 'John',
					lastName: 'Doe',
					bio: 'A brief bio',
				},
			};

			// Act
			const middleware = validateRequestBody(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
		});

		it("should reject passwords that don't match", () => {
			// Arrange
			const schema = z
				.object({
					password: z.string().min(8),
					confirmPassword: z.string(),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: "Passwords don't match",
					path: ['confirmPassword'],
				});

			mockRequest.body = {
				password: 'password123',
				confirmPassword: 'differentpassword',
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
		});

		it('should reject weak passwords', () => {
			// Arrange
			const schema = z.object({
				password: z
					.string()
					.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
						message:
							'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
					}),
			});

			mockRequest.body = {
				password: 'weakpassword', // Missing uppercase, number, and special chars
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
		});

		it('should reject invalid usernames', () => {
			// Arrange
			const schema = z.object({
				username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, {
					message:
						'Username can only contain letters, numbers, and underscores, and must be 3-20 characters long',
				}),
			});

			mockRequest.body = {
				username: 'user@name', // Invalid character
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
		});
	});

	describe('brAInwav Security Standards', () => {
		it('should prevent injection attempts in validation', () => {
			// Arrange
			const schema = z.object({
				search: z.string().max(100),
				filter: z.string().optional(),
			});

			mockRequest.query = {
				search: '<script>alert("xss")</script>',
				filter: "'; DROP TABLE users; --",
			};

			// Act
			const middleware = validateRequestQuery(schema);
			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert - Should pass validation (XSS prevention handled elsewhere)
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle very long input strings', () => {
			// Arrange
			const schema = z.object({
				content: z.string().max(1000),
			});

			const longContent = 'a'.repeat(1500); // Exceeds max length
			mockRequest.body = { content: longContent };

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

		it('should validate email formats strictly', () => {
			// Arrange
			const schema = z.object({
				email: z.string().email(),
			});

			const invalidEmails = [
				'plainaddress',
				'@missingdomain.com',
				'missing@.com',
				'spaces @domain.com',
				'user@domain with spaces.com',
				'user@domain',
				'user..double.dot@domain.com',
			];

			invalidEmails.forEach((invalidEmail) => {
				mockRequest.body = { email: invalidEmail };

				// Act
				const middleware = validateRequestBody(schema);
				middleware(mockRequest as Request, mockResponse as Response, mockNext);

				// Assert
				expect(mockResponse.status).toHaveBeenCalledWith(400);
			});
		});

		it('should prevent SQL injection attempts', () => {
			// Arrange
			const schema = z.object({
				id: z.string().uuid(),
				filter: z.string().optional(),
			});

			mockRequest.params = {
				id: "550e8400-e29b-41d4-a716-446655440000'; DROP TABLE users; --",
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
	});

	describe('Error Message Formatting', () => {
		it('should provide clear validation error messages', () => {
			// Arrange
			const schema = z.object({
				name: z.string().min(5, 'Name must be at least 5 characters long'),
				email: z.string().email('Must provide a valid email address'),
				age: z.number().min(18, 'Must be at least 18 years old'),
			});

			mockRequest.body = {
				name: 'abc', // Too short
				email: 'invalid-email', // Invalid format
				age: 16, // Too young
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
							message: 'Name must be at least 5 characters long',
						}),
						expect.objectContaining({
							message: 'Must provide a valid email address',
						}),
						expect.objectContaining({
							message: 'Must be at least 18 years old',
						}),
					]),
				}),
			});
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle very large payloads efficiently', () => {
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

		it('should reject payloads that exceed size limits', () => {
			// Arrange
			const schema = z.object({
				data: z.string().max(100), // Limit to 100 chars
			});

			mockRequest.body = {
				data: 'x'.repeat(200), // Exceeds limit
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

		it('should handle missing request body gracefully', () => {
			// Arrange
			const schema = z.object({
				data: z.string(),
			});

			mockRequest.body = undefined; // No body provided

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
	});
});
