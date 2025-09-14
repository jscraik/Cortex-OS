import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEngine, orchestrateTask } from '../src/prp-integration.js';
import { provideOrchestration } from '../src/service.js';
import type { Task } from '../src/types.js';
import { TaskStatus } from '../src/types.js';

const executePRPCycle = vi.fn();
const registerNeuron = vi.fn();
vi.mock('@cortex-os/prp-runner', () => ({
	PRPOrchestrator: class {
		registerNeuron = registerNeuron;
		executePRPCycle = executePRPCycle;
	},
}));

const baseTask: Task = {
	id: 't1',
	title: 'test task',
	description: 'test description',
	status: TaskStatus.PENDING,
	priority: 1,
	dependencies: [],
	requiredCapabilities: [],
	context: {},
	metadata: {},
	createdAt: new Date(),
};

describe('Engine Lifecycle Management Tests', () => {
	afterEach(() => {
		executePRPCycle.mockReset();
		registerNeuron.mockReset();
	});

	it('should provide a shutdown method that cleans up active orchestrations', async () => {
		const orchestration = provideOrchestration();

		expect(orchestration.shutdown).toBeDefined();
		expect(typeof orchestration.shutdown).toBe('function');

		// Should not throw when called
		await expect(orchestration.shutdown()).resolves.not.toThrow();
	});

	it('should clear active orchestrations on cleanup', async () => {
		const engine = createEngine({ maxConcurrentOrchestrations: 5 });

		// Set up a long-running task
		let resolver: (value: any) => void;
		const longRunningPromise = new Promise((resolve) => {
			resolver = resolve;
		});
		executePRPCycle.mockReturnValue(longRunningPromise);

		// Start orchestration
		const orchestrationPromise = orchestrateTask(engine, baseTask, []);

		// Verify it's active
		expect(engine.active.size).toBe(1);

		// Call cleanup
		const cleanupPromise = import('../src/prp-integration.js').then(
			({ cleanup }) => cleanup(engine),
		);

		// Verify active map is cleared
		await cleanupPromise;
		expect(engine.active.size).toBe(0);

		// Resolve the task to clean up
		resolver?.({
			phase: 'completed',
			outputs: {},
			metadata: { cerebrum: { decision: '', reasoning: '' } },
		});
		await orchestrationPromise;
	});

	it('should handle shutdown gracefully with no active orchestrations', async () => {
		const orchestration = provideOrchestration();

		// Multiple shutdowns should be safe
		await orchestration.shutdown();
		await orchestration.shutdown();
	});
});

describe('Task-Level Timeout Tests', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		executePRPCycle.mockReset();
	});

	it('should timeout tasks that exceed executionTimeout', async () => {
		const engine = createEngine({
			maxConcurrentOrchestrations: 5,
			executionTimeout: 1000, // 1 second timeout
		});

		// Mock a task that never resolves
		const neverResolvingPromise = new Promise(() => {});
		executePRPCycle.mockReturnValue(neverResolvingPromise);

		const orchestrationPromise = orchestrateTask(engine, baseTask, []);

		// Fast forward past timeout
		vi.advanceTimersByTime(1500);

		await expect(orchestrationPromise).rejects.toThrow(
			/Task execution timeout after 1000ms for task t1/,
		);
	});

	it('should not timeout tasks that complete within timeout', async () => {
		const engine = createEngine({
			maxConcurrentOrchestrations: 5,
			executionTimeout: 5000, // 5 second timeout
		});

		const quickResult = {
			phase: 'completed',
			outputs: { result: 'success' },
			metadata: { cerebrum: { decision: 'complete', reasoning: 'done' } },
		};

		executePRPCycle.mockResolvedValue(quickResult);

		const orchestrationPromise = orchestrateTask(engine, baseTask, []);

		// Fast forward only 1 second (well within timeout)
		vi.advanceTimersByTime(1000);

		const result = await orchestrationPromise;
		expect(result.success).toBe(true);
		expect(result.executionResults).toEqual({ result: 'success' });
	});

	it('should clean up active tasks map on timeout', async () => {
		const engine = createEngine({
			maxConcurrentOrchestrations: 5,
			executionTimeout: 1000,
		});

		executePRPCycle.mockReturnValue(new Promise(() => {})); // Never resolves

		const orchestrationPromise = orchestrateTask(engine, baseTask, []);

		// Verify task is in active map
		expect(engine.active.size).toBe(1);

		// Fast forward to timeout
		vi.advanceTimersByTime(1500);

		try {
			await orchestrationPromise;
			expect.fail('Expected timeout error');
		} catch (error) {
			expect((error as Error).message).toMatch(/Task execution timeout/);
		}

		// Active map should be cleaned up
		expect(engine.active.size).toBe(0);
	});

	it('should use default timeout when not specified', () => {
		const engine = createEngine({});
		expect(engine.config.executionTimeout).toBe(1800000); // 30 minutes default
	});

	it('should allow custom timeout configuration', () => {
		const customTimeout = 60000; // 1 minute
		const engine = createEngine({ executionTimeout: customTimeout });
		expect(engine.config.executionTimeout).toBe(customTimeout);
	});

	it('should emit orchestrationCompleted event on successful completion', async () => {
		const engine = createEngine({ maxConcurrentOrchestrations: 5 });

		const mockResult = {
			phase: 'completed',
			outputs: { success: true },
			metadata: { cerebrum: { decision: 'complete', reasoning: 'success' } },
		};

		executePRPCycle.mockResolvedValue(mockResult);

		const eventPromise = new Promise((resolve) => {
			engine.emitter.once('orchestrationCompleted', resolve);
		});

		await orchestrateTask(engine, baseTask, []);

		const event = await eventPromise;
		expect(event).toMatchObject({
			type: 'task_completed',
			taskId: 't1',
			source: 'PRPEngine',
		});
	});

	it('should not emit orchestrationCompleted event on timeout', async () => {
		const engine = createEngine({
			maxConcurrentOrchestrations: 5,
			executionTimeout: 1000,
		});

		executePRPCycle.mockReturnValue(new Promise(() => {}));

		const eventSpy = vi.fn();
		engine.emitter.on('orchestrationCompleted', eventSpy);

		const orchestrationPromise = orchestrateTask(engine, baseTask, []);

		vi.advanceTimersByTime(1500);

		try {
			await orchestrationPromise;
			expect.fail('Expected timeout error');
		} catch (error) {
			expect((error as Error).message).toMatch(/Task execution timeout/);
		}

		// Event should not have been emitted
		expect(eventSpy).not.toHaveBeenCalled();
	});

	it('should suppress late success emission after timeout', async () => {
		const engine = createEngine({
			maxConcurrentOrchestrations: 5,
			executionTimeout: 1000,
		});

		let resolveFn: (v: any) => void = () => {};
		const delayedPromise = new Promise((resolve) => {
			resolveFn = resolve;
		});
		executePRPCycle.mockReturnValue(delayedPromise);

		const eventSpy = vi.fn();
		engine.emitter.on('orchestrationCompleted', eventSpy);

		const orchestrationPromise = orchestrateTask(engine, baseTask, []);

		// Advance past timeout
		vi.advanceTimersByTime(1500);
		await expect(orchestrationPromise).rejects.toThrow(/timeout/);

		// Now resolve underlying promise (should be suppressed)
		resolveFn({
			phase: 'completed',
			outputs: { suppressed: true },
			metadata: { cerebrum: { decision: 'late', reasoning: 'late-complete' } },
		});

		// Flush microtasks
		await Promise.resolve();

		expect(eventSpy).not.toHaveBeenCalled();
	});
});
