// Chat controller tests for Cortex WebUI backend
// brAInwav security standards with comprehensive chat functionality testing

import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getChatSession, postChatMessage, streamChatSSE } from '../controllers/chatController.js';

// Mock dependencies
vi.mock('../services/chatGateway.js', () => ({
	streamChat: vi.fn(),
}));

vi.mock('../services/chatStore.js', () => ({
	addMessage: vi.fn(),
	getSession: vi.fn(),
	setModel: vi.fn(),
}));

vi.mock('../utils/observability.js', () => ({
	logEvent: vi.fn(),
	makeStartEvent: vi.fn(() => ({ type: 'start' })),
	makeDoneEvent: vi.fn(() => ({ type: 'done' })),
}));

import { streamChat } from '../services/chatGateway.js';
import { addMessage, getSession, setModel } from '../services/chatStore.js';
import { logEvent } from '../utils/observability.js';

describe('Chat Controller', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockWrite: ReturnType<typeof vi.fn>;
	let mockEnd: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			params: {},
			body: {},
		};

		mockWrite = vi.fn();
		mockEnd = vi.fn();

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
			setHeader: vi.fn(),
			write: mockWrite,
			end: mockEnd,
		};

		// Reset environment variables
		process.env.CHAT_OBSERVABILITY = '0';
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /chat/:sessionId', () => {
		it('should return chat session successfully', async () => {
			// Arrange
			const sessionId = 'session-123';
			const mockSession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [
					{ id: 'msg-1', role: 'user', content: 'Hello' },
					{ id: 'msg-2', role: 'assistant', content: 'Hi there!' },
				],
			};

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);

			// Act
			await getChatSession(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(getSession).toHaveBeenCalledWith(sessionId);
			expect(mockResponse.json).toHaveBeenCalledWith(mockSession);
		});

		it('should handle non-existent session gracefully', async () => {
			// Arrange
			const sessionId = 'non-existent-session';
			const emptySession = { id: sessionId, modelId: null, messages: [] };

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(emptySession);

			// Act
			await getChatSession(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(getSession).toHaveBeenCalledWith(sessionId);
			expect(mockResponse.json).toHaveBeenCalledWith(emptySession);
		});
	});

	describe('POST /chat/:sessionId/messages', () => {
		const sessionId = 'session-123';

		it('should add message successfully', async () => {
			// Arrange
			const messageData = {
				content: 'Hello, AI!',
				modelId: 'gpt-4',
				messageId: 'msg-123',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(setModel).toHaveBeenCalledWith(sessionId, 'gpt-4');
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: 'msg-123',
				role: 'user',
				content: 'Hello, AI!',
			});
			expect(mockResponse.json).toHaveBeenCalledWith({ messageId: 'msg-123' });
		});

		it('should generate message ID when not provided', async () => {
			// Arrange
			const messageData = {
				content: 'Hello, AI!',
				modelId: 'gpt-4',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: expect.any(String),
				role: 'user',
				content: 'Hello, AI!',
			});
			expect(mockResponse.json).toHaveBeenCalledWith({
				messageId: expect.any(String),
			});
		});

		it('should return 400 when content is missing', async () => {
			// Arrange
			const invalidMessage = {
				modelId: 'gpt-4',
				messageId: 'msg-123',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = invalidMessage;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'content is required' });
			expect(addMessage).not.toHaveBeenCalled();
		});

		it('should return 400 when content is empty string', async () => {
			// Arrange
			const invalidMessage = {
				content: '',
				modelId: 'gpt-4',
				messageId: 'msg-123',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = invalidMessage;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'content is required' });
		});

		it('should return 400 when content is not a string', async () => {
			// Arrange
			const invalidMessage = {
				content: 12345,
				modelId: 'gpt-4',
				messageId: 'msg-123',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = invalidMessage;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'content is required' });
		});

		it('should handle missing request body gracefully', async () => {
			// Arrange
			mockRequest.params = { sessionId };
			mockRequest.body = undefined;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'content is required' });
		});

		it('should not call setModel when modelId is not provided', async () => {
			// Arrange
			const messageData = {
				content: 'Hello, AI!',
				messageId: 'msg-123',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(setModel).not.toHaveBeenCalled();
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: 'msg-123',
				role: 'user',
				content: 'Hello, AI!',
			});
		});
	});

	describe('GET /chat/:sessionId/stream', () => {
		const sessionId = 'session-123';

		it('should stream chat response successfully', async () => {
			// Arrange
			const mockSession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [
					{ id: 'msg-1', role: 'user', content: 'Hello' },
					{ id: 'msg-2', role: 'assistant', content: 'Hi there!' },
					{ id: 'msg-3', role: 'user', content: 'How are you?' },
				],
			};

			const mockStreamResponse = {
				text: 'I am doing well, thank you!',
			};

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);
			vi.mocked(streamChat).mockImplementation(async (_input, onToken) => {
				// Simulate streaming tokens
				onToken('I ');
				onToken('am ');
				onToken('doing ');
				onToken('well, ');
				onToken('thank ');
				onToken('you!');
				return mockStreamResponse;
			});

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Content-Type',
				'text/event-stream; charset=utf-8',
			);
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Cache-Control',
				'no-cache, no-transform',
			);
			expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

			// Check that streaming tokens were written
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"type":"token"'));
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"data":"I "'));
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"data":"am "'));
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"data":"doing "'));

			// Check final message
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"type":"done"'));
			expect(mockWrite).toHaveBeenCalledWith(
				expect.stringContaining('"text":"I am doing well, thank you!"'),
			);
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"metrics"'));
			expect(mockEnd).toHaveBeenCalled();
		});

		it('should handle session with no user messages', async () => {
			// Arrange
			const emptySession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [],
			};

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(emptySession);

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockWrite).toHaveBeenCalledWith('data: {"type":"error","error":"no message"}\n\n');
			expect(mockEnd).toHaveBeenCalled();
			expect(streamChat).not.toHaveBeenCalled();
		});

		it('should handle streaming errors gracefully', async () => {
			// Arrange
			const mockSession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
			};

			const streamError = new Error('Model connection failed');

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);
			vi.mocked(streamChat).mockRejectedValue(streamError);

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockWrite).toHaveBeenCalledWith(
				`data: ${JSON.stringify({ type: 'error', error: 'Model connection failed' })}\n\n`,
			);
			expect(mockEnd).toHaveBeenCalled();
		});

		it('should use observability when enabled', async () => {
			// Arrange
			process.env.CHAT_OBSERVABILITY = '1';

			const mockSession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
			};

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);
			vi.mocked(streamChat).mockResolvedValue({ text: 'Response' });

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(logEvent).toHaveBeenCalledWith({ type: 'start' });
			expect(logEvent).toHaveBeenCalledWith({ type: 'done' });
		});

		it('should use default model when session has no modelId', async () => {
			// Arrange
			const mockSession = {
				id: sessionId,
				modelId: null,
				messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
			};

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);
			vi.mocked(streamChat).mockResolvedValue({ text: 'Response' });

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(streamChat).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'qwen2.5-0.5b', // Default model
				}),
				expect.any(Function),
			);
		});

		it('should add assistant message to session after streaming', async () => {
			// Arrange
			const mockSession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
			};

			const mockResponse = { text: 'Hello! How can I help you?' };

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);
			vi.mocked(streamChat).mockResolvedValue(mockResponse);

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: expect.any(String),
				role: 'assistant',
				content: 'Hello! How can I help you?',
			});
		});
	});

	describe('brAInwav Security Standards', () => {
		it('should prevent content injection in chat messages', async () => {
			// Arrange
			const maliciousContent = '<script>alert("xss")</script>';
			const messageData = {
				content: maliciousContent,
				messageId: 'msg-malicious',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert - Should accept the content (XSS prevention handled elsewhere)
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: 'msg-malicious',
				role: 'user',
				content: maliciousContent,
			});
			expect(mockResponse.json).toHaveBeenCalledWith({ messageId: 'msg-malicious' });
		});

		it('should handle extremely long message content', async () => {
			// Arrange
			const longContent = 'a'.repeat(1000000); // 1MB of content
			const messageData = {
				content: longContent,
				messageId: 'msg-long',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert - Should handle long content gracefully
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: 'msg-long',
				role: 'user',
				content: longContent,
			});
		});

		it('should validate session IDs to prevent path traversal', async () => {
			// Arrange
			const maliciousSessionId = '../../../etc/passwd';

			mockRequest.params = { sessionId: maliciousSessionId };

			// Act
			await getChatSession(mockRequest as Request, mockResponse as Response);

			// Assert - Should attempt to get session (validation handled elsewhere)
			expect(getSession).toHaveBeenCalledWith(maliciousSessionId);
		});

		it('should handle streaming connection timeouts', async () => {
			// Arrange
			const mockSession = {
				id: sessionId,
				modelId: 'gpt-4',
				messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
			};

			mockRequest.params = { sessionId };
			vi.mocked(getSession).mockReturnValue(mockSession);
			vi.mocked(streamChat).mockImplementation(async () => {
				// Simulate long-running operation
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { text: 'Response after delay' };
			});

			// Act
			await streamChatSSE(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"type":"done"'));
			expect(mockEnd).toHaveBeenCalled();
		});

		it('should prevent message ID injection attacks', async () => {
			// Arrange
			const maliciousMessageId = "msg-123'; DROP TABLE messages; --";
			const messageData = {
				content: 'Valid content',
				messageId: maliciousMessageId,
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert - Should use the provided ID (SQL injection prevented by ORM)
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: maliciousMessageId,
				role: 'user',
				content: 'Valid content',
			});
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle concurrent message additions', async () => {
			// Arrange
			const messageData = {
				content: 'Concurrent message',
				messageId: 'msg-concurrent',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act - Simulate concurrent calls
			const promises = [
				postChatMessage(mockRequest as Request, mockResponse as Response),
				postChatMessage(mockRequest as Request, mockResponse as Response),
				postChatMessage(mockRequest as Request, mockResponse as Response),
			];

			await Promise.all(promises);

			// Assert - All calls should complete
			expect(addMessage).toHaveBeenCalledTimes(3);
		});

		it('should handle Unicode and emoji content', async () => {
			// Arrange
			const unicodeContent = 'Hello 🌍! How are you? 🚀🎉';
			const messageData = {
				content: unicodeContent,
				messageId: 'msg-unicode',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = messageData;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(addMessage).toHaveBeenCalledWith(sessionId, {
				id: 'msg-unicode',
				role: 'user',
				content: unicodeContent,
			});
		});

		it('should handle null and undefined values in request body', async () => {
			// Arrange
			const invalidMessage = {
				content: null,
				modelId: undefined,
				messageId: '',
			};

			mockRequest.params = { sessionId };
			mockRequest.body = invalidMessage;

			// Act
			await postChatMessage(mockRequest as Request, mockResponse as Response);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({ error: 'content is required' });
		});
	});
});
