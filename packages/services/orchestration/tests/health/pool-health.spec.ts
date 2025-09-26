import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentHealthMonitor } from '../../../orchestration/src/lib/agent-health-monitor.js';

describe('AgentHealthMonitor proactive checks', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should not rely on Math.random for health metrics', async () => {
		const monitor = new AgentHealthMonitor({
			healthCheckIntervalMs: 10,
			cleanupIntervalMs: 10,
			enableProactiveChecks: true,
		});
		monitor.registerAgent('agent-1', ['testing']);

		const randomSpy = vi.spyOn(Math, 'random');

		await (monitor as unknown as {
			performHealthChecks: () => Promise<void>;
		}).performHealthChecks();

		expect(randomSpy).not.toHaveBeenCalled();
	});
});
