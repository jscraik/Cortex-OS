import { describe, expect, it, vi } from 'vitest';
import { getDefaultOrchestrationPlanningContext } from '../../src/mcp/core-adapter.js';
import { orchestrationSecurityToolAllowList } from '../../src/mcp/tools.js';
import { SecurityCoordinator } from '../../src/security/security-coordinator.js';
import { OrchestrationStrategy, TaskStatus } from '../../src/types.js';

describe('SecurityCoordinator', () => {
	const publish = vi.fn(async () => {});
	const coordinator = new SecurityCoordinator({ publish });

	it('adjusts strategy and emits compliance envelopes', async () => {
		const base = getDefaultOrchestrationPlanningContext(OrchestrationStrategy.PARALLEL, 1_200, []);
		const context = {
			task: {
				id: '123e4567-e89b-12d3-a456-426614174000',
				title: 'Demo task',
				description: 'Validate coordinator behaviour',
				status: TaskStatus.PLANNING,
				priority: 6,
				dependencies: [],
				requiredCapabilities: [],
				context: {},
				metadata: {},
				createdAt: new Date(),
			},
			availableAgents: [],
			resources: base.resources!,
			constraints: base.constraints!,
			preferences: base.preferences!,
			compliance: base.compliance!,
		};

		const violations = [
			{
				scanId: 'scan-sec-1',
				violationId: 'v-critical',
				standard: 'nist' as const,
				rule: 'SC-7',
				file: 'src/security.ts',
				severity: 'high' as const,
				violatedAt: new Date().toISOString(),
			},
		];

		const result = await coordinator.evaluate(context, violations);

		expect(result.strategy).toBe(OrchestrationStrategy.SEQUENTIAL);
		expect(result.context.preferences.strategy).toBe(OrchestrationStrategy.SEQUENTIAL);
		expect(result.context.compliance?.riskLevel).toBe(result.summary.riskLevel);
		expect(result.summary.requiresHumanReview).toBe(true);

		expect(publish).toHaveBeenCalledTimes(1);
		const envelope = publish.mock.calls[0][0];
		expect(envelope.type).toBe('cortex_sec.compliance.violation');
		expect(envelope.headers?.['x-brainwav-brand']).toBe('brAInwav Cortex Security');

		expect(orchestrationSecurityToolAllowList).toEqual(
			expect.arrayContaining(['run_semgrep_scan']),
		);
	});
});
