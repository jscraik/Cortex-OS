/**
 * Simple test to debug webhook server issues
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CortexAiGitHubApp } from './src/core/ai-github-app.js';
import { CortexWebhookServer } from './src/server/webhook-server.js';
import type { GitHubModelsConfig } from './src/types/github-models.js';

const createMockAiApp = (): CortexAiGitHubApp => {
	const mockConfig: GitHubModelsConfig = {
		token: 'test-token',
		baseUrl: 'https://test.api.com',
		defaultModel: 'gpt-4o-mini',
		maxTokens: 1000,
		temperature: 0.3,
	};

	const app = new CortexAiGitHubApp(mockConfig);

	// Mock all required methods and properties
	vi.spyOn(app, 'queueTask').mockResolvedValue('test-task-id');

	// Add missing properties
	Object.defineProperty(app, 'queueSize', {
		get: () => 0,
		configurable: true,
	});

	Object.defineProperty(app, 'activeTaskCount', {
		get: () => 0,
		configurable: true,
	});

	Object.defineProperty(app, 'rateLimit', {
		get: () => ({ remaining: 5000, resetTime: new Date() }),
		configurable: true,
	});

	return app;
};

describe('Simple Webhook Server Test', () => {
	let server: CortexWebhookServer;
	let mockAiApp: CortexAiGitHubApp;
	const testSecret = 'test-webhook-secret';

	beforeEach(() => {
		mockAiApp = createMockAiApp();
		server = new CortexWebhookServer(mockAiApp, testSecret);

		// Reset all mocks
		vi.clearAllMocks();
	});

	it('should create server instance', () => {
		expect(server).toBeInstanceOf(CortexWebhookServer);
	});

	it('should have queueSize property', () => {
		expect(typeof server.queueSize).toBe('number');
		expect(server.queueSize).toBe(0);
	});
});
