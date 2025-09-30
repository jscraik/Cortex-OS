import { describe, expect, it } from 'vitest';
import { createSecurityIntegrationService } from '../../src/nO/security-integration.js';
import { createCompliancePlanner } from '../../src/planning/compliance-planner.js';

describe('cortex-sec compliance planner', () => {
	it('produces routine actions when no risk signals exist', () => {
		const planner = createCompliancePlanner();
		const result = planner.evaluate({ taskId: 'demo-task' });

		expect(result.aggregateRisk).toBe(0);
		expect(result.recommendedActions[0].action).toBe('maintain-compliance-cadence');
		expect(result.recommendedActions[0].priority).toBe('routine');
	});

	it('escalates to critical actions when risk exceeds threshold', () => {
		const planner = createCompliancePlanner();
		const result = planner.evaluate({
			taskId: 'high-risk-task',
			existingContext: {
				compliance: {
					standards: ['owasp-top10'],
					lastCheckedAt: null,
					riskScore: 0.9,
					outstandingViolations: [{ id: 'v-1', severity: 'critical' }],
				},
			},
		});

		expect(result.aggregateRisk).toBeGreaterThan(0.6);
		expect(result.recommendedActions[0].action).toMatch(/review/);
		expect(result.recommendedActions[0].priority).toBe('immediate');
	});
});

describe('cortex-sec security integration service', () => {
	it('summarizes compliance findings for orchestration', () => {
		const service = createSecurityIntegrationService();
		const result = service.evaluate({
			taskId: 'summary-task',
			description: 'Integrate cortex-sec checks',
			complianceContext: {
				compliance: {
					standards: ['nist'],
					lastCheckedAt: new Date().toISOString(),
					riskScore: 0.5,
					outstandingViolations: [{ id: 'nist-1', severity: 'medium' }],
				},
			},
		});

		expect(result.summary).toContain('brAInwav security summary');
		expect(result.playbook.length).toBeGreaterThan(0);
		expect(result.playbook[0].recommendedTools.length).toBeGreaterThan(0);
	});
});
