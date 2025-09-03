/**
 * Tests for webhook type validation and interface compliance
 * Follows TDD approach: tests written first to drive implementation
 */

import { describe, expect, it } from 'vitest';
import type {
	CommandContext,
	GitHubWebhookPayload,
	ProgressiveStatus,
	User,
} from '../src/types/webhook-types.js';
import { STATUS_EMOJIS } from '../src/types/webhook-types.js';

describe('Webhook Type Validation', () => {
	describe('GitHubWebhookPayload', () => {
		it('validates complete issue comment payload', () => {
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
					body: '@insula analyze frontend structure',
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

			expect(payload.action).toBe('created');
			expect(payload.repository.name).toBe('test-repo');
			expect(payload.comment?.body).toBe('@insula analyze frontend structure');
			expect(payload.sender.login).toBe('commenter');
		});

		it('validates complete pull request payload', () => {
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
					title: 'Add new feature',
					body: 'Description of the feature',
					head: {
						ref: 'feature-branch',
						sha: 'abc123def456',
						repo: {
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
						label: 'user:feature-branch',
					},
					base: {
						ref: 'main',
						sha: 'def456abc123',
						repo: {
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
						label: 'user:main',
					},
					labels: [
						{
							name: 'enhancement',
							color: 'a2eeef',
							description: 'New feature or request',
						},
					],
					state: 'open',
					html_url: 'https://github.com/user/test-repo/pull/42',
					user: {
						login: 'contributor',
						id: 33333,
						type: 'User',
						html_url: 'https://github.com/contributor',
						avatar_url: 'https://github.com/avatar',
					},
				},
				sender: {
					login: 'contributor',
					id: 33333,
					type: 'User',
					html_url: 'https://github.com/contributor',
					avatar_url: 'https://github.com/avatar',
				},
			};

			expect(payload.pull_request?.number).toBe(42);
			expect(payload.pull_request?.title).toBe('Add new feature');
			expect(payload.pull_request?.state).toBe('open');
		});

		it('handles payloads with missing optional fields', () => {
			const minimalPayload: GitHubWebhookPayload = {
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
				sender: {
					login: 'user',
					id: 67890,
					type: 'User',
					html_url: 'https://github.com/user',
					avatar_url: 'https://github.com/avatar',
				},
			};

			expect(minimalPayload.comment).toBeUndefined();
			expect(minimalPayload.pull_request).toBeUndefined();
			expect(minimalPayload.issue).toBeUndefined();
			expect(minimalPayload.installation).toBeUndefined();
		});
	});

	describe('CommandContext', () => {
		it('parses command context correctly', () => {
			const context: CommandContext = {
				command: 'analyze',
				args: ['frontend', '--strict'],
				user: 'developer',
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
				issue_number: 123,
				comment_id: 456,
			};

			expect(context.command).toBe('analyze');
			expect(context.args).toEqual(['frontend', '--strict']);
			expect(context.user).toBe('developer');
			expect(context.issue_number).toBe(123);
			expect(context.comment_id).toBe(456);
		});
	});

	describe('Progressive Status System', () => {
		it('validates progressive status types', () => {
			const statuses: ProgressiveStatus[] = [
				'reading',
				'processing',
				'working',
				'success',
				'error',
				'warning',
			];

			statuses.forEach((status) => {
				expect(STATUS_EMOJIS[status]).toBeDefined();
				expect(typeof STATUS_EMOJIS[status]).toBe('string');
				expect(STATUS_EMOJIS[status].length).toBeGreaterThan(0);
			});
		});

		it('maps correct emojis to status types', () => {
			expect(STATUS_EMOJIS.reading).toBe('👀');
			expect(STATUS_EMOJIS.processing).toBe('⚙️');
			expect(STATUS_EMOJIS.working).toBe('🔧');
			expect(STATUS_EMOJIS.success).toBe('🚀');
			expect(STATUS_EMOJIS.error).toBe('❌');
			expect(STATUS_EMOJIS.warning).toBe('⚠️');
		});
	});

	describe('User Types', () => {
		it('validates User interface with bot type', () => {
			const botUser: User = {
				login: 'github-actions[bot]',
				id: 41898282,
				type: 'Bot',
				html_url: 'https://github.com/apps/github-actions',
				avatar_url: 'https://avatars.githubusercontent.com/in/15368?v=4',
			};

			expect(botUser.type).toBe('Bot');
			expect(botUser.login).toBe('github-actions[bot]');
		});

		it('validates User interface with user type', () => {
			const regularUser: User = {
				login: 'developer',
				id: 12345,
				type: 'User',
				html_url: 'https://github.com/developer',
				avatar_url: 'https://github.com/avatar',
			};

			expect(regularUser.type).toBe('User');
			expect(regularUser.login).toBe('developer');
		});
	});
});
