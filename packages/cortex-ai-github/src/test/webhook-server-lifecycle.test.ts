import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CortexWebhookServer } from '../server/webhook-server.js';

describe('CortexWebhookServer - Lifecycle Test', () => {
	let server: CortexWebhookServer;
	let mockAiApp: any;

	beforeEach(() => {
		mockAiApp = {
			queueTask: vi.fn(),
			queueSize: 0,
		};
		server = new CortexWebhookServer(mockAiApp, 'test-secret');
	});

	afterEach(async () => {
		if (server) {
			await server.stop();
		}
	});

	it('should have default triggers after initialization', () => {
		// Access private property for testing
		const triggers = (server as any).triggers;
		expect(triggers).toBeDefined();
		expect(Array.isArray(triggers)).toBe(true);
		expect(triggers.length).toBeGreaterThan(0);
	});
});
