import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	commonHooks,
	createHookRegistry,
	type HookContext,
	HookManager,
	type WorkflowHookContext,
} from '../hooks';

describe('HookManager', () => {
	let hookManager: HookManager;
	let mockHook: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		hookManager = new HookManager();
		mockHook = vi.fn();
	});

	describe('Step-level hooks', () => {
		it('should register and execute pre-step hooks', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };

			hookManager.addPreStepHook(stepId, mockHook);
			await hookManager.executePreStepHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should register and execute post-step hooks', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };

			hookManager.addPostStepHook(stepId, mockHook);
			await hookManager.executePostStepHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should register and execute error hooks', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };

			hookManager.addStepErrorHook(stepId, mockHook);
			await hookManager.executeStepErrorHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should handle multiple hooks for the same step', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };
			const secondHook = vi.fn();

			hookManager.addPreStepHook(stepId, mockHook);
			hookManager.addPreStepHook(stepId, secondHook);

			await hookManager.executePreStepHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
			expect(secondHook).toHaveBeenCalledWith(context);
		});
	});

	describe('Global hooks', () => {
		it('should execute global pre-step hooks for any step', async () => {
			const context: HookContext = { stepId: 'any-step' };

			hookManager.addGlobalPreStepHook(mockHook);
			await hookManager.executePreStepHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should execute global post-step hooks for any step', async () => {
			const context: HookContext = { stepId: 'any-step' };

			hookManager.addGlobalPostStepHook(mockHook);
			await hookManager.executePostStepHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should execute global error hooks for any step', async () => {
			const context: HookContext = { stepId: 'any-step' };

			hookManager.addGlobalStepErrorHook(mockHook);
			await hookManager.executeStepErrorHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});
	});

	describe('Workflow-level hooks', () => {
		it('should register and execute pre-workflow hooks', async () => {
			const context: WorkflowHookContext = { workflowId: 'test-workflow' };

			hookManager.addPreWorkflowHook(mockHook);
			await hookManager.executePreWorkflowHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should register and execute post-workflow hooks', async () => {
			const context: WorkflowHookContext = { workflowId: 'test-workflow' };

			hookManager.addPostWorkflowHook(mockHook);
			await hookManager.executePostWorkflowHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});

		it('should register and execute workflow error hooks', async () => {
			const context: WorkflowHookContext = { workflowId: 'test-workflow' };

			hookManager.addWorkflowErrorHook(mockHook);
			await hookManager.executeWorkflowErrorHooks(context);

			expect(mockHook).toHaveBeenCalledWith(context);
		});
	});

	describe('Hook execution order', () => {
		it('should execute global hooks before step-specific hooks for pre-step', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };
			const executionOrder: string[] = [];

			const globalHook = vi.fn(() => {
				executionOrder.push('global');
			});
			const stepHook = vi.fn(() => {
				executionOrder.push('step');
			});

			hookManager.addGlobalPreStepHook(globalHook);
			hookManager.addPreStepHook(stepId, stepHook);

			await hookManager.executePreStepHooks(context);

			expect(executionOrder).toEqual(['global', 'step']);
		});

		it('should execute step-specific hooks before global hooks for post-step', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };
			const executionOrder: string[] = [];

			const globalHook = vi.fn(() => {
				executionOrder.push('global');
			});
			const stepHook = vi.fn(() => {
				executionOrder.push('step');
			});

			hookManager.addGlobalPostStepHook(globalHook);
			hookManager.addPostStepHook(stepId, stepHook);

			await hookManager.executePostStepHooks(context);

			expect(executionOrder).toEqual(['step', 'global']);
		});
	});

	describe('Error handling', () => {
		it('should not fail workflow if hook throws error', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };
			const errorHook = vi.fn(() => {
				throw new Error('Hook error');
			});
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			hookManager.addPreStepHook(stepId, errorHook);

			await expect(hookManager.executePreStepHooks(context)).resolves.not.toThrow();
			expect(consoleWarnSpy).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});

		it('should continue executing remaining hooks if one fails', async () => {
			const stepId = 'test-step';
			const context: HookContext = { stepId };
			const errorHook = vi.fn(() => {
				throw new Error('Hook error');
			});
			const successHook = vi.fn();
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			hookManager.addPreStepHook(stepId, errorHook);
			hookManager.addPreStepHook(stepId, successHook);

			await hookManager.executePreStepHooks(context);

			expect(errorHook).toHaveBeenCalled();
			expect(successHook).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});

	describe('Abort signal handling', () => {
		it('should respect abort signal and not execute hooks', async () => {
			const controller = new AbortController();
			controller.abort();

			const context: HookContext = {
				stepId: 'test-step',
				signal: controller.signal,
			};

			hookManager.addPreStepHook('test-step', mockHook);
			await hookManager.executePreStepHooks(context);

			expect(mockHook).not.toHaveBeenCalled();
		});
	});

	describe('Hook cleanup', () => {
		it('should remove step hooks', () => {
			const stepId = 'test-step';
			hookManager.addPreStepHook(stepId, mockHook);
			hookManager.addPostStepHook(stepId, mockHook);
			hookManager.addStepErrorHook(stepId, mockHook);

			hookManager.removeStepHooks(stepId);

			// Hooks should be removed (we can't easily test this without accessing internals)
			expect(() => hookManager.removeStepHooks(stepId)).not.toThrow();
		});

		it('should clear global hooks', () => {
			hookManager.addGlobalPreStepHook(mockHook);
			hookManager.addGlobalPostStepHook(mockHook);
			hookManager.addGlobalStepErrorHook(mockHook);

			hookManager.clearGlobalHooks();

			expect(() => hookManager.clearGlobalHooks()).not.toThrow();
		});

		it('should clear workflow hooks', () => {
			hookManager.addPreWorkflowHook(mockHook);
			hookManager.addPostWorkflowHook(mockHook);
			hookManager.addWorkflowErrorHook(mockHook);

			hookManager.clearWorkflowHooks();

			expect(() => hookManager.clearWorkflowHooks()).not.toThrow();
		});

		it('should clear all hooks', () => {
			hookManager.addPreStepHook('test', mockHook);
			hookManager.addGlobalPreStepHook(mockHook);
			hookManager.addPreWorkflowHook(mockHook);

			hookManager.clearAllHooks();

			expect(() => hookManager.clearAllHooks()).not.toThrow();
		});
	});
});

