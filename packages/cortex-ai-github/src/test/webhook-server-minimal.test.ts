import { describe, expect, it, vi } from 'vitest';
import { CortexWebhookServer } from '../server/webhook-server.js';

describe('CortexWebhookServer - Minimal Test', () => {
	it('should instantiate with minimal mock', () => {
		const mockAiApp = {
			queueTask: vi.fn(),
			queueSize: 0,
		};

		expect(() => {
			const server = new CortexWebhookServer(mockAiApp as any, 'test-secret');
			expect(server).toBeDefined();
		}).not.toThrow();
	});

	it('should have queueSize getter', () => {
		const mockAiApp = {
			queueTask: vi.fn(),
			queueSize: 5,
		};

		const server = new CortexWebhookServer(mockAiApp as any, 'test-secret');
		expect(server.queueSize).toBe(5);
	});
});
