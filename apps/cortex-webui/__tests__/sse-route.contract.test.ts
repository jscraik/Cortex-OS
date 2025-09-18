import { describe, expect, it, vi } from 'vitest';

// Mock chat-store and gateway
vi.mock('../backend/src/services/chatStore', () => ({
	getSession: vi.fn().mockReturnValue({
		modelId: 'test-model',
		messages: [{ id: 'm1', role: 'user', content: 'Hi' }],
	}),
	addMessage: vi.fn(),
}));

vi.mock('../backend/src/services/chatGateway', () => ({
	streamChat: vi.fn(async (_params: unknown, onTok: (t: string) => void) => {
		onTok('He');
		onTok('llo');
		return { text: 'Hello' };
	}),
}));

describe('SSE stream route contract', () => {
	it('emits token(s) then done', async () => {
		// Import the actual controller function
		const { streamChatSSE } = await import('../backend/src/controllers/chatController');

		// Create mock request and response objects
		const req = {
			params: { sessionId: 's1' },
		};

		const res = {
			setHeader: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
		};

		// Call the controller function
		await streamChatSSE(req as any, res as any);

		// Check that the response methods were called
		expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream; charset=utf-8');
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-transform');
		expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

		// Check that write was called with token and done events
		const writeCalls = res.write.mock.calls;
		const tokenCall = writeCalls.find((call) => call[0].includes('"type":"token"'));
		const doneCall = writeCalls.find((call) => call[0].includes('"type":"done"'));

		expect(tokenCall).toBeDefined();
		expect(doneCall).toBeDefined();
	});
});
