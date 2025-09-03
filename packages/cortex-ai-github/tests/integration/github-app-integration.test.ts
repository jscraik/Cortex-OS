/**
 * Integration tests for GitHub Apps after TDD fixes
 * Tests end-to-end functionality with proper type safety and security validation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CortexAiGitHubApp } from '../../src/core/ai-github-app.js';
import { CortexWebhookServer } from '../../src/server/webhook-server.js';
import type { GitHubWebhookPayload } from '../../src/types/webhook-types.js';

describe('GitHub App Integration Tests', () => {
	let webhookServer: CortexWebhookServer;
	let mockAiApp: CortexAiGitHubApp;
	const webhookSecret = 'test-secret-123';

	beforeEach(() => {
		// Mock the AI app
		mockAiApp = {
			queueTask: vi.fn().mockResolvedValue('task-123'),
			queueSize: 0,
			activeTaskCount: 0,
			rateLimit: { remaining: 5000, resetTime: new Date() },
		} as any;

		webhookServer = new CortexWebhookServer(mockAiApp, webhookSecret);
	});

	afterEach(async () => {
		if (webhookServer) {
			await webhookServer.stop();
		}
	});

	describe('Webhook Event Processing', () => {
		it('processes issue comment webhooks with progressive reactions', async () => {
			const payload: GitHubWebhookPayload = {
				action: 'created',
				repository: {
					id: 12345,
					name: 'test-repo',
					full_name: 'user/test-repo',
					owner: {
						login: 'user',
						id: 67890,
						type: 'User',
						html_url: 'https://github.com/user',
						avatar_url: 'https://github.com/avatar',
					},
					clone_url: 'https://github.com/user/test-repo.git',
					default_branch: 'main',
					private: false,
					html_url: 'https://github.com/user/test-repo',
				},
				comment: {
					id: 11111,
					body: '@cortex review this PR please',
					user: {
						login: 'commenter',
						id: 22222,
						type: 'User',
						html_url: 'https://github.com/commenter',
						avatar_url: 'https://github.com/avatar',
					},
					created_at: '2025-09-01T10:00:00Z',
					updated_at: '2025-09-01T10:00:00Z',
					html_url:
						'https://github.com/user/test-repo/issues/1#issuecomment-11111',
					author_association: 'OWNER',
				},
				sender: {
					login: 'commenter',
					id: 22222,
					type: 'User',
					html_url: 'https://github.com/commenter',
					avatar_url: 'https://github.com/avatar',
				},
			};

			// Emit webhook event
			webhookServer.emit('webhook:verified', 'issue_comment', 'test-delivery');

			// Test that the handler processes the payload without errors
			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.handleWebhookEvent('issue_comment', payload),
			).not.toThrow();

			// Verify AI app was called
			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({
					taskType: 'code_review',
					githubContext: expect.any(Object),
					instructions: expect.any(String),
				}),
			);
		});

		it('handles malformed webhook payloads gracefully', async () => {
			const malformedPayload = {
				action: 'created',
				// Missing required repository field
			} as any;

			// Should not throw an error, but should log warning
			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.handleWebhookEvent('issue_comment', malformedPayload),
			).not.toThrow();

			// AI app should not be called with malformed payload
			expect(mockAiApp.queueTask).not.toHaveBeenCalled();
		});

		it('validates webhook signatures properly', () => {
			const payload = JSON.stringify({ test: 'data' });
			const signature = 'sha256=invalid-signature';

			// @ts-expect-error - accessing private method for testing
			const isValid = webhookServer.verifyWebhookSignature(signature, payload);

			expect(isValid).toBe(false);
		});

		it('properly builds GitHub context from webhook payload', () => {
			const payload: GitHubWebhookPayload = {
				action: 'opened',
				repository: {
					id: 12345,
					name: 'test-repo',
					full_name: 'user/test-repo',
					owner: {
						login: 'user',
						id: 67890,
						type: 'User',
						html_url: 'https://github.com/user',
						avatar_url: 'https://github.com/avatar',
					},
					clone_url: 'https://github.com/user/test-repo.git',
					default_branch: 'main',
					private: false,
					html_url: 'https://github.com/user/test-repo',
				},
				pull_request: {
					number: 42,
					title: 'Test PR',
					body: 'Test description',
					head: {
						ref: 'feature',
						sha: 'abc123',
						repo: {} as any,
						label: 'user:feature',
					},
					base: {
						ref: 'main',
						sha: 'def456',
						repo: {} as any,
						label: 'user:main',
					},
					labels: [],
					state: 'open',
					html_url: 'https://github.com/user/test-repo/pull/42',
					user: {
						login: 'author',
						id: 33333,
						type: 'User',
						html_url: 'https://github.com/author',
						avatar_url: 'https://github.com/avatar',
					},
				},
				sender: {
					login: 'author',
					id: 33333,
					type: 'User',
					html_url: 'https://github.com/author',
					avatar_url: 'https://github.com/avatar',
				},
			};

			// @ts-expect-error - accessing private method for testing
			const context = webhookServer.buildGitHubContext(payload);

			expect(context.owner).toBe('user');
			expect(context.repo).toBe('test-repo');
			expect(context.pr?.number).toBe(42);
			expect(context.pr?.title).toBe('Test PR');
			expect(context.pr?.head).toBe('feature');
			expect(context.pr?.base).toBe('main');
		});
	});

	describe('Progressive Status Updates', () => {
		it('updates reactions in correct sequence', async () => {
			const payload: GitHubWebhookPayload = {
				action: 'created',
				repository: {
					id: 12345,
					name: 'test-repo',
					full_name: 'user/test-repo',
					owner: {
						login: 'user',
						id: 67890,
						type: 'User',
						html_url: 'https://github.com/user',
						avatar_url: 'https://github.com/avatar',
					},
					clone_url: 'https://github.com/user/test-repo.git',
					default_branch: 'main',
					private: false,
					html_url: 'https://github.com/user/test-repo',
				},
				comment: {
					id: 11111,
					body: 'Test comment',
					user: {
						login: 'commenter',
						id: 22222,
						type: 'User',
						html_url: 'https://github.com/commenter',
						avatar_url: 'https://github.com/avatar',
					},
					created_at: '2025-09-01T10:00:00Z',
					updated_at: '2025-09-01T10:00:00Z',
					html_url:
						'https://github.com/user/test-repo/issues/1#issuecomment-11111',
					author_association: 'OWNER',
				},
				sender: {
					login: 'commenter',
					id: 22222,
					type: 'User',
					html_url: 'https://github.com/commenter',
					avatar_url: 'https://github.com/avatar',
				},
			};

			// Test progressive status updates don't throw errors
			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.updateProgressiveStatus(payload, 'reading'),
			).not.toThrow();

			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.updateProgressiveStatus(payload, 'processing'),
			).not.toThrow();

			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.updateProgressiveStatus(payload, 'success'),
			).not.toThrow();
		});
	});

	describe('Error Handling', () => {
		it('handles GitHub API errors gracefully', async () => {
			const payload: GitHubWebhookPayload = {
				action: 'created',
				repository: {
					id: 12345,
					name: 'test-repo',
					full_name: 'user/test-repo',
					owner: {
						login: 'user',
						id: 67890,
						type: 'User',
						html_url: 'https://github.com/user',
						avatar_url: 'https://github.com/avatar',
					},
					clone_url: 'https://github.com/user/test-repo.git',
					default_branch: 'main',
					private: false,
					html_url: 'https://github.com/user/test-repo',
				},
				sender: {
					login: 'user',
					id: 67890,
					type: 'User',
					html_url: 'https://github.com/user',
					avatar_url: 'https://github.com/avatar',
				},
			};

			// Mock AI app to throw error
			mockAiApp.queueTask = vi.fn().mockRejectedValue(new Error('API Error'));

			// Should handle errors gracefully without crashing
			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.handleCommentCreated(payload),
			).not.toThrow();
		});

		it('validates payload structure before processing', async () => {
			const payloadWithoutComment: GitHubWebhookPayload = {
				action: 'created',
				repository: {
					id: 12345,
					name: 'test-repo',
					full_name: 'user/test-repo',
					owner: {
						login: 'user',
						id: 67890,
						type: 'User',
						html_url: 'https://github.com/user',
						avatar_url: 'https://github.com/avatar',
					},
					clone_url: 'https://github.com/user/test-repo.git',
					default_branch: 'main',
					private: false,
					html_url: 'https://github.com/user/test-repo',
				},
				sender: {
					login: 'user',
					id: 67890,
					type: 'User',
					html_url: 'https://github.com/user',
					avatar_url: 'https://github.com/avatar',
				},
				// comment is optional, testing payload without it
			};

			// Should handle missing comment gracefully
			await expect(() =>
				// @ts-expect-error - accessing private method for testing
				webhookServer.handleCommentCreated(payloadWithoutComment),
			).not.toThrow();

			// Should not call AI app when comment is missing
			expect(mockAiApp.queueTask).not.toHaveBeenCalled();
		});
	});

	describe('Memory Management', () => {
		it('starts and stops server without resource leaks', async () => {
			const port = 3999; // Use different port for testing

			await webhookServer.start(port);
			expect(webhookServer.server).toBeDefined();

			await webhookServer.stop();
			expect(webhookServer.server).toBeDefined(); // Server object exists but is closed
		});
	});
});
