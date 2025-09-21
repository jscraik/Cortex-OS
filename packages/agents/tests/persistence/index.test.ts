import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	createPersistence,
	defaultPersistenceConfig,
	type Persistence,
} from '../../src/persistence';

describe('Persistence', () => {
	let persistence: Persistence;
	let testDbPath: string;

	beforeEach(async () => {
		testDbPath = path.join(process.cwd(), `persistence-test-${Date.now()}.db`);
		const config = {
			...defaultPersistenceConfig,
			path: testDbPath,
		};
		try {
			persistence = await createPersistence(config);
		} catch (error) {
			console.error('Failed to create persistence:', error);
			throw error;
		}
	});

	afterEach(async () => {
		if (persistence) {
			try {
				await persistence.close();
			} catch (error) {
				console.warn('Error closing persistence:', error);
			}
		}
		try {
			await fs.unlink(testDbPath);
		} catch (_error) {
			// Ignore file not found errors
		}
	});

	describe('Initialization', () => {
		it('should create persistence instance and run migrations', async () => {
			expect(persistence).toBeDefined();

			const status = persistence.getMigrationStatus();
			expect(status.applied).toContain('001_initial');
			expect(status.pending).toHaveLength(0);
		});

		it('should pass health check', async () => {
			const isHealthy = await persistence.healthCheck();
			expect(isHealthy).toBe(true);
		});

		it('should get database statistics', async () => {
			const stats = await persistence.getStats();
			expect(stats.agentStates.total).toBe(0);
			expect(stats.checkpoints.totalCheckpoints).toBe(0);
			expect(stats.pool.initialized).toBe(true);
		});
	});

	describe('Agent State Operations', () => {
		const mockAgentState = {
			agentId: 'test-agent-123',
			sessionId: 'session-456',
			status: 'running' as const,
			currentStep: 'processing-input',
			data: {
				input: 'test input',
				context: { userId: 'user-789' },
			},
			error: null,
			config: {
				model: 'gpt-4',
				temperature: 0.7,
			},
		};

		it('should create and retrieve agent state', async () => {
			const created = await persistence.createAgentState(mockAgentState);

			expect(created.id).toBeDefined();
			expect(created.agentId).toBe(mockAgentState.agentId);
			expect(created.status).toBe(mockAgentState.status);

			const found = await persistence.findAgentState(created.id);
			expect(found).toEqual(created);
		});

		it('should update agent state', async () => {
			const created = await persistence.createAgentState(mockAgentState);

			const updated = await persistence.updateAgentState(created.id, {
				status: 'completed',
				currentStep: 'finalizing',
				data: {
					...created.data,
					result: 'task completed',
				},
			});

			expect(updated.status).toBe('completed');
			expect(updated.currentStep).toBe('finalizing');
			expect(updated.data.result).toBe('task completed');
		});

		it('should list agent states with pagination', async () => {
			// Create multiple states
			const states = [];
			for (let i = 0; i < 15; i++) {
				const state = await persistence.createAgentState({
					...mockAgentState,
					agentId: `agent-${i}`,
				});
				states.push(state);
			}

			const page1 = await persistence.listAgentStates({ limit: 10, offset: 0 });
			const page2 = await persistence.listAgentStates({ limit: 10, offset: 10 });

			expect(page1.items).toHaveLength(10);
			expect(page2.items).toHaveLength(5);
			expect(page1.total).toBe(15);
		});

		it('should filter agent states by status', async () => {
			await persistence.createAgentState({ ...mockAgentState, status: 'running' });
			await persistence.createAgentState({ ...mockAgentState, status: 'completed' });
			await persistence.createAgentState({ ...mockAgentState, status: 'running' });

			const running = await persistence.listAgentStates({ status: 'running' });

			expect(running.items.every((s) => s.status === 'running')).toBe(true);
			expect(running.items).toHaveLength(2);
		});

		it('should cleanup old agent states', async () => {
			const state = await persistence.createAgentState(mockAgentState);

			// Manually update the created_at to be old
			const db = persistence.getDatabase();
			const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
			const updateStmt = db.prepare('UPDATE agent_states SET created_at = ? WHERE id = ?');
			updateStmt.run(oldDate.toISOString(), state.id);

			const cleanedCount = await persistence.cleanupAgentStates(7); // Keep last 7 days

			expect(cleanedCount).toBe(1);

			const remaining = await persistence.findAgentState(state.id);
			expect(remaining).toBeNull();
		});
	});

	describe('Checkpoint Operations', () => {
		const mockCheckpoint = {
			v: 1,
			id: 'checkpoint-456',
			ts: '2024-01-01T00:00:00.000Z',
			channel_values: {
				messages: [{ role: 'user', content: 'Hello' }],
			},
			channel_versions: {
				messages: 1,
			},
			versions_seen: {},
		};

		it('should create and retrieve checkpoint', async () => {
			const checkpointId = await persistence.createCheckpoint('thread-123', mockCheckpoint, {
				source: 'test',
			});

			expect(checkpointId).toBeDefined();

			const retrieved = await persistence.getCheckpoint(checkpointId);
			expect(retrieved).toBeDefined();
			expect(retrieved?.checkpoint).toEqual(mockCheckpoint);
			expect(retrieved?.config.configurable.thread_id).toBe('thread-123');
		});

		it('should list checkpoints for a thread', async () => {
			const threadId = 'thread-123';

			// Create multiple checkpoints
			for (let i = 0; i < 3; i++) {
				await persistence.createCheckpoint(threadId, {
					...mockCheckpoint,
					id: `checkpoint-${i}`,
					ts: new Date(Date.now() + i * 1000).toISOString(),
				});
			}

			const checkpoints = await persistence.listCheckpoints(threadId);

			expect(checkpoints).toHaveLength(3);
			expect(checkpoints[0].checkpoint.id).toBe('checkpoint-2'); // Most recent first
		});

		it('should get latest checkpoint', async () => {
			const threadId = 'thread-123';

			await persistence.createCheckpoint(threadId, {
				...mockCheckpoint,
				id: 'first',
				ts: '2024-01-01T00:00:00.000Z',
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			await persistence.createCheckpoint(threadId, {
				...mockCheckpoint,
				id: 'latest',
				ts: '2024-01-01T00:00:01.000Z',
			});

			const latest = await persistence.getLatestCheckpoint(threadId);

			expect(latest?.checkpoint.id).toBe('latest');
		});

		it('should store and retrieve pending writes', async () => {
			const writes = [
				{ channel: 'messages', value: { role: 'assistant', content: 'Hello!' } },
				{ channel: 'next', value: 'process' },
			];

			await persistence.putPendingWrites('thread-123', 'task-789', writes);

			const retrieved = await persistence.getPendingWrites('thread-123', 'task-789');

			expect(retrieved).toEqual(writes);
		});

		it('should clear pending writes', async () => {
			await persistence.putPendingWrites('thread-123', 'task-789', [
				{ channel: 'test', value: 'data' },
			]);

			await persistence.clearPendingWrites('thread-123', 'task-789');

			const cleared = await persistence.getPendingWrites('thread-123', 'task-789');
			expect(cleared).toEqual([]);
		});
	});

	describe('Transaction Support', () => {
		it('should execute operations within a transaction', async () => {
			let agentStateId: string | null = null;
			let checkpointId: string | null = null;

			await persistence.withTransaction(async () => {
				const agentState = await persistence.createAgentState({
					agentId: 'test-agent',
					sessionId: 'test-session',
					status: 'running',
				});
				agentStateId = agentState.id;

				checkpointId = await persistence.createCheckpoint('thread-123', {
					v: 1,
					id: 'test-checkpoint',
					ts: new Date().toISOString(),
					channel_values: {},
					channel_versions: {},
					versions_seen: {},
				});
			});

			expect(agentStateId).toBeDefined();
			expect(checkpointId).toBeDefined();

			const foundAgent = await persistence.findAgentState(agentStateId!);
			const foundCheckpoint = await persistence.getCheckpoint(checkpointId!);

			expect(foundAgent).toBeDefined();
			expect(foundCheckpoint).toBeDefined();
		});

		it('should rollback on transaction failure', async () => {
			let agentStateId: string | null = null;

			try {
				await persistence.withTransaction(async () => {
					const agentState = await persistence.createAgentState({
						agentId: 'test-agent',
						sessionId: 'test-session',
						status: 'running',
					});
					agentStateId = agentState.id;

					// Simulate an error
					throw new Error('Simulated transaction failure');
				});
			} catch (_error) {
				// Expected error
			}

			// Verify the agent state was not created
			const found = await persistence.findAgentState(agentStateId!);
			expect(found).toBeNull();
		});
	});

	describe('Migration Operations', () => {
		it('should show migration status', async () => {
			const status = persistence.getMigrationStatus();

			expect(status.total).toBeGreaterThan(0);
			expect(status.applied.length).toBeGreaterThan(0);
			expect(Array.isArray(status.pending)).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid agent state data', async () => {
			await expect(
				persistence.createAgentState({
					// @ts-expect-error: Testing invalid data
					agentId: 123,
					sessionId: 'session-456',
					status: 'invalid-status',
				}),
			).rejects.toThrow();
		});

		it('should handle updating non-existent agent state', async () => {
			await expect(
				persistence.updateAgentState('non-existent-id', { status: 'completed' }),
			).rejects.toThrow('Agent state not found');
		});

		it('should handle invalid checkpoint data', async () => {
			await expect(
				persistence.createCheckpoint('thread-123', {
					// @ts-expect-error: Testing invalid data
					v: 'not-a-number',
				}),
			).rejects.toThrow();
		});
	});

	describe('Connection Pool', () => {
		it('should track connection statistics', async () => {
			const stats = persistence.getPoolStats();

			expect(stats.totalConnections).toBeGreaterThan(0);
			expect(stats.availableConnections).toBeGreaterThanOrEqual(0);
			expect(stats.inUseConnections).toBeGreaterThanOrEqual(0);
			expect(stats.initialized).toBe(true);
		});
	});
});
