/**
 * Debug test to find the hanging issue
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CortexWebhookServer } from '../server/webhook-server.js';

// Create a fully mocked AI app without using the real class
const createMockAiApp = () => {
	return {
		queueTask: vi.fn().mockResolvedValue('test-task-id'),
		queueSize: 0,
		activeTaskCount: 0,
		rateLimit: { remaining: 5000, resetTime: new Date() },
	} as any;
};

describe('Debug Fully Mocked Test', () => {
	let server: CortexWebhookServer;
	let mockAiApp: any;
	const testSecret = 'test-webhook-secret';

	beforeEach(() => {
		mockAiApp = createMockAiApp();
		server = new CortexWebhookServer(mockAiApp, testSecret);

		// Reset all mocks
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await server.stop();
	});

	it('should initialize with correct parameters', () => {
		expect(server).toBeInstanceOf(CortexWebhookServer);
		expect(server.queueSize).toBe(0);
	});
});
