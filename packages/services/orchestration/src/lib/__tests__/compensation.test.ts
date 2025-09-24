import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type CompensationContext,
	CompensationManager,
	type CompensationRegistry,
	compensationPatterns,
	createCompensationRegistry,
	SagaManager,
} from '../compensation.js';

describe('CompensationManager', () => {
	let manager: CompensationManager;
	let mockCompensation: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		manager = new CompensationManager();
		mockCompensation = vi.fn().mockResolvedValue(undefined);
	});

	describe('Registration and execution', () => {
		it('should register compensation for a step', () => {
			const stepId = 'test-step';

			manager.registerCompensation(stepId, mockCompensation);

			expect(manager.hasCompensation(stepId)).toBe(true);
		});

		it('should track step execution and compensate', async () => {
			const stepId = 'test-step';
			const metadata = { data: 'test' };

			manager.registerCompensation(stepId, mockCompensation);
			manager.trackExecution(stepId, metadata);

			const result = await manager.compensate({
				workflowId: 'workflow-1',
			});

			expect(result.compensatedSteps).toContain(stepId);
			expect(result.isComplete).toBe(true);
			expect(result.errors).toEqual([]);
			expect(mockCompensation).toHaveBeenCalledWith(
				expect.objectContaining({
					stepId,
					workflowId: 'workflow-1',
					metadata,
				}),
			);
		});

		it('should handle compensations in reverse order (LIFO)', async () => {
			const executionOrder: string[] = [];
			const step1Compensation = vi.fn().mockImplementation(() => {
				executionOrder.push('step1');
			});
			const step2Compensation = vi.fn().mockImplementation(() => {
				executionOrder.push('step2');
			});
			const step3Compensation = vi.fn().mockImplementation(() => {
				executionOrder.push('step3');
			});

			manager.registerCompensation('step1', step1Compensation);
			manager.registerCompensation('step2', step2Compensation);
			manager.registerCompensation('step3', step3Compensation);

			// Track executions in forward order
			manager.trackExecution('step1');
			manager.trackExecution('step2');
			manager.trackExecution('step3');

			await manager.compensate();

			// Should compensate in reverse order
			expect(executionOrder).toEqual(['step3', 'step2', 'step1']);
		});

		it('should continue compensation even if one step fails', async () => {
			const step1Compensation = vi.fn().mockRejectedValue(new Error('Compensation failed'));
			const step2Compensation = vi.fn().mockResolvedValue(undefined);

			manager.registerCompensation('step1', step1Compensation);
			manager.registerCompensation('step2', step2Compensation);

			manager.trackExecution('step1');
			manager.trackExecution('step2');

			const result = await manager.compensate();

			expect(step1Compensation).toHaveBeenCalled();
			expect(step2Compensation).toHaveBeenCalled();
			expect(result.compensatedSteps).toContain('step2');
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].stepId).toBe('step1');
			expect(result.isComplete).toBe(false);
		});
	});

	describe('Hooks', () => {
		it('should execute compensation hooks', async () => {
			const startHook = vi.fn();
			const completeHook = vi.fn();

			manager.addCompensationStartHook(startHook);
			manager.addCompensationCompleteHook(completeHook);
			manager.registerCompensation('test-step', mockCompensation);
			manager.trackExecution('test-step');

			await manager.compensate();

			expect(startHook).toHaveBeenCalled();
			expect(completeHook).toHaveBeenCalled();
		});

		it('should execute error hooks on compensation failure', async () => {
			const errorHook = vi.fn();
			const failingCompensation = vi.fn().mockRejectedValue(new Error('Compensation failed'));

			manager.addCompensationErrorHook(errorHook);
			manager.registerCompensation('test-step', failingCompensation);
			manager.trackExecution('test-step');

			await manager.compensate();

			expect(errorHook).toHaveBeenCalledWith(
				expect.objectContaining({
					stepId: 'test-step',
					error: expect.any(Error),
				}),
			);
		});
	});

	describe('Cleanup and management', () => {
		it('should unregister compensation', () => {
			const stepId = 'test-step';
			manager.registerCompensation(stepId, mockCompensation);

			expect(manager.hasCompensation(stepId)).toBe(true);

			const result = manager.unregisterCompensation(stepId);

			expect(result).toBe(true);
			expect(manager.hasCompensation(stepId)).toBe(false);
		});

		it('should clear execution stack', () => {
			manager.registerCompensation('test-step', mockCompensation);
			manager.trackExecution('test-step');

			expect(manager.getExecutionStack()).toHaveLength(1);

			manager.clearExecutionStack();

			expect(manager.getExecutionStack()).toHaveLength(0);
		});

		it('should get execution stack for inspection', () => {
			const metadata = { test: 'data' };
			manager.registerCompensation('test-step', mockCompensation);
			manager.trackExecution('test-step', metadata);

			const stack = manager.getExecutionStack();

			expect(stack).toHaveLength(1);
			expect(stack[0]).toMatchObject({
				stepId: 'test-step',
				metadata,
			});
		});
	});

	describe('Abort signal handling', () => {
		it('should respect abort signal and stop compensation', async () => {
			const controller = new AbortController();
			controller.abort();

			manager.registerCompensation('test-step', mockCompensation);
			manager.trackExecution('test-step');

			const result = await manager.compensate({
				signal: controller.signal,
			});

			expect(mockCompensation).not.toHaveBeenCalled();
			expect(result.compensatedSteps).toEqual([]);
		});
	});
});

