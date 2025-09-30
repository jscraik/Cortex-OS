import type { SecurityIntegrationResult, SecurityIntegrationService } from '@cortex-os/cortex-sec';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	CoordinationRequest,
	CoordinationTelemetry,
} from '../../src/coordinator/adaptive-coordinator.js';
import { AdaptiveCoordinationManager } from '../../src/coordinator/adaptive-coordinator.js';
import { LongHorizonPlanner, type LongHorizonTask } from '../../src/lib/long-horizon-planner.js';
import { SecurityCoordinator } from '../../src/security/security-coordinator.js';
import type { PlanningContext, PlanningPhase } from '../../src/utils/dsp.js';

const clock = () => new Date('2024-01-01T00:00:00.000Z');

const securityResult: SecurityIntegrationResult = {
	taskId: 'security-task',
	aggregateRisk: 0.82,
	signals: [],
	recommendedActions: [
		{
			action: 'execute-critical-security-scan',
			description: 'Run immediate Semgrep and compliance validation scans.',
			recommendedTools: ['security.run_semgrep_scan', 'security.validate_compliance'],
			priority: 'immediate',
		},
	],
	standards: ['SOC_2', 'OWASP_TOP_10'],
	lastCheckedAt: new Date('2024-01-01T00:00:00.000Z'),
	playbook: [
		{
			action: 'execute-critical-security-scan',
			description: 'Escalate elevated risk to cortex-sec tooling.',
			recommendedTools: ['security.run_semgrep_scan', 'security.validate_compliance'],
			priority: 'immediate',
		},
	],
	summary:
		'brAInwav security summary for task "Secure integration": risk critical (0.82). Recommended action: execute-critical-security-scan via security.run_semgrep_scan, security.validate_compliance.',
};

describe('Structured planning integration with cortex-sec security', () => {
	let planner: LongHorizonPlanner;
	let coordinationManager: AdaptiveCoordinationManager;
	let securityService: SecurityIntegrationService;
	let task: LongHorizonTask;

	beforeEach(() => {
		securityService = {
			evaluate: vi.fn().mockReturnValue(securityResult),
		} satisfies SecurityIntegrationService;

		planner = new LongHorizonPlanner({
			enableContextIsolation: true,
			maxPlanningTime: 5_000,
			adaptiveDepthEnabled: true,
			persistenceEnabled: false,
			securityIntegrationService: securityService,
		});

		coordinationManager = new AdaptiveCoordinationManager({
			clock,
			historyLimit: 10,
		});

		task = {
			id: 'security-task',
			description: 'Secure integration',
			complexity: 7,
			priority: 8,
			estimatedDuration: 12_000,
			dependencies: ['audit-log'],
			metadata: { origin: 'vitest' },
		};
	});

	it('includes cortex-sec security evaluation in planning results and planning context', async () => {
		const executor = vi
			.fn<[PlanningPhase, PlanningContext], Promise<Record<string, unknown>>>()
			.mockResolvedValue({ handled: true });

		const result = await planner.planTask(task, executor);

		expect(result.security).toEqual(securityResult);
		expect(securityService.evaluate).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: task.id, description: task.description }),
		);

		const activeContext = planner.getCurrentContext();
		expect(activeContext?.compliance?.riskScore).toBeCloseTo(securityResult.aggregateRisk);
		expect(
			activeContext?.preferences.notes.some((note) => note.includes('brAInwav security summary')),
		).toBe(true);
	});

	it('merges security telemetry and state patches during coordination', async () => {
		const executor = vi
			.fn<[PlanningPhase, PlanningContext], Promise<Record<string, unknown>>>()
			.mockImplementation(async (phase, context) => ({ phase, context: context.id }));

		const planningResult = await planner.planTask(task, executor);

		const securityTelemetry: CoordinationTelemetry[] = [
			{
				branding: 'brAInwav',
				timestamp: clock().toISOString(),
				message: 'Security telemetry injected',
				metadata: { severity: 'critical' },
			},
		];

		const securityStatePatch = {
			planning: { annotations: ['security-review'] },
			coordination: { agents: ['security-specialist'] },
			security: { risk: securityResult.aggregateRisk },
		} satisfies Record<string, unknown>;

		class StubSecurityCoordinator extends SecurityCoordinator {
			review = vi
				.fn()
				.mockReturnValue({ telemetry: securityTelemetry, statePatch: securityStatePatch });
		}

		const stubSecurityCoordinator = new StubSecurityCoordinator();

		const manager = new AdaptiveCoordinationManager({
			clock,
			historyLimit: 5,
			securityCoordinator: stubSecurityCoordinator,
		});

		const decision = manager.coordinate({
			task,
			agents: [
				{ id: 'agent-primary', capabilities: ['analysis', 'execution'] },
				{ id: 'agent-security', capabilities: ['security'] },
			],
			planningResult,
		});

		expect(stubSecurityCoordinator.review).toHaveBeenCalled();
		expect(decision.telemetry).toEqual(expect.arrayContaining(securityTelemetry));
		expect(decision.statePatch.security).toEqual(securityStatePatch.security);
		expect(decision.statePatch.planning).toMatchObject({ annotations: ['security-review'] });
		expect(decision.statePatch.coordination).toMatchObject({
			agents: ['agent-primary', 'agent-security', 'security-specialist'],
		});
	});

	it('records history with merged security context for confidence adjustments', async () => {
		const executor = vi
			.fn<[PlanningPhase, PlanningContext], Promise<Record<string, unknown>>>()
			.mockImplementation(async (phase) => ({ phase }));

		const planningResult = await planner.planTask(task, executor);

		const request: CoordinationRequest = {
			task,
			agents: [
				{ id: 'agent-primary', capabilities: ['analysis'] },
				{ id: 'agent-backup', capabilities: ['execution'] },
			],
			planningResult,
		};

		const decision = coordinationManager.coordinate(request);

		expect(decision.statePatch.security).toBeDefined();

		coordinationManager.recordOutcome({
			taskId: task.id,
			strategy: decision.strategy,
			success: false,
			efficiency: 0.4,
			quality: 0.5,
			durationMs: 1_000,
			timestamp: clock(),
		});

		const followUpDecision = coordinationManager.coordinate(request);
		expect(followUpDecision.confidence).toBeLessThan(decision.confidence);
	});
});
