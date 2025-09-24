import { describe, expect, it, vi } from 'vitest';
import { startScheduler } from '../core/scheduler.js';

describe('scheduler', () => {
	it('runs task on schedule', () => {
		vi.useFakeTimers();
		const task = vi.fn();
		const stop = startScheduler(task, 1000);
		vi.advanceTimersByTime(3000);
		stop();
		vi.useRealTimers();
		expect(task).toHaveBeenCalledTimes(3);
	});
});