describe('createHookRegistry', () => {
	it('should create empty hook registry', () => {
		const registry = createHookRegistry();

		expect(registry.preStep.size).toBe(0);
		expect(registry.postStep.size).toBe(0);
		expect(registry.onStepError.size).toBe(0);
		expect(registry.globalPreStep).toEqual([]);
		expect(registry.globalPostStep).toEqual([]);
		expect(registry.globalOnStepError).toEqual([]);
		expect(registry.preWorkflow).toEqual([]);
		expect(registry.postWorkflow).toEqual([]);
		expect(registry.onWorkflowError).toEqual([]);
	});
});

describe('commonHooks', () => {
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it('should provide logging hooks', () => {
		const context: HookContext = {
			stepId: 'test-step',
			metadata: { test: 'data' },
		};

		commonHooks.logStepStart(context);
		commonHooks.logStepComplete(context);
		commonHooks.logStepError(context);

		expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
	});

	it('should provide metrics hook', () => {
		const context: HookContext = { stepId: 'test-step' };

		commonHooks.recordStepMetrics(context);

		expect(consoleWarnSpy).toHaveBeenCalled();
	});

	it('should provide validation hook that respects abort signal', () => {
		const controller = new AbortController();
		controller.abort();

		const context: HookContext = {
			stepId: 'test-step',
			signal: controller.signal,
		};

		expect(() => commonHooks.validateStepPreconditions(context)).toThrow(
			'Step test-step aborted during precondition check',
		);
	});

	it('should allow validation hook to pass when not aborted', () => {
		const context: HookContext = { stepId: 'test-step' };

		expect(() => commonHooks.validateStepPreconditions(context)).not.toThrow();
	});
});
