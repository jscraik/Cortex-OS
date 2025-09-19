/**
 * Unit tests for LiveProgressUpdater edge warnings
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveProgressUpdater } from '../../src/lib/progress-updater.js';

// Mock Octokit to avoid network
vi.mock('@octokit/rest', () => ({
	Octokit: vi.fn().mockImplementation(() => ({
		rest: {
			issues: {
				createComment: vi.fn().mockResolvedValue({ data: { id: 123 } }),
			},
		},
	})),
}));

describe('LiveProgressUpdater edge warnings', () => {
	let updater: LiveProgressUpdater;
	const token = 'test-token';
	type Payload = {
		repository: { owner: { login: string }; name: string };
		issue?: { number: number };
		pull_request?: { number: number };
	};
	const payload: Payload = {
		repository: { owner: { login: 'owner' }, name: 'repo' },
		issue: { number: 1 },
	};

	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		updater = new LiveProgressUpdater(token);
		// Ensure Octokit is stubbed to avoid real network and to provide rest.issues
		// @ts-expect-error - override private field in tests
		updater.octokit = {
			rest: {
				issues: {
					createComment: vi.fn().mockResolvedValue({ data: { id: 123 } }),
					updateComment: vi.fn().mockResolvedValue({ data: { id: 123 } }),
				},
			},
		};
	});

	afterEach(() => {
		updater.destroy();
		vi.restoreAllMocks();
	});

	it('warns when updating non-existent task id', async () => {
		await updater.updateStepStatus('missing-task', 1, 'running');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Progress state not found for task'),
		);
	});

	it('warns when updating missing step index', async () => {
		const taskId = await updater.startProgress(payload, 'build', 'user', [{ title: 'Step 1' }]);
		await updater.updateStepStatus(taskId, 999, 'running');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Step 999 not found for task'),
		);
	});
});