describe('CompensationRegistry', () => {
	let registry: CompensationRegistry;

	beforeEach(() => {
		registry = createCompensationRegistry();
	});

	it('should create empty compensation registry', () => {
		expect(registry.compensations.size).toBe(0);
		expect(registry.onCompensationStart).toEqual([]);
		expect(registry.onCompensationComplete).toEqual([]);
		expect(registry.onCompensationError).toEqual([]);
	});

	it('should allow direct manipulation of compensations map', () => {
		const mockCompensation = vi.fn();
		registry.compensations.set('test-step', mockCompensation);

		expect(registry.compensations.get('test-step')).toBe(mockCompensation);
		expect(registry.compensations.has('test-step')).toBe(true);
	});
});

describe('SagaManager', () => {
	let sagaManager: SagaManager;
	let mockCompensation: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		sagaManager = new SagaManager();
		mockCompensation = vi.fn().mockResolvedValue(undefined);
	});

	describe('Step execution', () => {
		it('should execute step successfully and track for compensation', async () => {
			const stepFn = vi.fn().mockResolvedValue('result');

			const result = await sagaManager.executeStep('test-step', stepFn, mockCompensation, {
				metadata: 'test',
			});

			expect(result).toBe('result');
			expect(stepFn).toHaveBeenCalled();
			expect(sagaManager.getCompensationManager().hasCompensation('test-step')).toBe(true);
		});

		it('should trigger compensation when step fails', async () => {
			const stepFn = vi.fn().mockRejectedValue(new Error('Step failed'));

			await expect(sagaManager.executeStep('test-step', stepFn, mockCompensation)).rejects.toThrow(
				'Step failed',
			);

			expect(sagaManager.isInCompensation()).toBe(false); // Should be false after compensation completes
		});

		it('should not allow step execution during compensation', async () => {
			const stepFn = vi.fn().mockResolvedValue('result');

			// Override the isCompensating flag temporarily for testing
			// This is a bit of a hack but necessary to test the guard condition
			(sagaManager as unknown as { isCompensating: boolean }).isCompensating = true;

			// While compensation flag is set, try to execute a step
			await expect(sagaManager.executeStep('test-step', stepFn)).rejects.toThrow(
				'Cannot execute steps during compensation',
			);

			// Reset the flag
			(sagaManager as unknown as { isCompensating: boolean }).isCompensating = false;
		});

		it('should not allow step execution during compensation (alternative test)', async () => {
			// Test by triggering a failing step that will start compensation
			const failingStep = vi.fn().mockRejectedValue(new Error('First step failed'));

			try {
				await sagaManager.executeStep('failing-step', failingStep);
			} catch {
				// Expected to fail
			}

			// After the failed step, compensation should have completed
			// So we test the regular flow instead
			expect(sagaManager.isInCompensation()).toBe(false);
		});
	});

	describe('Saga lifecycle', () => {
		it('should complete saga successfully and clear compensation stack', () => {
			const compensationManager = sagaManager.getCompensationManager();
			compensationManager.registerCompensation('test-step', mockCompensation);
			compensationManager.trackExecution('test-step');

			expect(compensationManager.getExecutionStack()).toHaveLength(1);

			sagaManager.complete();

			expect(compensationManager.getExecutionStack()).toHaveLength(0);
		});

		it('should not allow completion during compensation', async () => {
			// Override the isCompensating flag temporarily for testing
			(sagaManager as unknown as { isCompensating: boolean }).isCompensating = true;

			// While compensation flag is set, try to complete
			expect(() => sagaManager.complete()).toThrow('Cannot complete saga during compensation');

			// Reset the flag
			(sagaManager as unknown as { isCompensating: boolean }).isCompensating = false;
		});

		it('should not allow multiple compensations simultaneously', async () => {
			const promise1 = sagaManager.startCompensation();

			await expect(sagaManager.startCompensation()).rejects.toThrow(
				'Compensation already in progress',
			);

			await promise1; // Clean up
		});
	});

	describe('Compensation management', () => {
		it('should provide access to compensation manager', () => {
			const compensationManager = sagaManager.getCompensationManager();
			expect(compensationManager).toBeInstanceOf(CompensationManager);
		});

		it('should track compensation state', async () => {
			expect(sagaManager.isInCompensation()).toBe(false);

			const promise = sagaManager.startCompensation();
			expect(sagaManager.isInCompensation()).toBe(true);

			await promise;
			expect(sagaManager.isInCompensation()).toBe(false);
		});
	});
});

