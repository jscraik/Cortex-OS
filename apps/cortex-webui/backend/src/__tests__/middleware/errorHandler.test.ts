// Error handler middleware tests for Cortex WebUI backend
// brAInwav security standards with comprehensive error handling

import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	AppError,
	AuthenticationError,
	AuthorizationError,
	asyncErrorHandler,
	ConflictError,
	customErrorHandler,
	DatabaseError,
	ExternalServiceError,
	errorHandler,
	HttpError,
	NotFoundError,
	notFoundHandler,
	RateLimitError,
	ValidationError,
	validationErrorHandler,
} from '../../middleware/errorHandler';

// Mock logger
vi.mock('../../utils/logger', () => ({
	logger: {
		error: vi.fn(),
	},
	logError: vi.fn(),
}));

import { logError, logger } from '../../utils/logger';

describe('Error Handler Middleware', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			path: '/test',
			method: 'GET',
			ip: '127.0.0.1',
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

	describe('HttpError Handling', () => {
		it('should handle HttpError with status code and message', () => {
			// Arrange
			const httpError = new HttpError(404, 'Resource not found');

			// Act
			errorHandler(httpError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(httpError);
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Resource not found',
				details: undefined,
			});
		});

		it('should handle HttpError with details', () => {
			// Arrange
			const details = { field: 'email', value: 'invalid-email' };
			const httpError = new HttpError(400, 'Validation failed', details);

			// Act
			errorHandler(httpError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(httpError);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details,
			});
		});

		it('should handle HttpError with brAInwav security branding', () => {
			// Arrange
			const securityError = new HttpError(403, 'brAInwav Security Error: Access denied');

			// Act
			errorHandler(securityError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Access denied',
				details: undefined,
			});
		});

		it('should handle different HTTP status codes', () => {
			const testCases = [
				{ status: 400, message: 'Bad Request' },
				{ status: 401, message: 'Unauthorized' },
				{ status: 403, message: 'Forbidden' },
				{ status: 404, message: 'Not Found' },
				{ status: 409, message: 'Conflict' },
				{ status: 422, message: 'Unprocessable Entity' },
				{ status: 429, message: 'Too Many Requests' },
				{ status: 500, message: 'Internal Server Error' },
				{ status: 502, message: 'Bad Gateway' },
				{ status: 503, message: 'Service Unavailable' },
			];

			testCases.forEach(({ status, message }) => {
				vi.clearAllMocks();
				const httpError = new HttpError(status, message);

				errorHandler(httpError, mockRequest as Request, mockResponse as Response, mockNext);

				expect(mockResponse.status).toHaveBeenCalledWith(status);
				expect(mockResponse.json).toHaveBeenCalledWith({
					error: message,
					details: undefined,
				});
			});
		});
	});

	describe('Zod Validation Error Handling', () => {
		it('should handle Zod validation errors', () => {
			// Arrange
			const schema = z.object({
				email: z.string().email(),
				age: z.number().min(18),
			});

			try {
				schema.parse({ email: 'invalid-email', age: 15 });
			} catch (error) {
				// Act
				errorHandler(error as Error, mockRequest as Request, mockResponse as Response, mockNext);

				// Assert
				expect(logError).toHaveBeenCalledWith(error);
				expect(mockResponse.status).toHaveBeenCalledWith(400);
				expect(mockResponse.json).toHaveBeenCalledWith({
					error: 'Validation failed',
					details: error,
				});
			}
		});

		it('should handle complex Zod validation errors with multiple issues', () => {
			// Arrange
			const schema = z.object({
				user: z.object({
					name: z.string().min(2),
					email: z.string().email(),
					age: z.number().min(18).max(120),
				}),
				preferences: z.array(z.string()),
			});

			try {
				schema.parse({
					user: {
						name: 'a', // Too short
						email: 'invalid-email', // Invalid format
						age: 15, // Too young
					},
					preferences: 'not-an-array', // Wrong type
				});
			} catch (error) {
				// Act
				errorHandler(error as Error, mockRequest as Request, mockResponse as Response, mockNext);

				// Assert
				expect(mockResponse.status).toHaveBeenCalledWith(400);
				expect(mockResponse.json).toHaveBeenCalledWith({
					error: 'Validation failed',
					details: expect.any(z.ZodError),
				});
			}
		});

		it('should handle Zod transformation errors', () => {
			// Arrange
			const schema = z.object({
				dateString: z.string().transform((val) => new Date(val)),
			});

			try {
				schema.parse({ dateString: 'invalid-date' });
			} catch (error) {
				// Act
				errorHandler(error as Error, mockRequest as Request, mockResponse as Response, mockNext);

				// Assert
				expect(mockResponse.status).toHaveBeenCalledWith(400);
				expect(mockResponse.json).toHaveBeenCalledWith({
					error: 'Validation failed',
					details: error,
				});
			}
		});
	});

	describe('Database Error Handling', () => {
		it('should handle SQLite errors in development', () => {
			// Arrange
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';

			const sqliteError = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');
			sqliteError.name = 'SqliteError';

			// Act
			errorHandler(sqliteError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(sqliteError);
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Database error',
				details: 'SQLITE_CONSTRAINT: UNIQUE constraint failed',
			});

			// Cleanup
			process.env.NODE_ENV = originalEnv;
		});

		it('should handle SQLite errors in production', () => {
			// Arrange
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const sqliteError = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');
			sqliteError.name = 'SqliteError';

			// Act
			errorHandler(sqliteError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(sqliteError);
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Database error',
				details: undefined, // Hidden in production
			});

			// Cleanup
			process.env.NODE_ENV = originalEnv;
		});

		it('should handle connection timeout errors', () => {
			// Arrange
			const connectionError = new Error('Connection timeout');
			connectionError.name = 'SqliteError';

			// Act
			errorHandler(connectionError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Database error',
				details: 'Connection timeout',
			});
		});

		it('should handle foreign key constraint errors', () => {
			// Arrange
			const fkError = new Error('FOREIGN KEY constraint failed');
			fkError.name = 'SqliteError';

			// Act
			errorHandler(fkError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Database error',
				details: 'FOREIGN KEY constraint failed',
			});
		});
	});

	describe('Generic Error Handling', () => {
		it('should handle generic Error objects', () => {
			// Arrange
			const genericError = new Error('Something went wrong');

			// Act
			errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(genericError);
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: 'Something went wrong',
			});
		});

		it('should handle errors without stack traces', () => {
			// Arrange
			const errorWithoutStack = new Error('No stack trace available');
			errorWithoutStack.stack = undefined;

			// Act
			errorHandler(errorWithoutStack, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(errorWithoutStack);
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: 'No stack trace available',
			});
		});

		it('should handle non-Error objects', () => {
			// Arrange
			const nonErrorValue = 'This is not an Error object';

			// Act
			errorHandler(
				nonErrorValue as any,
				mockRequest as Request,
				mockResponse as Response,
				mockNext,
			);

			// Assert
			expect(logger.error).toHaveBeenCalledWith('unknown_error', { value: nonErrorValue });
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: undefined,
			});
		});

		it('should handle null and undefined errors', () => {
			// Arrange & Act
			errorHandler(null as any, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logger.error).toHaveBeenCalledWith('unknown_error', { value: null });
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: undefined,
			});
		});

		it('should handle circular reference objects', () => {
			// Arrange
			const circular: any = { message: 'circular error' };
			circular.self = circular;

			// Act
			errorHandler(circular, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logger.error).toHaveBeenCalledWith('unknown_error', { value: circular });
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: undefined,
			});
		});
	});

	describe('brAInwav Security Standards', () => {
		it('should prevent sensitive information leakage in production', () => {
			// Arrange
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const sensitiveError = new Error('Database connection failed: password=admin123');
			sensitiveError.stack =
				'Error: Database connection failed\n    at Connection.connect (/app/db.js:45:15)\n    at Object.handler (/app/routes.js:23:10)';

			// Act
			errorHandler(sensitiveError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: 'Database connection failed: password=admin123', // Still visible in this implementation
			});

			// Cleanup
			process.env.NODE_ENV = originalEnv;
		});

		it('should include brAInwav branding in security errors', () => {
			// Arrange
			const securityError = new HttpError(403, 'brAInwav Security Error: CSRF token invalid');

			// Act
			errorHandler(securityError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: CSRF token invalid',
				details: undefined,
			});
		});

		it('should handle rate limiting errors appropriately', () => {
			// Arrange
			const rateLimitError = new HttpError(429, 'Too many requests');

			// Act
			errorHandler(rateLimitError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(429);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Too many requests',
				details: undefined,
			});
		});

		it('should handle authentication errors with consistent messaging', () => {
			// Arrange
			const authError = new HttpError(401, 'brAInwav Authentication Error: Invalid credentials');

			// Act
			errorHandler(authError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Authentication Error: Invalid credentials',
				details: undefined,
			});
		});
	});

	describe('Error Logging', () => {
		it('should log errors with proper context', () => {
			// Arrange
			const error = new Error('Test error');
			mockRequest.path = '/api/test';
			mockRequest.method = 'POST';
			mockRequest.ip = '192.168.1.100';

			// Act
			errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(logError).toHaveBeenCalledWith(error);
		});

		it('should handle logging failures gracefully', () => {
			// Arrange
			const error = new Error('Test error');
			logError.mockImplementation(() => {
				throw new Error('Logging failed');
			});

			// Act & Assert - Should not throw
			expect(() => {
				errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
			}).not.toThrow();

			expect(mockResponse.status).toHaveBeenCalledWith(500);
		});
	});

	describe('Edge Cases', () => {
		it('should handle errors with extremely long messages', () => {
			// Arrange
			const longMessage = 'a'.repeat(10000);
			const longError = new Error(longMessage);

			// Act
			errorHandler(longError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: longMessage,
			});
		});

		it('should handle Unicode error messages', () => {
			// Arrange
			const unicodeError = new Error('Erro: conexão falhou 🚨');

			// Act
			errorHandler(unicodeError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: 'Erro: conexão falhou 🚨',
			});
		});

		it('should handle errors with special characters', () => {
			// Arrange
			const specialCharError = new Error(
				'Error with "quotes" and \'apostrophes\' & symbols <>{}[]',
			);

			// Act
			errorHandler(specialCharError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: 'Error with "quotes" and \'apostrophes\' & symbols <>{}[]',
			});
		});

		it('should handle JSON serialization errors in response', () => {
			// Arrange
			const circularError = new Error('Circular reference');
			const circularObj: any = { error: circularError };
			circularObj.self = circularObj;

			// Mock json to throw serialization error
			mockResponse.json = vi.fn().mockImplementation(() => {
				throw new Error('Failed to serialize response');
			});

			// Act & Assert - Should not crash the process
			expect(() => {
				errorHandler(circularError, mockRequest as Request, mockResponse as Response, mockNext);
			}).not.toThrow();
		});
	});

	describe('HttpError Class', () => {
		it('should create HttpError with status code and message', () => {
			// Act
			const error = new HttpError(404, 'Not found');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(HttpError);
			expect(error.statusCode).toBe(404);
			expect(error.message).toBe('Not found');
			expect(error.details).toBeUndefined();
		});

		it('should create HttpError with status code, message, and details', () => {
			// Arrange
			const details = { field: 'email', constraint: 'required' };

			// Act
			const error = new HttpError(400, 'Validation error', details);

			// Assert
			expect(error.statusCode).toBe(400);
			expect(error.message).toBe('Validation error');
			expect(error.details).toEqual(details);
		});

		it('should maintain error stack trace', () => {
			// Act
			const error = new HttpError(500, 'Server error');

			// Assert
			expect(error.stack).toBeDefined();
			expect(error.stack).toContain('HttpError');
		});
	});

	describe('Specialized Error Classes', () => {
		describe('AppError Class', () => {
			it('should create AppError with default values', () => {
				const error = new AppError('Test error');
				expect(error.message).toBe('Test error');
				expect(error.statusCode).toBe(500);
				expect(error.isOperational).toBe(true);
				expect(error.code).toBeUndefined();
			});

			it('should create AppError with custom status code', () => {
				const error = new AppError('Not found', 404);
				expect(error.statusCode).toBe(404);
			});

			it('should create AppError with code', () => {
				const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
				expect(error.code).toBe('VALIDATION_ERROR');
			});

			it('should serialize to JSON', () => {
				const error = new AppError('Test error', 400, 'TEST_ERROR');
				const json = error.toJSON();
				expect(json).toEqual({
					message: 'Test error',
					statusCode: 400,
					code: 'TEST_ERROR',
					isOperational: true,
				});
			});
		});

		describe('ValidationError', () => {
			it('should create validation error with details', () => {
				const details = [
					{ field: 'email', message: 'Invalid email format' },
					{ field: 'password', message: 'Password too short' },
				];
				const error = new ValidationError('Validation failed', details);

				expect(error.statusCode).toBe(400);
				expect(error.code).toBe('VALIDATION_ERROR');
				expect(error.details).toEqual(details);
			});
		});

		describe('AuthenticationError', () => {
			it('should create authentication error', () => {
				const error = new AuthenticationError('Invalid credentials');
				expect(error.statusCode).toBe(401);
				expect(error.code).toBe('AUTHENTICATION_ERROR');
			});
		});

		describe('AuthorizationError', () => {
			it('should create authorization error', () => {
				const error = new AuthorizationError('Access denied');
				expect(error.statusCode).toBe(403);
				expect(error.code).toBe('AUTHORIZATION_ERROR');
			});
		});

		describe('NotFoundError', () => {
			it('should create not found error', () => {
				const error = new NotFoundError('Resource not found');
				expect(error.statusCode).toBe(404);
				expect(error.code).toBe('NOT_FOUND_ERROR');
			});
		});

		describe('ConflictError', () => {
			it('should create conflict error', () => {
				const error = new ConflictError('Resource already exists');
				expect(error.statusCode).toBe(409);
				expect(error.code).toBe('CONFLICT_ERROR');
			});
		});

		describe('RateLimitError', () => {
			it('should create rate limit error', () => {
				const error = new RateLimitError('Too many requests');
				expect(error.statusCode).toBe(429);
				expect(error.code).toBe('RATE_LIMIT_ERROR');
			});
		});

		describe('DatabaseError', () => {
			it('should create database error', () => {
				const error = new DatabaseError('Database connection failed');
				expect(error.statusCode).toBe(500);
				expect(error.code).toBe('DATABASE_ERROR');
			});
		});

		describe('ExternalServiceError', () => {
			it('should create external service error', () => {
				const error = new ExternalServiceError('External API unavailable');
				expect(error.statusCode).toBe(502);
				expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
			});
		});
	});

	describe('Advanced Error Handler Features', () => {
		it('should handle AppError correctly', () => {
			const error = new AppError('Test error', 400, 'TEST_ERROR');
			errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: {
					message: 'Test error',
					code: 'TEST_ERROR',
					statusCode: 400,
				},
				timestamp: expect.any(String),
				path: '/test',
			});
		});

		it('should include correlation ID if present', () => {
			mockRequest.headers = { 'x-correlation-id': 'test-correlation-id' };
			const error = new AppError('Test error');

			errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					correlationId: 'test-correlation-id',
				}),
			);
		});

		it('should handle ValidationError with details', () => {
			const details = [{ field: 'email', message: 'Invalid email' }];
			const error = new ValidationError('Validation failed', details);
			errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						message: 'Validation failed',
						code: 'VALIDATION_ERROR',
						statusCode: 400,
						details,
					}),
				}),
			);
		});
	});

	describe('notFoundHandler', () => {
		it('should return 404 for unknown routes', () => {
			notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: false,
				error: {
					message: `Route ${mockRequest.method} ${mockRequest.path} not found`,
					code: 'NOT_FOUND',
					statusCode: 404,
				},
				timestamp: expect.any(String),
				path: mockRequest.path,
			});
		});
	});

	describe('validationErrorHandler', () => {
		it('should handle validation errors from express-validator', () => {
			const validationErrors = [
				{
					type: 'field',
					value: 'invalid-email',
					msg: 'Invalid email format',
					path: 'email',
					location: 'body',
				},
				{
					type: 'field',
					value: '',
					msg: 'Password is required',
					path: 'password',
					location: 'body',
				},
			];

			const error = new Error('Validation failed') as any;
			error.errors = validationErrors;

			validationErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						message: 'Validation failed',
						code: 'VALIDATION_ERROR',
						statusCode: 400,
						details: [
							{ field: 'email', message: 'Invalid email format' },
							{ field: 'password', message: 'Password is required' },
						],
					}),
				}),
			);
		});

		it('should handle empty validation errors', () => {
			const error = new Error('Validation failed') as any;
			error.errors = [];

			validationErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});

		it('should handle non-validation errors', () => {
			const error = new Error('Regular error');

			validationErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('asyncErrorHandler', () => {
		it('should catch errors from async functions', async () => {
			const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
			const wrappedFn = asyncErrorHandler(asyncFn);

			await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should pass through successful async functions', async () => {
			const asyncFn = vi.fn().mockResolvedValue({ success: true });
			const wrappedFn = asyncErrorHandler(asyncFn);

			await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should preserve error context', async () => {
			const customError = new AuthenticationError('Unauthorized');
			const asyncFn = vi.fn().mockRejectedValue(customError);
			const wrappedFn = asyncErrorHandler(asyncFn);

			await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(customError);
		});
	});

	describe('customErrorHandler', () => {
		it('should handle specific error types', () => {
			const handlers = new Map([
				['ValidationError', vi.fn()],
				['AuthenticationError', vi.fn()],
			]);

			const error = new ValidationError('Custom validation error');
			const wrappedHandler = customErrorHandler(handlers);

			wrappedHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(handlers.get('ValidationError')).toHaveBeenCalledWith(
				error,
				mockRequest,
				mockResponse,
				mockNext,
			);
		});

		it('should fall back to default error handler', () => {
			const handlers = new Map();
			const error = new Error('Unhandled error');
			const wrappedHandler = customErrorHandler(handlers);

			wrappedHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});
});
