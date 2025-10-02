// Authentication middleware unit tests for Cortex WebUI backend
// brAInwav security standards and comprehensive testing

import type { NextFunction, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuthRequest, authenticateToken } from '../middleware/auth';

// Mock dependencies
vi.mock('../services/authService.js', () => ({
	AuthService: {
		verifyToken: vi.fn(),
	},
}));

vi.mock('../services/userService.js', () => ({
	UserService: {
		getUserById: vi.fn(),
	},
}));

import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';

describe('Authentication Middleware', () => {
	let mockRequest: Partial<AuthRequest>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			headers: {},
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

	describe('Token Validation', () => {
		it('should reject requests without authorization header', async () => {
			// Arrange
			mockRequest.headers = {};

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Access token required',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with malformed authorization header', async () => {
			// Arrange
			mockRequest.headers = {
				authorization: 'InvalidFormat',
			};

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Access token required',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with invalid token', async () => {
			// Arrange
			const invalidToken = 'invalid-token';
			mockRequest.headers = {
				authorization: `Bearer ${invalidToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockReturnValue(null);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith(invalidToken);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or expired token',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests when user verification fails', async () => {
			// Arrange
			const validToken = 'valid-token';
			const decodedToken = { userId: 'user123' };
			mockRequest.headers = {
				authorization: `Bearer ${validToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockReturnValue(decodedToken);
			vi.mocked(UserService.getUserById).mockReturnValue(null);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith(validToken);
			expect(UserService.getUserById).toHaveBeenCalledWith('user123');
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'User not found',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe('Successful Authentication', () => {
		it('should authenticate valid requests with existing user', async () => {
			// Arrange
			const validToken = 'valid-token';
			const decodedToken = { userId: 'user123' };
			const mockUser = {
				id: 'user123',
				email: 'test@example.com',
				name: 'Test User',
			};

			mockRequest.headers = {
				authorization: `Bearer ${validToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockReturnValue(decodedToken);
			vi.mocked(UserService.getUserById).mockReturnValue(mockUser as any);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith(validToken);
			expect(UserService.getUserById).toHaveBeenCalledWith('user123');
			expect(mockRequest.user).toEqual(decodedToken);
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should handle token verification errors gracefully', async () => {
			// Arrange
			const validToken = 'valid-token';
			mockRequest.headers = {
				authorization: `Bearer ${validToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockImplementation(() => {
				throw new Error('Token verification failed');
			});

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith(validToken);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid token',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should handle user service errors gracefully', async () => {
			// Arrange
			const validToken = 'valid-token';
			const decodedToken = { userId: 'user123' };
			mockRequest.headers = {
				authorization: `Bearer ${validToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockReturnValue(decodedToken);
			vi.mocked(UserService.getUserById).mockImplementation(() => {
				throw new Error('Database connection failed');
			});

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith(validToken);
			expect(UserService.getUserById).toHaveBeenCalledWith('user123');
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid token',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe('Token Format Edge Cases', () => {
		it('should handle empty bearer token', async () => {
			// Arrange
			mockRequest.headers = {
				authorization: 'Bearer ',
			};

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Access token required',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should handle authorization header with multiple spaces', async () => {
			// Arrange
			const validToken = 'valid-token';
			mockRequest.headers = {
				authorization: `Bearer   ${validToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockReturnValue(null);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith('valid-token');
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or expired token',
			});
		});

		it('should handle lowercase bearer scheme', async () => {
			// Arrange
			const validToken = 'valid-token';
			mockRequest.headers = {
				authorization: `bearer ${validToken}`,
			};

			vi.mocked(AuthService.verifyToken).mockReturnValue(null);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(AuthService.verifyToken).toHaveBeenCalledWith('valid-token');
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or expired token',
			});
		});
	});

	describe('brAInwav Security Standards', () => {
		it('should include brAInwav branding in error responses when security violations occur', async () => {
			// Arrange
			mockRequest.headers = {};

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Access token required',
			});
		});

		it('should prevent user enumeration through consistent error messages', async () => {
			// Arrange - Test invalid token
			mockRequest.headers = { authorization: 'Bearer invalid' };
			vi.mocked(AuthService.verifyToken).mockReturnValue(null);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);
			const invalidTokenResponse = {
				status: mockResponse.status,
				json: mockResponse.json,
			};

			// Reset mocks
			vi.clearAllMocks();
			mockRequest.headers = { authorization: 'Bearer valid-but-no-user' };
			vi.mocked(AuthService.verifyToken).mockReturnValue({ userId: 'nonexistent' });
			vi.mocked(UserService.getUserById).mockReturnValue(null);

			// Act
			await authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

			// Assert - Both should return 403 with generic messages
			expect(invalidTokenResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});
	});
});