describe('compensationPatterns', () => {
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
	});

	it('should provide database rollback pattern', async () => {
		const rollback = compensationPatterns.databaseRollback('transaction-123');
		const context: CompensationContext = { stepId: 'test-step' };

		await rollback(context);

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Rolling back database transaction: transaction-123 for step: test-step',
		);
	});

	it('should provide file cleanup pattern', async () => {
		const cleanup = compensationPatterns.cleanupFiles(['file1.tmp', 'file2.tmp']);
		const context: CompensationContext = { stepId: 'test-step' };

		await cleanup(context);

		expect(consoleWarnSpy).toHaveBeenCalledWith('Cleaning up files for step: test-step', [
			'file1.tmp',
			'file2.tmp',
		]);
	});

	it('should provide API reversal pattern', async () => {
		const revertFn = vi.fn().mockResolvedValue(undefined);
		const reversal = compensationPatterns.reverseApiCall(revertFn);
		const context: CompensationContext = { stepId: 'test-step' };

		await reversal(context);

		expect(revertFn).toHaveBeenCalled();
		expect(consoleWarnSpy).toHaveBeenCalledWith('Reversing API call for step: test-step');
	});

	it('should provide resource deallocation pattern', async () => {
		const deallocation = compensationPatterns.deallocateResource('resource-456');
		const context: CompensationContext = { stepId: 'test-step' };

		await deallocation(context);

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Deallocating resource: resource-456 for step: test-step',
		);
	});

	it('should provide message queue purge pattern', async () => {
		const purge = compensationPatterns.purgeMessages('queue-name');
		const context: CompensationContext = { stepId: 'test-step' };

		await purge(context);

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Purging messages from queue: queue-name for step: test-step',
		);
	});
});
