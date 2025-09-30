/**
 * @fileoverview Comprehensive test suite for Primitive Tool Layer
 * @module PrimitiveToolLayerTest
 * @description Test atomic operations with consistency guarantees, rollback capabilities, and composition primitives - Phase 3.4
 * @author brAInwav Development Team
 * @version 3.4.0
 * @since 2024-12-20
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	AtomicOperation,
	AtomicResult,
	ConsistencyResult,
	RollbackResult,
	TransactionResult,
} from '../primitive-tool-layer.js';
import { PrimitiveToolLayer } from '../primitive-tool-layer.js';

describe('PrimitiveToolLayer', () => {
	let primitiveLayer: PrimitiveToolLayer;

	beforeAll(() => {
		// Mock console methods to reduce noise during testing
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	beforeEach(() => {
		primitiveLayer = new PrimitiveToolLayer();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Primitive Tool Layer Initialization', () => {
		it('should provide atomic operation capabilities', () => {
			expect(primitiveLayer.getLayerType()).toBe('primitive');
			expect(primitiveLayer.getCapabilities()).toEqual(
				expect.arrayContaining([
					'atomic-operations',
					'consistency-guarantees',
					'rollback-capabilities',
					'composition-primitives',
				]),
			);
		});

		it('should initialize with primitive-specific tools', () => {
			const availableTools = primitiveLayer.getAvailableTools();
			expect(availableTools).toEqual(
				expect.arrayContaining([
					'atomic-operation',
					'transaction-manager',
					'consistency-validator',
					'rollback-handler',
					'composition-engine',
				]),
			);
		});

		it('should have correct layer configuration', () => {
			expect(primitiveLayer.getLayerType()).toBe('primitive');
			expect(primitiveLayer.getCapabilities()).toHaveLength(4);
			expect(primitiveLayer.getAvailableTools()).toHaveLength(5);
		});
	});

	describe('Atomic Operations', () => {
		it('should perform atomic read operations', async () => {
			const atomicRead = {
				operation: 'read',
				target: 'memory',
				key: 'test-key',
				isolation: 'serializable',
				timeout: 5000,
			};

			const result = (await primitiveLayer.invoke('atomic-operation', atomicRead)) as AtomicResult;

			expect(result.success).toBe(true);
			expect(result.operation).toBe('read');
			expect(result.value).toBeDefined();
			expect(result.timestamp).toBeDefined();
			expect(result.atomicity).toEqual(
				expect.objectContaining({
					guaranteed: true,
					isolationLevel: 'serializable',
					consistency: 'strong',
				}),
			);
		});

		it('should perform atomic write operations', async () => {
			const atomicWrite = {
				operation: 'write',
				target: 'memory',
				key: 'test-key',
				value: { data: 'test-value', version: 1 },
				consistency: 'strong',
				durability: 'persistent',
			};

			const result = (await primitiveLayer.invoke('atomic-operation', atomicWrite)) as AtomicResult;

			expect(result.success).toBe(true);
			expect(result.operation).toBe('write');
			expect(result.committed).toBe(true);
			expect(result.version).toBeGreaterThan(0);
			expect(result.consistency).toEqual(
				expect.objectContaining({
					level: 'strong',
					validated: true,
					checksum: expect.any(String),
				}),
			);
		});

		it('should perform atomic compare-and-swap operations', async () => {
			const casOperation = {
				operation: 'compare-and-swap',
				target: 'memory',
				key: 'cas-test',
				expectedValue: null,
				newValue: { counter: 1 },
				retryPolicy: { maxRetries: 3, backoff: 'exponential' },
			};

			const result = (await primitiveLayer.invoke(
				'atomic-operation',
				casOperation,
			)) as AtomicResult;

			expect(result.success).toBe(true);
			expect(result.operation).toBe('compare-and-swap');
			expect(result.swapped).toBe(true);
			expect(result.previousValue).toBeNull();
			expect(result.newValue).toEqual({ counter: 1 });
			expect(result.retryAttempts).toBeGreaterThanOrEqual(0);
		});

		it('should handle atomic operation conflicts', async () => {
			const conflictingOp = {
				operation: 'write',
				target: 'memory',
				key: 'conflict-key',
				value: { data: 'conflicting-value' },
				conflictResolution: 'abort',
			};

			// Simulate conflict by having concurrent operation
			const result = (await primitiveLayer.invoke('atomic-operation', {
				...conflictingOp,
				simulateConflict: true,
			})) as AtomicResult;

			expect(result.success).toBe(false);
			expect(result.error).toContain('conflict');
			expect(result.resolution).toBe('abort');
			expect(result.rollbackExecuted).toBe(true);
		});

		it('should validate atomic operation prerequisites', async () => {
			const invalidOp = {
				operation: 'read',
				target: 'invalid-target',
				key: '',
			};

			await expect(primitiveLayer.invoke('atomic-operation', invalidOp)).rejects.toThrow(
				'Invalid target: invalid-target',
			);
		});

		it('handleAtomicRead helper returns canonical atomicity and null for unknown keys', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				handleAtomicRead: (
					op: AtomicResult & { key: string; isolation: string; consistency: string },
				) => {
					value: unknown;
					atomicity: { guaranteed: boolean; isolationLevel: string; consistency: string };
				};
			};
			const readOp = {
				operation: 'read',
				target: 'memory',
				key: 'non-existent',
				isolation: 'serializable',
				consistency: 'strong',
			};
			const out = helper.handleAtomicRead(readOp as any);
			expect(out.atomicity).toEqual({
				guaranteed: true,
				isolationLevel: 'serializable',
				consistency: 'strong',
			});
			expect(out.value).toBeNull();
		});

		it('should synthesize legacy atomic operation when key omitted for slow-storage timeout', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				synthesizeAtomicOperation: (raw: Record<string, unknown>) => AtomicOperation;
			};
			const raw = {
				target: 'slow-storage',
				timeout: 100,
				operation: 'write',
				value: { data: 'legacy' },
			};
			const synthesized = helper.synthesizeAtomicOperation(raw);
			expect(synthesized).toBeDefined();
			expect(synthesized.key).toBe('unknown');
			expect(synthesized.target).toBe('slow-storage');
			expect(synthesized.timeout).toBe(100);
			expect(synthesized.timeoutAction).toBe('abort');
		});

		it('should synthesize legacy atomic operation when simulateError is present', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				synthesizeAtomicOperation: (raw: Record<string, unknown>) => AtomicOperation;
			};
			const raw = { simulateError: 'permission-denied' };
			const synthesized = helper.synthesizeAtomicOperation(raw);
			expect(synthesized.simulateError).toBe('permission-denied');
			expect(synthesized.key).toBe('unknown');
		});

		it('handleAtomicSimulations returns simulated error AtomicResult', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				handleAtomicSimulations: (v: AtomicOperation) => AtomicResult | null;
			};
			const validated: AtomicOperation = {
				operation: 'write',
				target: 'memory',
				key: 'k1',
				simulateError: 'permission-denied',
				timeout: 5000,
				isolation: 'read-committed',
				consistency: 'strong',
				durability: 'persistent',
			};
			const out = helper.handleAtomicSimulations(validated);
			expect(out).not.toBeNull();
			expect(out?.success).toBe(false);
			expect(out?.error).toContain('Simulated error');
			expect((out as AtomicResult).errorContext).toBeDefined();
		});

		it('handleAtomicSimulations returns timeout AtomicResult for slow-storage', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				handleAtomicSimulations: (v: AtomicOperation) => AtomicResult | null;
			};
			const validated: AtomicOperation = {
				operation: 'read',
				target: 'slow-storage',
				key: 'k2',
				timeout: 100,
				timeoutAction: 'abort',
				isolation: 'read-committed',
				consistency: 'strong',
				durability: 'persistent',
			};
			const out = helper.handleAtomicSimulations(validated);
			expect(out).not.toBeNull();
			expect(out?.success).toBe(false);
			expect((out as AtomicResult).timeoutHandling).toEqual({ action: 'abort', executed: true });
		});

		it('handleAtomicSimulations returns conflict AtomicResult when simulateConflict=true', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				handleAtomicSimulations: (v: AtomicOperation) => AtomicResult | null;
			};
			const validated: AtomicOperation = {
				operation: 'write',
				target: 'memory',
				key: 'k3',
				conflictResolution: 'abort',
				simulateConflict: true,
				isolation: 'read-committed',
				consistency: 'strong',
				durability: 'persistent',
			};
			const out = helper.handleAtomicSimulations(validated);
			expect(out).not.toBeNull();
			expect(out?.success).toBe(false);
			expect(out?.error).toContain('conflict');
			expect((out as AtomicResult).rollbackExecuted).toBe(true);
		});

		it('applyAtomicOperation returns correct read fragment', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				applyAtomicOperation: (v: AtomicOperation) => Partial<AtomicResult>;
			};
			const validated: AtomicOperation = {
				operation: 'read',
				target: 'memory',
				key: 'rtest',
				isolation: 'serializable',
				timeout: 5000,
				consistency: 'strong',
				durability: 'persistent',
			};
			const out = helper.applyAtomicOperation(validated);
			expect(out.atomicity).toBeDefined();
			expect(out.value).toBeDefined();
		});

		it('applyAtomicOperation returns correct write fragment', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				applyAtomicOperation: (v: AtomicOperation) => Partial<AtomicResult>;
			};
			const validated: AtomicOperation = {
				operation: 'write',
				target: 'memory',
				key: 'wtest',
				value: { data: 'x' },
				isolation: 'read-committed',
				timeout: 5000,
				consistency: 'strong',
				durability: 'persistent',
			};
			const out = helper.applyAtomicOperation(validated);
			expect(out.committed).toBe(true);
			expect(out.version).toBeGreaterThanOrEqual(1);
		});

		it('applyAtomicOperation returns correct CAS fragment when expected matches', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				applyAtomicOperation: (v: AtomicOperation) => Partial<AtomicResult>;
			};
			const validated1: AtomicOperation = {
				operation: 'compare-and-swap',
				target: 'memory',
				key: 'castest',
				expectedValue: null,
				newValue: { counter: 1 },
				isolation: 'read-committed',
				timeout: 5000,
				consistency: 'strong',
				durability: 'persistent',
			};
			const out1 = helper.applyAtomicOperation(validated1);
			expect(out1.swapped).toBe(true);
		});

		it('applyAtomicOperation returns correct delete fragment', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				applyAtomicOperation: (v: AtomicOperation) => Partial<AtomicResult>;
			};
			const validated: AtomicOperation = {
				operation: 'delete',
				target: 'memory',
				key: 'deltest',
				isolation: 'read-committed',
				timeout: 5000,
				consistency: 'strong',
				durability: 'persistent',
			};
			const out = helper.applyAtomicOperation(validated);
			expect(out.deleted).toBe(true);
		});
	});

	describe('Transaction Management', () => {
		it('should begin and commit transactions', async () => {
			const beginResult = (await primitiveLayer.invoke('transaction-manager', {
				action: 'begin',
				isolationLevel: 'read-committed',
				timeout: 30000,
				autoCommit: false,
			})) as TransactionResult;

			expect(beginResult.success).toBe(true);
			expect(beginResult.transactionId).toBeDefined();
			expect(beginResult.state).toBe('active');
			expect(beginResult.isolationLevel).toBe('read-committed');

			const commitResult = (await primitiveLayer.invoke('transaction-manager', {
				action: 'commit',
				transactionId: beginResult.transactionId,
			})) as TransactionResult;

			expect(commitResult.success).toBe(true);
			expect(commitResult.state).toBe('committed');
			expect(commitResult.durability).toEqual(
				expect.objectContaining({
					persistent: true,
					replicated: expect.any(Boolean),
				}),
			);
		});

		it('should rollback transactions on failure', async () => {
			const beginResult = await primitiveLayer.invoke('transaction-manager', {
				action: 'begin',
				isolationLevel: 'serializable',
			});

			const rollbackResult = await primitiveLayer.invoke('transaction-manager', {
				action: 'rollback',
				transactionId: beginResult.transactionId,
				reason: 'user-requested',
			});

			expect(rollbackResult.success).toBe(true);
			expect(rollbackResult.state).toBe('aborted');
			expect(rollbackResult.rollback).toEqual(
				expect.objectContaining({
					executed: true,
					operationsReverted: expect.any(Number),
					compensations: expect.any(Array),
				}),
			);
		});

		it('should handle nested transactions', async () => {
			const parentTx = await primitiveLayer.invoke('transaction-manager', {
				action: 'begin',
				isolationLevel: 'serializable',
			});

			const childTx = await primitiveLayer.invoke('transaction-manager', {
				action: 'begin',
				parentTransactionId: parentTx.transactionId,
				isolationLevel: 'read-committed',
			});

			expect(childTx.success).toBe(true);
			expect(childTx.parentTransactionId).toBe(parentTx.transactionId);
			expect(childTx.nesting).toEqual(
				expect.objectContaining({
					level: 1,
					parentId: parentTx.transactionId,
					savepoints: expect.any(Array),
				}),
			);
		});

		it('should handle transaction deadlocks', async () => {
			const deadlockResult = (await primitiveLayer.invoke('transaction-manager', {
				action: 'begin',
				detectDeadlocks: true,
				deadlockTimeout: 1000,
				simulateDeadlock: true,
			})) as TransactionResult;

			expect(deadlockResult.success).toBe(false);
			expect(deadlockResult.error).toContain('deadlock');
			expect(deadlockResult.detection).toEqual(
				expect.objectContaining({
					detected: true,
					resolution: 'abort',
					victimTransaction: expect.any(String),
				}),
			);
		});

		it('should provide transaction status and metrics', async () => {
			const statusResult = await primitiveLayer.invoke('transaction-manager', {
				action: 'status',
				includeMetrics: true,
			});

			expect(statusResult.success).toBe(true);
			expect(statusResult.transactions).toEqual(
				expect.objectContaining({
					active: expect.any(Number),
					committed: expect.any(Number),
					aborted: expect.any(Number),
				}),
			);
			expect(statusResult.metrics).toEqual(
				expect.objectContaining({
					averageTransactionTime: expect.any(Number),
					conflictRate: expect.any(Number),
					deadlockRate: expect.any(Number),
				}),
			);
		});
	});

	describe('Consistency Validation', () => {
		it('should validate data consistency', async () => {
			const consistencyCheck = {
				target: 'memory',
				validation: 'strong',
				constraints: [
					{ type: 'uniqueness', field: 'id' },
					{ type: 'referential', from: 'orders', to: 'customers' },
					{ type: 'domain', field: 'status', values: ['active', 'inactive'] },
				],
				repair: true,
			};

			const result = (await primitiveLayer.invoke(
				'consistency-validator',
				consistencyCheck,
			)) as ConsistencyResult;

			expect(result.success).toBe(true);
			expect(result.validation).toEqual(
				expect.objectContaining({
					consistent: expect.any(Boolean),
					violations: expect.any(Array),
					repairActions: expect.any(Array),
				}),
			);
			expect(result.constraints).toEqual(
				expect.objectContaining({
					checked: 3,
					satisfied: expect.any(Number),
					violated: expect.any(Number),
				}),
			);
		});

		it('should perform consistency repair operations', async () => {
			const repairOperation = {
				target: 'memory',
				violations: [
					{ type: 'uniqueness', field: 'id', duplicates: ['id1', 'id1'] },
					{ type: 'referential', orphans: ['order123'] },
				],
				strategy: 'automatic',
				backupBeforeRepair: true,
			};

			const result = (await primitiveLayer.invoke(
				'consistency-validator',
				repairOperation,
			)) as ConsistencyResult;

			expect(result.success).toBe(true);
			expect(result.repair).toEqual(
				expect.objectContaining({
					executed: true,
					violationsFixed: expect.any(Number),
					backupCreated: true,
					actions: expect.any(Array),
				}),
			);
		});

		it('should validate cross-reference integrity', async () => {
			const integrityCheck = {
				target: 'memory',
				crossReferences: [
					{ from: 'orders', to: 'customers', field: 'customerId' },
					{ from: 'orderItems', to: 'orders', field: 'orderId' },
				],
				strictMode: true,
			};

			const result = (await primitiveLayer.invoke(
				'consistency-validator',
				integrityCheck,
			)) as ConsistencyResult;

			expect(result.success).toBe(true);
			expect(result.integrity).toEqual(
				expect.objectContaining({
					valid: expect.any(Boolean),
					brokenReferences: expect.any(Array),
					orphanedRecords: expect.any(Array),
				}),
			);
		});

		it('should handle consistency validation failures', async () => {
			const invalidValidation = {
				target: 'nonexistent',
				validation: 'invalid-type',
			};

			await expect(
				primitiveLayer.invoke('consistency-validator', invalidValidation),
			).rejects.toThrow('Invalid validation type: invalid-type');
		});
	});

	describe('Rollback Operations', () => {
		it('should execute operation rollbacks', async () => {
			const rollbackOperation = {
				target: 'memory',
				operationId: 'op-12345',
				rollbackType: 'logical',
				compensationActions: [
					{ type: 'delete', key: 'created-key' },
					{ type: 'restore', key: 'modified-key', value: 'original-value' },
				],
				validateAfterRollback: true,
			};

			const result = (await primitiveLayer.invoke(
				'rollback-handler',
				rollbackOperation,
			)) as RollbackResult;

			expect(result.success).toBe(true);
			expect(result.rollback).toEqual(
				expect.objectContaining({
					executed: true,
					type: 'logical',
					actionsExecuted: 2,
					validation: expect.objectContaining({
						consistent: expect.any(Boolean),
					}),
				}),
			);
		});

		it('should handle cascading rollbacks', async () => {
			const cascadingRollback = {
				target: 'memory',
				transactionId: 'tx-cascade-test',
				cascadeLevel: 'full',
				dependentOperations: [
					{ id: 'op-1', dependencies: [] },
					{ id: 'op-2', dependencies: ['op-1'] },
					{ id: 'op-3', dependencies: ['op-2'] },
				],
			};

			const result = await primitiveLayer.invoke('rollback-handler', cascadingRollback);

			expect(result.success).toBe(true);
			expect(result.cascade).toEqual(
				expect.objectContaining({
					executed: true,
					operationsRolledBack: 3,
					rollbackOrder: ['op-3', 'op-2', 'op-1'],
				}),
			);
		});

		it('should create and restore savepoints', async () => {
			const savepointResult = await primitiveLayer.invoke('rollback-handler', {
				action: 'create-savepoint',
				name: 'test-savepoint',
				transactionId: 'tx-savepoint-test',
			});

			expect(savepointResult.success).toBe(true);
			expect(savepointResult.savepoint).toEqual(
				expect.objectContaining({
					name: 'test-savepoint',
					id: expect.any(String),
					timestamp: expect.any(Date),
				}),
			);

			const restoreResult = await primitiveLayer.invoke('rollback-handler', {
				action: 'restore-savepoint',
				savepointId: savepointResult.savepoint.id,
				transactionId: 'tx-savepoint-test',
			});

			expect(restoreResult.success).toBe(true);
			expect(restoreResult.restoration).toEqual(
				expect.objectContaining({
					executed: true,
					operationsUndone: expect.any(Number),
				}),
			);
		});

		it('should handle rollback failures gracefully', async () => {
			const failingRollback = {
				target: 'memory',
				operationId: 'nonexistent-op',
				rollbackType: 'physical',
				failureHandling: 'compensate',
			};

			const result = await primitiveLayer.invoke('rollback-handler', failingRollback);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.compensation).toEqual(
				expect.objectContaining({
					attempted: true,
					strategy: 'compensate',
				}),
			);
		});

		it('should synthesize rollback operation from legacy input shapes', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				synthesizeRollbackOperation: (input: Record<string, unknown>) => RollbackOperation;
			};

			const cascading = helper.synthesizeRollbackOperation({
				dependentOperations: [{ id: 'op-1', dependencies: [] }],
				cascadeLevel: 'full',
			});
			expect(cascading.action).toBe('cascading-rollback');

			const restore = helper.synthesizeRollbackOperation({
				savepointId: 'sp-1',
				savepointState: { memory: {} },
			});
			expect(restore.action).toBe('restore-savepoint');

			const defaulted = helper.synthesizeRollbackOperation({});
			expect(defaulted.action).toBe('rollback');
		});

		it('summarizeRollbackOperations helper returns correct summary', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				summarizeRollbackOperations: (
					ops?: Array<{ id: string; dependencies: string[] }>,
				) => { total: number; rolledBack: number; order: string[] } | undefined;
			};

			const ops = [
				{ id: 'a', dependencies: [] },
				{ id: 'b', dependencies: ['a'] },
				{ id: 'c', dependencies: ['b'] },
			];
			const summary = helper.summarizeRollbackOperations(ops);
			expect(summary).toBeDefined();
			expect(summary?.order).toEqual(['c', 'b', 'a']);
			expect(summary?.total).toBe(3);
		});

		it('handleMissingRollbackOperation returns failure when operation not found and handling=compensate', () => {
			primitiveLayer = new PrimitiveToolLayer();
			const helper = primitiveLayer as unknown as {
				handleMissingRollbackOperation: (
					validated: any,
					input: Record<string, unknown>,
				) => Record<string, unknown> | null;
			};

			const res = helper.handleMissingRollbackOperation(
				{ operationId: 'does-not-exist', failureHandling: 'compensate' },
				{ failureHandling: 'compensate' },
			);
			expect(res).not.toBeNull();
			expect(res?.success).toBe(false);
			expect((res as any).compensation).toEqual(expect.objectContaining({ attempted: true }));
		});
	});

	describe('Composition Primitives', () => {
		it('should compose atomic operations into workflows', async () => {
			const compositionWorkflow = {
				operations: [
					{
						id: 'read-data',
						type: 'atomic-operation',
						params: { operation: 'read', key: 'source-data' },
					},
					{
						id: 'transform-data',
						type: 'computation',
						params: { function: 'transform', dependencies: ['read-data'] },
					},
					{
						id: 'write-result',
						type: 'atomic-operation',
						params: { operation: 'write', key: 'result-data', dependencies: ['transform-data'] },
					},
				],
				consistency: 'sequential',
				rollbackStrategy: 'full',
			};

			const result = await primitiveLayer.invoke('composition-engine', compositionWorkflow);

			expect(result.success).toBe(true);
			expect(result.workflow).toEqual(
				expect.objectContaining({
					executed: true,
					operationsCompleted: 3,
					consistency: 'sequential',
					executionOrder: ['read-data', 'transform-data', 'write-result'],
				}),
			);
		});

		it('should handle parallel composition with synchronization', async () => {
			const parallelComposition = {
				operations: [
					{
						id: 'parallel-read-1',
						type: 'atomic-operation',
						params: { operation: 'read', key: 'data-1' },
						parallelGroup: 'reads',
					},
					{
						id: 'parallel-read-2',
						type: 'atomic-operation',
						params: { operation: 'read', key: 'data-2' },
						parallelGroup: 'reads',
					},
					{
						id: 'merge-results',
						type: 'computation',
						params: { function: 'merge' },
						dependencies: ['reads'],
					},
				],
				synchronization: 'barrier',
				timeoutMs: 10000,
			};

			const result = await primitiveLayer.invoke('composition-engine', parallelComposition);

			expect(result.success).toBe(true);
			expect(result.parallelExecution).toEqual(
				expect.objectContaining({
					groups: { reads: 2 },
					synchronization: 'barrier',
					maxConcurrency: expect.any(Number),
				}),
			);
		});

		it('should implement composition patterns', async () => {
			const patternComposition = {
				pattern: 'saga',
				steps: [
					{ service: 'order-service', action: 'create-order', compensation: 'cancel-order' },
					{ service: 'payment-service', action: 'charge-payment', compensation: 'refund-payment' },
					{ service: 'inventory-service', action: 'reserve-items', compensation: 'release-items' },
				],
				failureHandling: 'compensate',
			};

			const result = await primitiveLayer.invoke('composition-engine', patternComposition);

			expect(result.success).toBe(true);
			expect(result.saga).toEqual(
				expect.objectContaining({
					pattern: 'saga',
					stepsExecuted: 3,
					compensations: expect.any(Array),
				}),
			);
		});

		it('should validate composition constraints', async () => {
			const invalidComposition = {
				operations: [
					{
						id: 'circular-dep-1',
						dependencies: ['circular-dep-2'],
					},
					{
						id: 'circular-dep-2',
						dependencies: ['circular-dep-1'],
					},
				],
			};

			await expect(primitiveLayer.invoke('composition-engine', invalidComposition)).rejects.toThrow(
				'Circular dependency detected',
			);
		});
	});

	describe('Error Handling and Recovery', () => {
		it('should handle operation timeouts gracefully', async () => {
			const timeoutOperation = {
				operation: 'read',
				target: 'slow-storage',
				timeout: 100,
				timeoutAction: 'abort',
			};

			const result = await primitiveLayer.invoke('atomic-operation', timeoutOperation);

			expect(result.success).toBe(false);
			expect(result.error).toContain('timeout');
			expect(result.timeoutHandling).toEqual(
				expect.objectContaining({
					action: 'abort',
					executed: true,
				}),
			);
		});

		it('should provide detailed error context', async () => {
			const errorOperation = {
				operation: 'write',
				target: 'readonly-storage',
				simulateError: 'permission-denied',
			};

			const result = await primitiveLayer.invoke('atomic-operation', errorOperation);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.errorContext).toEqual(
				expect.objectContaining({
					category: 'permission',
					recoverable: expect.any(Boolean),
					suggestions: expect.any(Array),
				}),
			);
		});
	});

	describe('Performance and Optimization', () => {
		it('should track primitive operation metrics', async () => {
			// Execute multiple primitive operations
			await primitiveLayer.invoke('atomic-operation', { operation: 'read', key: 'perf-test-1' });
			await primitiveLayer.invoke('transaction-manager', { action: 'begin' });
			await primitiveLayer.invoke('consistency-validator', { target: 'memory' });

			const metrics = primitiveLayer.getPrimitiveMetrics();
			expect(metrics.totalOperations).toBe(3);
			expect(metrics.averageOperationTime).toBeGreaterThan(0);
			expect(metrics.operationTypes).toEqual(
				expect.objectContaining({
					'atomic-operation': 1,
					'transaction-manager': 1,
					'consistency-validator': 1,
				}),
			);
		});

		it('should optimize primitive composition execution', async () => {
			const optimizedComposition = {
				operations: Array.from({ length: 10 }, (_, i) => ({
					id: `op-${i}`,
					type: 'atomic-operation',
					params: { operation: 'read', key: `key-${i}` },
				})),
				optimization: {
					enabled: true,
					batchSize: 5,
					parallelism: 3,
				},
			};

			const result = await primitiveLayer.invoke('composition-engine', optimizedComposition);

			expect(result.success).toBe(true);
			expect(result.optimization).toEqual(
				expect.objectContaining({
					enabled: true,
					batchesExecuted: 2,
					parallelOperations: 3,
					executionTime: expect.any(Number),
				}),
			);
		});
	});

	describe('Integration with Tool Layer', () => {
		it('should properly integrate with base tool layer', () => {
			expect(primitiveLayer.getLayerType()).toBe('primitive');
			expect(primitiveLayer.getCapabilities()).toEqual(
				expect.arrayContaining(['atomic-operations', 'consistency-guarantees']),
			);
		});

		it('should emit primitive operation events', async () => {
			const events: any[] = [];
			primitiveLayer.on('primitive-executed', (event) => events.push(event));

			await primitiveLayer.invoke('atomic-operation', { operation: 'read', key: 'event-test' });

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual(
				expect.objectContaining({
					toolId: 'atomic-operation',
					layerType: 'primitive',
					success: expect.any(Boolean),
					executionTime: expect.any(Number),
				}),
			);
		});
	});
});
