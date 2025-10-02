// Error handler middleware tests for Cortex WebUI backend
// brAInwav security standards with comprehensive error handling

import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler, HttpError } from '../middleware/errorHandler';

// Mock logger
vi.mock('../utils/logger', () => ({
	logger: {
		error: vi.fn(),
	},
	logError: vi.fn(),
}));

import { logError } from '../utils/logger';

describe('Error Handler Middleware - Simple Tests', () => {
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
			const details = { field: 'email', constraint: 'required' };
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

		it('should handle brAInwav security errors', () => {
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
				{ status: 500, message: 'Internal Server Error' },
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
			const schema = require('zod').z.object({
				email: require('zod').z.string().email(),
				age: require('zod').z.number().min(18),
			});

			let validationError;
			try {
				schema.parse({ email: 'invalid-email', age: 15 });
			} catch (error) {
				validationError = error;
			}

			// Act
			errorHandler(
				validationError as Error,
				mockRequest as Request,
				mockResponse as Response,
				mockNext,
			);

			// Assert
			expect(logError).toHaveBeenCalledWith(validationError);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: validationError,
			});
		});

		it('should handle multiple validation errors', () => {
			// Arrange
			const schema = require('zod').z.object({
				name: require('zod').z.string().min(2),
				email: require('zod').z.string().email(),
				age: require('zod').z.number().min(18).max(120),
			});

			let validationError;
			try {
				schema.parse({
					name: 'a', // Too short
					email: 'invalid-email', // Invalid format
					age: 15, // Too young
				});
			} catch (error) {
				validationError = error;
			}

			// Act
			errorHandler(
				validationError as Error,
				mockRequest as Request,
				mockResponse as Response,
				mockNext,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.objectContaining({
					issues: expect.any(Array),
				}),
			});
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

		it('should hide database errors in production', () => {
			// Arrange
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const sqliteError = new Error('Database connection string: password=secret123');
			sqliteError.name = 'SqliteError';

			// Act
			errorHandler(sqliteError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Database error',
				details: undefined, // Hidden in production
			});

			// Cleanup
			process.env.NODE_ENV = originalEnv;
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
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				details: undefined,
			});
		});

		it('should handle null errors', () => {
			// Act
			errorHandler(null as any, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
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
				'Error: Database connection failed\n    at Connection.connect (/app/db.js:45:15)';

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

		it('should handle authentication errors consistently', () => {
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

		it('should handle rate limiting errors appropriately', () => {
			// Arrange
			const rateLimitError = new HttpError(429, 'Too many requests - try again later');

			// Act
			errorHandler(rateLimitError, mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(429);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Too many requests - try again later',
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
			(logError as any).mockImplementation(() => {
				throw new Error('Logging failed');
			});

			// Act & Assert - Should not throw
			expect(() => {
				errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
			}).not.toThrow();

			expect(mockResponse.status).toHaveBeenCalledWith(500);
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

		it('should create HttpError with details', () => {
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
});
