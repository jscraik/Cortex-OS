import { describe, expect, it } from 'vitest';
import { AgentHealthMonitor } from '../../../orchestration/src/lib/agent-health-monitor.js';

describe('AgentHealthMonitor proactive checks', () => {
	it('reports live pool counts based on agent activity', () => {
		const monitor = new AgentHealthMonitor({
			healthCheckIntervalMs: 10,
			cleanupIntervalMs: 10,
			enableProactiveChecks: false,
		});

		monitor.registerAgent('agent-alpha', ['testing'], {
			minSuccessRate: 0.4,
		});
		monitor.registerAgent('agent-beta', ['testing'], {
			minSuccessRate: 0.75,
		});
		monitor.registerAgent('agent-gamma', ['testing'], {
			minSuccessRate: 0.5,
			maxConsecutiveFailures: 2,
		});

		monitor.recordAgentActivity('agent-alpha', {
			success: true,
			responseTime: 25,
		});

		monitor.recordAgentActivity('agent-beta', {
			success: true,
			responseTime: 30,
		});
		monitor.recordAgentActivity('agent-beta', {
			success: false,
			responseTime: 60,
		});

		monitor.recordAgentActivity('agent-gamma', {
			success: false,
			responseTime: 80,
		});
		monitor.recordAgentActivity('agent-gamma', {
			success: false,
			responseTime: 90,
		});
		monitor.recordAgentActivity('agent-gamma', {
			success: false,
			responseTime: 100,
		});

		const summary = monitor.getSystemHealthSummary();
		const statuses = monitor.getAgentHealthStatuses();
		const counts = statuses.reduce(
			(acc, status) => {
				acc[status.status] = (acc[status.status] ?? 0) + 1;
				return acc;
			},
			{ healthy: 0, degraded: 0, unhealthy: 0, offline: 0 } as Record<string, number>,
		);

		expect(summary.totalAgents).toBe(statuses.length);
		expect(summary.healthy).toBe(counts.healthy);
		expect(summary.degraded).toBe(counts.degraded);
		expect(summary.unhealthy).toBe(counts.unhealthy);
		expect(summary.offline).toBe(counts.offline);
		expect(summary.healthy).toBeGreaterThanOrEqual(1);
		expect(summary.systemStatus).toBe('degraded');

		const healthyStatus = monitor.getAgentHealthStatus('agent-alpha');
		expect(healthyStatus?.status).toBe('healthy');
		const degradedStatus = monitor.getAgentHealthStatus('agent-beta');
		expect(degradedStatus?.status).toBe('degraded');
		const unhealthyStatus = monitor.getAgentHealthStatus('agent-gamma');
		expect(unhealthyStatus?.status).toBe('unhealthy');
	});
});
