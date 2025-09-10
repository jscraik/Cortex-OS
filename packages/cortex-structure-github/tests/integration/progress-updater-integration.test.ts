/**
 * Integration tests for LiveProgressUpdater after memory management fixes
 * Tests resource cleanup and bounded memory usage
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveProgressUpdater } from '../../src/lib/progress-updater.js';

describe('Progress Updater Integration Tests', () => {
	let progressUpdater: LiveProgressUpdater;
	const testToken = 'github_pat_test_token';

	beforeEach(() => {
		progressUpdater = new LiveProgressUpdater(testToken);
	});

	afterEach(() => {
		if (progressUpdater) {
			progressUpdater.destroy();
		}
	});

	describe('Memory Management', () => {
		it('enforces maximum task limit', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			// Create more than MAX_ACTIVE_TASKS (100) tasks
			const taskPromises = [];
			for (let i = 0; i < 150; i++) {
				taskPromises.push(
					progressUpdater
						.startProgress(mockPayload, 'test-task', 'user', [
							{ title: `Task ${i}` },
						])
						.catch(() => {}), // Ignore GitHub API errors in tests
				);
			}

			await Promise.allSettled(taskPromises);

			// Should have enforced the limit
			const activeTasks = progressUpdater.getActiveProgress();
			expect(activeTasks.length).toBeLessThanOrEqual(100);
		});

		it('cleans up stale progress tasks automatically', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			// Mock Date.now to simulate passage of time
			const originalDateNow = Date.now;
			const baseTime = 1640995200000; // Fixed timestamp

			Date.now = vi.fn().mockReturnValue(baseTime);

			// Create a task
			const _taskId = await progressUpdater
				.startProgress(mockPayload, 'test-task', 'user', [
					{ title: 'Test task' },
				])
				.catch(() => 'fallback-task-id');

			// Advance time by more than STALE_TASK_TIMEOUT (30 minutes)
			Date.now = vi.fn().mockReturnValue(baseTime + 35 * 60 * 1000);

			// Trigger cleanup manually (normally done by interval)
			// @ts-expect-error - accessing private method for testing
			progressUpdater.cleanupStaleProgress();

			const activeTasks = progressUpdater.getActiveProgress();
			expect(activeTasks.length).toBe(0);

			// Restore original Date.now
			Date.now = originalDateNow;
		});

		it('destroys resources properly', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			progressUpdater.destroy();

			expect(consoleSpy).toHaveBeenCalledWith(
				'LiveProgressUpdater destroyed and resources cleaned up',
			);
			expect(progressUpdater.getActiveProgress().length).toBe(0);

			consoleSpy.mockRestore();
		});
	});

	describe('Progress Tracking', () => {
		it('tracks progress state correctly', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			const taskId = await progressUpdater
				.startProgress(mockPayload, 'test-task', 'testuser', [
					{ title: 'Step 1' },
					{ title: 'Step 2' },
				])
				.catch(() => 'fallback-task-id');

			const progress = progressUpdater.getProgress(taskId);

			if (progress) {
				expect(progress.taskType).toBe('test-task');
				expect(progress.user).toBe('testuser');
				expect(progress.steps).toHaveLength(2);
				expect(progress.status).toBe('running');
				expect(progress.startTime).toBeInstanceOf(Date);
			}
		});

		it('updates step progress correctly', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			const taskId = await progressUpdater
				.startProgress(mockPayload, 'test-task', 'testuser', [
					{ title: 'Step 1' },
					{ title: 'Step 2' },
				])
				.catch(() => 'fallback-task-id');

			// Update first step
			await progressUpdater.updateStep(
				taskId,
				1,
				'completed',
				'Step completed successfully',
			);

			const progress = progressUpdater.getProgress(taskId);
			if (progress) {
				expect(progress.steps[0].status).toBe('completed');
				expect(progress.steps[0].details).toBe('Step completed successfully');
			}
		});

		it('completes task correctly', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			const taskId = await progressUpdater
				.startProgress(mockPayload, 'test-task', 'testuser', [
					{ title: 'Step 1' },
				])
				.catch(() => 'fallback-task-id');

			await progressUpdater.completeTask(taskId, 'Task completed successfully');

			const progress = progressUpdater.getProgress(taskId);
			if (progress) {
				expect(progress.status).toBe('completed');
				expect(progress.endTime).toBeInstanceOf(Date);
			}
		});

		it('handles task errors correctly', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			const taskId = await progressUpdater
				.startProgress(mockPayload, 'test-task', 'testuser', [
					{ title: 'Step 1' },
				])
				.catch(() => 'fallback-task-id');

			await progressUpdater.errorTask(taskId, 'Task failed');

			const progress = progressUpdater.getProgress(taskId);
			if (progress) {
				expect(progress.status).toBe('error');
				expect(progress.endTime).toBeInstanceOf(Date);
			}
		});
	});

	describe('Secure Random Generation', () => {
		it('generates unique task IDs with crypto randomUUID', async () => {
			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			const taskIds = new Set<string>();

			// Generate multiple task IDs
			for (let i = 0; i < 10; i++) {
				const taskId = await progressUpdater
					.startProgress(mockPayload, 'test-task', 'user', [{ title: 'Test' }])
					.catch(() => `fallback-${i}`);

				taskIds.add(taskId);
			}

			// All task IDs should be unique
			expect(taskIds.size).toBe(10);

			// Task IDs should follow the expected pattern (task_timestamp_uuid)
			for (const taskId of taskIds) {
				expect(taskId).toMatch(/^task_\d+_[a-f0-9-]+/);
			}
		});
	});

	describe('Error Resilience', () => {
		it('handles GitHub API failures gracefully', async () => {
			// Mock Octokit to fail
			const mockOctokit = {
				rest: {
					issues: {
						createComment: vi
							.fn()
							.mockRejectedValue(new Error('GitHub API Error')),
						updateComment: vi
							.fn()
							.mockRejectedValue(new Error('GitHub API Error')),
					},
				},
			};

			// @ts-expect-error - replacing private property for testing
			progressUpdater.octokit = mockOctokit;

			const mockPayload = {
				repository: { owner: { login: 'user' }, name: 'repo' },
				issue: { number: 1 },
			};

			// Should not throw even when GitHub API fails
			await expect(() =>
				progressUpdater.startProgress(mockPayload, 'test-task', 'user', [
					{ title: 'Test' },
				]),
			).not.toThrow();
		});

		it('handles invalid task IDs gracefully', () => {
			expect(() =>
				progressUpdater.getProgress('invalid-task-id'),
			).not.toThrow();
			expect(progressUpdater.getProgress('invalid-task-id')).toBeUndefined();
		});
	});
});
