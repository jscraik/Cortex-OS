import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	AgentState,
	ExecutionPlan,
	ExecutionStatus,
} from '../../contracts/no-architecture-contracts.js';
import {
	type StatePersistenceConfig,
	StatePersistenceManager,
} from '../state-persistence-manager.js';

// Mock the enhanced span utility
vi.mock('../../observability/otel.js', () => ({
	withEnhancedSpan: vi.fn((_name, fn) => fn()),
}));

describe('StatePersistenceManager', () => {
	let manager: StatePersistenceManager;
	let baseConfig: StatePersistenceConfig;

	const mockAgentState: AgentState = {
		agentId: 'agent-1',
		specialization: 'intelligence-scheduler',
		status: 'idle',
		currentTask: 'test-task',
		performance: {
			tasksCompleted: 0,
			averageExecutionTime: 1000,
			successRate: 1.0,
			errorCount: 0,
		},
		resources: {
			memoryUsageMB: 256,
			cpuUsagePercent: 10,
		},
		lastUpdate: new Date().toISOString(),
		version: '1.0.0',
	};

	const mockExecutionPlan: ExecutionPlan = {
		id: 'plan-1',
		requestId: 'req-1',
		strategy: 'sequential',
		estimatedDuration: 60000,
		steps: [
			{
				id: 'step-1',
				type: 'analysis',
				estimatedDuration: 30000,
				agentRequirements: ['intelligence-scheduler'],
				dependencies: [],
				parameters: { testParam: 'value' },
				resourceRequirements: { memoryMB: 256, cpuPercent: 20 },
			},
		],
		resourceAllocation: { memoryMB: 256, cpuPercent: 20 },
		contingencyPlans: [],
		metadata: {},
	};

	const mockExecutionStatus: ExecutionStatus = {
		planId: 'plan-1',
		status: 'running',
		currentStep: 'step-1',
		progress: 0.5,
		startTime: new Date().toISOString(),
		estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
		activeAgents: ['agent-1'],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		baseConfig = {
			storage: { type: 'memory', options: {} },
			checkpointing: {
				enabled: true,
				interval: 300000,
				maxCheckpoints: 10,
				autoCleanup: true,
			},
			recovery: {
				autoRecoveryEnabled: true,
				maxRecoveryAttempts: 3,
				recoveryTimeout: 300000,
			},
			consistency: {
				strictMode: false,
				validationInterval: 600000,
				autoRepair: false,
			},
		};

		manager = new StatePersistenceManager(baseConfig);
	});

	afterEach(() => {
		vi.useRealTimers();
		manager.shutdown();
	});

	describe('Core Functionality', () => {
		it('should initialize with valid configuration', () => {
			expect(manager).toBeDefined();
			expect(manager.getConfiguration()).toEqual(baseConfig);
		});

		it('should create manual checkpoint successfully', async () => {
			const checkpointId = await manager.createCheckpoint('manual', 'Test checkpoint');

			expect(checkpointId).toMatch(/^checkpoint-\d+-[a-z0-9]+$/);

			const checkpoints = await manager.getCheckpoints();
			expect(checkpoints).toHaveLength(1);
			expect(checkpoints[0].checkpointType).toBe('manual');
			expect(checkpoints[0].metadata.triggerReason).toBe('Test checkpoint');
		});

		it('should create automatic checkpoint with interval', async () => {
			const testConfig = {
				...baseConfig,
				checkpointing: { ...baseConfig.checkpointing, interval: 1000 },
			};
			const testManager = new StatePersistenceManager(testConfig);

			vi.advanceTimersByTime(1000);
			await vi.runAllTimersAsync();

			const checkpoints = await testManager.getCheckpoints();
			expect(checkpoints.length).toBeGreaterThan(0);
			expect(checkpoints[0].checkpointType).toBe('automatic');

			testManager.shutdown();
		});

		it('should restore from checkpoint successfully', async () => {
			// Set up initial state
			await manager.updateState('agentState', 'agent-1', mockAgentState);
			await manager.updateState('executionPlan', 'plan-1', mockExecutionPlan);

			// Create checkpoint
			const checkpointId = await manager.createCheckpoint('manual', 'Before restore test');

			// Modify state
			const modifiedAgent = { ...mockAgentState, status: 'maintenance' as const };
			await manager.updateState('agentState', 'agent-1', modifiedAgent);

			// Restore from checkpoint
			const recoveryPlan = await manager.restoreFromCheckpoint(checkpointId);

			expect(recoveryPlan.strategy).toBe('full-restore');
			expect(recoveryPlan.phases).toHaveLength(4);
			expect(recoveryPlan.riskAssessment.riskLevel).toBe('medium');

			// Verify state was restored
			const currentState = manager.getCurrentState();
			expect(currentState.agentStates['agent-1'].status).toBe('idle');
		});
	});

	describe('Transaction Management', () => {
		it('should begin and commit transaction successfully', async () => {
			const transactionId = await manager.beginTransaction('test-user', 'Test transaction');

			expect(transactionId).toMatch(/^tx-\d+-[a-z0-9]+$/);

			const transactions = await manager.getActiveTransactions();
			expect(transactions).toHaveLength(1);
			expect(transactions[0].status).toBe('pending');

			await manager.commitTransaction(transactionId);

			const finalTransactions = await manager.getActiveTransactions();
			expect(finalTransactions).toHaveLength(0);
		});

		it('should rollback transaction successfully', async () => {
			// Set initial state
			await manager.updateState('agentState', 'agent-1', mockAgentState);

			const transactionId = await manager.beginTransaction('test-user', 'Rollback test');

			// Modify state within transaction
			const modifiedAgent = { ...mockAgentState, status: 'maintenance' as const };
			await manager.updateState('agentState', 'agent-1', modifiedAgent);

			// Rollback transaction
			await manager.rollbackTransaction(transactionId);

			// Verify state was rolled back
			const currentState = manager.getCurrentState();
			expect(currentState.agentStates['agent-1'].status).toBe('idle');
		});

		it('should handle transaction timeout', async () => {
			const timeoutConfig = {
				...baseConfig,
				recovery: { ...baseConfig.recovery, recoveryTimeout: 1000 },
			};
			const testManager = new StatePersistenceManager(timeoutConfig);

			const _transactionId = await testManager.beginTransaction('test-user', 'Timeout test');

			// Advance time beyond timeout
			vi.advanceTimersByTime(1500);
			await vi.runAllTimersAsync();

			const transactions = await testManager.getActiveTransactions();
			expect(transactions).toHaveLength(0);

			testManager.shutdown();
		});
	});

	describe('State Management', () => {
		it('should update agent state correctly', async () => {
			await manager.updateState('agentState', 'agent-1', mockAgentState);

			const currentState = manager.getCurrentState();
			expect(currentState.agentStates['agent-1']).toEqual(mockAgentState);
		});

		it('should update execution plan correctly', async () => {
			await manager.updateState('executionPlan', 'plan-1', mockExecutionPlan);

			const currentState = manager.getCurrentState();
			expect(currentState.executionPlans['plan-1']).toEqual(mockExecutionPlan);
		});

		it('should update execution status correctly', async () => {
			await manager.updateState('executionStatus', 'status-1', mockExecutionStatus);

			const currentState = manager.getCurrentState();
			expect(currentState.executionStatuses['status-1']).toEqual(mockExecutionStatus);
		});

		it('should delete state entities correctly', async () => {
			await manager.updateState('agentState', 'agent-1', mockAgentState);
			await manager.deleteState('agentState', 'agent-1');

			const currentState = manager.getCurrentState();
			expect(currentState.agentStates['agent-1']).toBeUndefined();
		});
	});

	describe('Consistency Checking', () => {
		it('should perform consistency check successfully', async () => {
			await manager.updateState('agentState', 'agent-1', mockAgentState);
			await manager.updateState('executionPlan', 'plan-1', mockExecutionPlan);
			await manager.updateState('executionStatus', 'status-1', mockExecutionStatus);

			const report = await manager.performConsistencyCheck();

			expect(report.overallStatus).toBe('consistent');
			expect(report.checks.length).toBeGreaterThan(0);
			expect(report.metrics.totalEntities).toBe(3);
			expect(report.metrics.inconsistentEntities).toBe(0);
			expect(report.metrics.integrityScore).toBe(100);
		});

		it('should detect inconsistent state', async () => {
			// Create invalid agent state by bypassing validation
			const invalidState = { ...mockAgentState, status: 'invalid-status' as any };
			await manager.updateState('agentState', 'agent-1', invalidState);

			const report = await manager.performConsistencyCheck();

			expect(report.overallStatus).toBe('inconsistent');
			expect(report.metrics.inconsistentEntities).toBeGreaterThan(0);
			expect(report.metrics.integrityScore).toBeLessThan(100);
		});

		it('should run automatic consistency checks', async () => {
			const testConfig = {
				...baseConfig,
				consistency: { ...baseConfig.consistency, validationInterval: 1000 },
			};
			const testManager = new StatePersistenceManager(testConfig);

			const spy = vi.spyOn(testManager, 'performConsistencyCheck');

			vi.advanceTimersByTime(1000);
			await vi.runAllTimersAsync();

			expect(spy).toHaveBeenCalled();

			testManager.shutdown();
		});
	});

	describe('Recovery Mechanisms', () => {
		it('should create recovery plan with appropriate strategy', async () => {
			const checkpointId = await manager.createCheckpoint('manual', 'Recovery test');
			const recoveryPlan = await manager.restoreFromCheckpoint(checkpointId, 'partial-restore');

			expect(recoveryPlan.strategy).toBe('partial-restore');
			expect(recoveryPlan.phases).toHaveLength(2);
			expect(recoveryPlan.riskAssessment.riskLevel).toBe('low');
		});

		it('should validate checkpoint integrity during recovery', async () => {
			const checkpointId = await manager.createCheckpoint('manual', 'Integrity test');

			// Corrupt checkpoint (simulate corruption)
			const checkpoints = await manager.getCheckpoints();
			const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);
			if (checkpoint) {
				checkpoint.metadata.consistency.hashSum = 'corrupted-hash';
			}

			await expect(manager.restoreFromCheckpoint(checkpointId)).rejects.toThrow(
				'integrity validation',
			);
		});

		it('should handle multiple recovery attempts', async () => {
			const checkpointId = await manager.createCheckpoint('manual', 'Multi-recovery test');

			// First recovery
			const plan1 = await manager.restoreFromCheckpoint(checkpointId);
			expect(plan1.recoveryId).toBeDefined();

			// Second recovery
			const plan2 = await manager.restoreFromCheckpoint(checkpointId);
			expect(plan2.recoveryId).not.toBe(plan1.recoveryId);
		});
	});

	describe('Performance & Scalability', () => {
		it('should handle large state efficiently', async () => {
			const startTime = Date.now();

			// Create large state
			for (let i = 0; i < 100; i++) {
				await manager.updateState('agentState', `agent-${i}`, {
					...mockAgentState,
					id: `agent-${i}`,
				});
			}

			const checkpointId = await manager.createCheckpoint('manual', 'Large state test');
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
			expect(checkpointId).toBeDefined();

			const checkpoints = await manager.getCheckpoints();
			expect(checkpoints[0].metadata.performanceMetrics.checkpointSize).toBeGreaterThan(0);
		});

		it('should cleanup old checkpoints automatically', async () => {
			const testConfig = {
				...baseConfig,
				checkpointing: { ...baseConfig.checkpointing, maxCheckpoints: 2 },
			};
			const testManager = new StatePersistenceManager(testConfig);

			// Create more checkpoints than the limit
			await testManager.createCheckpoint('manual', 'Checkpoint 1');
			await testManager.createCheckpoint('manual', 'Checkpoint 2');
			await testManager.createCheckpoint('manual', 'Checkpoint 3');

			const checkpoints = await testManager.getCheckpoints();
			expect(checkpoints).toHaveLength(2);

			testManager.shutdown();
		});

		it('should handle concurrent operations safely', async () => {
			const promises = [];

			// Create concurrent operations
			for (let i = 0; i < 10; i++) {
				promises.push(
					manager.updateState('agentState', `agent-${i}`, {
						...mockAgentState,
						agentId: `agent-${i}`,
					}),
				);
			}

			await Promise.all(promises);

			const currentState = manager.getCurrentState();
			expect(Object.keys(currentState.agentStates)).toHaveLength(10);
		});
	});

	describe('Error Handling & Edge Cases', () => {
		it('should handle invalid checkpoint ID gracefully', async () => {
			await expect(manager.restoreFromCheckpoint('invalid-id')).rejects.toThrow('not found');
		});

		it('should handle invalid transaction ID gracefully', async () => {
			await expect(manager.commitTransaction('invalid-tx')).rejects.toThrow('not found');
			await expect(manager.rollbackTransaction('invalid-tx')).rejects.toThrow('not found');
		});

		it('should validate configuration properly', () => {
			const invalidConfig = {
				...baseConfig,
				checkpointing: { ...baseConfig.checkpointing, interval: -1000 },
			};

			const testManager = new StatePersistenceManager(invalidConfig);
			const config = testManager.getConfiguration();

			expect(config.checkpointing.interval).toBeGreaterThan(0);
		});

		it('should handle shutdown gracefully', async () => {
			await manager.updateState('agentState', 'agent-1', mockAgentState);
			const _transactionId = await manager.beginTransaction('test-user', 'Shutdown test');

			manager.shutdown();

			// Should handle operations after shutdown gracefully
			await expect(manager.createCheckpoint()).rejects.toThrow();
		});
	});
});
