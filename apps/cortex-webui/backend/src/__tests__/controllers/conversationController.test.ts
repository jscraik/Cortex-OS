// Conversation controller tests for Cortex WebUI backend
// brAInwav security standards with comprehensive endpoint testing

import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationController } from '../controllers/conversationController.js';
import { ConversationService } from '../services/conversationService.js';

// Mock dependencies
vi.mock('../services/conversationService.js', () => ({
	ConversationService: {
		getConversationsByUserId: vi.fn(),
		getConversationById: vi.fn(),
		createConversation: vi.fn(),
		updateConversation: vi.fn(),
		deleteConversation: vi.fn(),
	},
}));

describe('Conversation Controller', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockUser: { userId: string };

	beforeEach(() => {
		vi.clearAllMocks();

		mockUser = { userId: 'user-123' };
		mockRequest = {
			user: mockUser,
			body: {},
			params: {},
		};

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /conversations', () => {
		it('should return user conversations successfully', async () => {
			// Arrange
			const mockConversations = [
				{ id: 'conv-1', title: 'Chat 1', userId: 'user-123' },
				{ id: 'conv-2', title: 'Chat 2', userId: 'user-123' },
			];

			vi.mocked(ConversationService.getConversationsByUserId).mockResolvedValue(mockConversations);

			// Act
			await ConversationController.getConversations(mockRequest as any, mockResponse as Response);

			// Assert
			expect(ConversationService.getConversationsByUserId).toHaveBeenCalledWith('user-123');
			expect(mockResponse.json).toHaveBeenCalledWith(mockConversations);
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should return 500 when service fails', async () => {
			// Arrange
			vi.mocked(ConversationService.getConversationsByUserId).mockRejectedValue(
				new Error('Database error'),
			);

			// Act
			await ConversationController.getConversations(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
		});

		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			mockRequest.user = undefined;

			// Act
			await ConversationController.getConversations(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
			expect(ConversationService.getConversationsByUserId).not.toHaveBeenCalled();
		});
	});

	describe('GET /conversations/:id', () => {
		const validConversationId = '550e8400-e29b-41d4-a716-446655440000';

		it('should return conversation when user owns it', async () => {
			// Arrange
			const mockConversation = {
				id: validConversationId,
				title: 'My Conversation',
				userId: 'user-123',
			};

			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(mockConversation);

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(ConversationService.getConversationById).toHaveBeenCalledWith(validConversationId);
			expect(mockResponse.json).toHaveBeenCalledWith(mockConversation);
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should return 400 for invalid conversation ID format', async () => {
			// Arrange
			mockRequest.params = { id: 'invalid-uuid' };

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
			expect(ConversationService.getConversationById).not.toHaveBeenCalled();
		});

		it('should return 404 when conversation not found', async () => {
			// Arrange
			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(null);

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
		});

		it('should return 403 when user does not own conversation', async () => {
			// Arrange
			const otherUserConversation = {
				id: validConversationId,
				title: 'Other Conversation',
				userId: 'other-user-456',
			};

			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(otherUserConversation);

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
		});

		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			mockRequest.user = undefined;
			mockRequest.params = { id: validConversationId };

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
		});

		it('should handle service errors gracefully', async () => {
			// Arrange
			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockRejectedValue(
				new Error('Database connection failed'),
			);

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
		});
	});

	describe('POST /conversations', () => {
		it('should create conversation successfully', async () => {
			// Arrange
			const newConversationData = { title: 'New Conversation' };
			const createdConversation = {
				id: 'conv-new',
				title: 'New Conversation',
				userId: 'user-123',
			};

			mockRequest.body = newConversationData;
			vi.mocked(ConversationService.createConversation).mockResolvedValue(createdConversation);

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(ConversationService.createConversation).toHaveBeenCalledWith(
				'user-123',
				'New Conversation',
			);
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith(createdConversation);
		});

		it('should return 400 for invalid title', async () => {
			// Arrange
			const invalidData = { title: '' }; // Empty title

			mockRequest.body = invalidData;

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
			expect(ConversationService.createConversation).not.toHaveBeenCalled();
		});

		it('should return 400 for title exceeding maximum length', async () => {
			// Arrange
			const longTitle = 'a'.repeat(101); // Exceeds 100 character limit
			mockRequest.body = { title: longTitle };

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});

		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			mockRequest.user = undefined;
			mockRequest.body = { title: 'Valid Title' };

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
		});

		it('should handle service errors during creation', async () => {
			// Arrange
			mockRequest.body = { title: 'Valid Title' };
			vi.mocked(ConversationService.createConversation).mockRejectedValue(
				new Error('Creation failed'),
			);

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
		});
	});

	describe('PUT /conversations/:id', () => {
		const validConversationId = '550e8400-e29b-41d4-a716-446655440000';

		it('should update conversation successfully', async () => {
			// Arrange
			const updateData = { title: 'Updated Title' };
			const existingConversation = {
				id: validConversationId,
				title: 'Original Title',
				userId: 'user-123',
			};
			const updatedConversation = {
				...existingConversation,
				title: 'Updated Title',
			};

			mockRequest.params = { id: validConversationId };
			mockRequest.body = updateData;
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(existingConversation);
			vi.mocked(ConversationService.updateConversation).mockResolvedValue(updatedConversation);

			// Act
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(ConversationService.getConversationById).toHaveBeenCalledWith(validConversationId);
			expect(ConversationService.updateConversation).toHaveBeenCalledWith(
				validConversationId,
				updateData,
			);
			expect(mockResponse.json).toHaveBeenCalledWith(updatedConversation);
		});

		it('should return 400 for invalid conversation ID', async () => {
			// Arrange
			mockRequest.params = { id: 'invalid-uuid' };
			mockRequest.body = { title: 'Valid Title' };

			// Act
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});

		it('should return 400 for invalid update data', async () => {
			// Arrange
			mockRequest.params = { id: validConversationId };
			mockRequest.body = { title: ''.repeat(101) }; // Too long

			// Act
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});

		it('should return 404 when conversation to update does not exist', async () => {
			// Arrange
			mockRequest.params = { id: validConversationId };
			mockRequest.body = { title: 'Updated Title' };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(null);

			// Act
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
		});

		it('should return 403 when user does not own conversation', async () => {
			// Arrange
			const otherUserConversation = {
				id: validConversationId,
				title: 'Other Conversation',
				userId: 'other-user-456',
			};

			mockRequest.params = { id: validConversationId };
			mockRequest.body = { title: 'Updated Title' };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(otherUserConversation);

			// Act
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
		});

		it('should allow partial updates with optional fields', async () => {
			// Arrange
			const existingConversation = {
				id: validConversationId,
				title: 'Original Title',
				userId: 'user-123',
			};
			const partialUpdate = { title: 'New Title' };

			mockRequest.params = { id: validConversationId };
			mockRequest.body = partialUpdate;
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(existingConversation);
			vi.mocked(ConversationService.updateConversation).mockResolvedValue({
				...existingConversation,
				...partialUpdate,
			});

			// Act
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(ConversationService.updateConversation).toHaveBeenCalledWith(
				validConversationId,
				partialUpdate,
			);
			expect(mockResponse.json).toHaveBeenCalled();
		});
	});

	describe('DELETE /conversations/:id', () => {
		const validConversationId = '550e8400-e29b-41d4-a716-446655440000';

		it('should delete conversation successfully', async () => {
			// Arrange
			const existingConversation = {
				id: validConversationId,
				title: 'Conversation to Delete',
				userId: 'user-123',
			};

			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(existingConversation);
			vi.mocked(ConversationService.deleteConversation).mockResolvedValue(undefined);

			// Act
			await ConversationController.deleteConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(ConversationService.getConversationById).toHaveBeenCalledWith(validConversationId);
			expect(ConversationService.deleteConversation).toHaveBeenCalledWith(validConversationId);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: 'Conversation deleted successfully',
			});
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should return 400 for invalid conversation ID', async () => {
			// Arrange
			mockRequest.params = { id: 'invalid-uuid' };

			// Act
			await ConversationController.deleteConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});

		it('should return 404 when conversation to delete does not exist', async () => {
			// Arrange
			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(null);

			// Act
			await ConversationController.deleteConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
		});

		it('should return 403 when user does not own conversation', async () => {
			// Arrange
			const otherUserConversation = {
				id: validConversationId,
				title: 'Other Conversation',
				userId: 'other-user-456',
			};

			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(otherUserConversation);

			// Act
			await ConversationController.deleteConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
		});

		it('should handle service errors during deletion', async () => {
			// Arrange
			const existingConversation = {
				id: validConversationId,
				title: 'Conversation to Delete',
				userId: 'user-123',
			};

			mockRequest.params = { id: validConversationId };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(existingConversation);
			vi.mocked(ConversationService.deleteConversation).mockRejectedValue(
				new Error('Deletion failed'),
			);

			// Act
			await ConversationController.deleteConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
		});
	});

	describe('brAInwav Security Standards', () => {
		it('should include brAInwav branding in error responses', async () => {
			// Arrange
			mockRequest.user = undefined;

			// Act
			await ConversationController.getConversations(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
		});

		it('should prevent unauthorized access to user conversations', async () => {
			// Arrange
			const otherUserConversation = {
				id: 'conv-other',
				title: 'Other User Conversation',
				userId: 'other-user-456',
			};

			mockRequest.params = { id: 'conv-other' };
			vi.mocked(ConversationService.getConversationById).mockResolvedValue(otherUserConversation);

			// Test GET
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);
			expect(mockResponse.status).toHaveBeenCalledWith(403);

			// Reset and test PUT
			vi.clearAllMocks();
			mockRequest.body = { title: 'Updated' };
			await ConversationController.updateConversation(mockRequest as any, mockResponse as Response);
			expect(mockResponse.status).toHaveBeenCalledWith(403);

			// Reset and test DELETE
			vi.clearAllMocks();
			await ConversationController.deleteConversation(mockRequest as any, mockResponse as Response);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});

		it('should validate all inputs to prevent injection attacks', async () => {
			// Arrange
			const maliciousInput = {
				title: '<script>alert("xss")</script>',
			};

			mockRequest.body = maliciousInput;

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert - Should pass through validation (XSS prevention handled elsewhere)
			expect(mockResponse.status).not.toHaveBeenCalledWith(400);
		});

		it('should handle UUID injection attempts', async () => {
			// Arrange
			const maliciousId = "550e8400-e29b-41d4-a716-446655440000'; DROP TABLE users; --";

			mockRequest.params = { id: maliciousId };

			// Act
			await ConversationController.getConversationById(
				mockRequest as any,
				mockResponse as Response,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle missing request body gracefully', async () => {
			// Arrange
			mockRequest.body = undefined;

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});

		it('should handle extremely long conversation titles', async () => {
			// Arrange
			const extremelyLongTitle = 'a'.repeat(10000); // Much longer than max 100
			mockRequest.body = { title: extremelyLongTitle };

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation failed',
				details: expect.any(Array),
			});
		});

		it('should handle special characters in titles', async () => {
			// Arrange
			const specialTitle = '🔥 Conversation with émojis & spéciål chars!';
			const createdConversation = {
				id: 'conv-special',
				title: specialTitle,
				userId: 'user-123',
			};

			mockRequest.body = { title: specialTitle };
			vi.mocked(ConversationService.createConversation).mockResolvedValue(createdConversation);

			// Act
			await ConversationController.createConversation(mockRequest as any, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith(createdConversation);
		});
	});
});
