/**
 * @file packages/prp-runner/src/gates/g2-test-plan.ts
 * @description G2: Test Plan - QA lead approval and coverage/perf/a11y plans
 */

import { nanoid } from 'nanoid';
import {
        type AutomatedCheck,
        BaseGate,
        type Evidence,
        type GateContext,
        type HumanApprovalSpec,
} from './base.js';
import { getGateChainIoProfile } from './chain-io-profiles.js';

class CoverageTargetsCheck implements AutomatedCheck {
	name = 'coverage-targets';
	description = 'Validate coverage targets (lines/branches) are defined and > 0';

	async execute(context: GateContext) {
		const { coverageLines, coverageBranches } = context.enforcementProfile.budgets;
		const issues: string[] = [];
		if (!(coverageLines > 0)) issues.push('coverageLines must be > 0');
		if (!(coverageBranches > 0)) issues.push('coverageBranches must be > 0');

		const evidence: Evidence[] = [
			{
				id: nanoid(),
				type: 'validation',
				source: 'g2-coverage-targets',
				content: JSON.stringify({ coverageLines, coverageBranches, issues }),
				timestamp: new Date().toISOString(),
				phase: 'build',
				commitSha: context.repoInfo.commitSha,
			},
		];

		return {
			status: (issues.length === 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output: issues.length === 0 ? 'Coverage targets present' : `Issues: ${issues.join(', ')}`,
			duration: 40,
			evidence,
		};
	}
}

class PerfAndA11yBudgetCheck implements AutomatedCheck {
	name = 'perf-a11y-budgets';
	description = 'Validate performance (LCP/TBT) and accessibility budgets present';

	async execute(context: GateContext) {
		const { performanceLCP, performanceTBT, a11yScore } = context.enforcementProfile.budgets;
		const issues: string[] = [];
		if (!(performanceLCP > 0)) issues.push('performanceLCP must be > 0');
		if (!(performanceTBT > 0)) issues.push('performanceTBT must be > 0');
		if (!(a11yScore > 0)) issues.push('a11yScore must be > 0');

		const evidence: Evidence[] = [
			{
				id: nanoid(),
				type: 'validation',
				source: 'g2-perf-a11y-budgets',
				content: JSON.stringify({
					performanceLCP,
					performanceTBT,
					a11yScore,
					issues,
				}),
				timestamp: new Date().toISOString(),
				phase: 'build',
				commitSha: context.repoInfo.commitSha,
			},
		];

		return {
			status: (issues.length === 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output:
				issues.length === 0
					? 'Performance and accessibility budgets present'
					: `Issues: ${issues.join(', ')}`,
			duration: 40,
			evidence,
		};
	}
}

class TestCategoriesPlanCheck implements AutomatedCheck {
	name = 'test-categories-plan';
	description = 'Ensure test categories (unit, integration, e2e, a11y, security) are planned';

	async execute(context: GateContext) {
		const meta = (context.state.blueprint.metadata || {}) as Record<string, unknown>;
		const categories = (meta.testCategories as string[]) || [
			'unit',
			'integration',
			'e2e',
			'a11y',
			'security',
		];
		const required = new Set(['unit', 'integration', 'e2e', 'a11y', 'security']);
		const missing = Array.from(required).filter((c) => !categories.includes(c));

		const evidence: Evidence[] = [
			{
				id: nanoid(),
				type: 'analysis',
				source: 'g2-test-categories',
				content: JSON.stringify({ categories, missing }),
				timestamp: new Date().toISOString(),
				phase: 'build',
				commitSha: context.repoInfo.commitSha,
			},
		];

		return {
			status: (missing.length === 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output:
				missing.length === 0
					? 'All required test categories planned'
					: `Missing categories: ${missing.join(', ')}`,
			duration: 35,
			evidence,
		};
	}
}

export class G2TestPlanGate extends BaseGate {
        readonly id = 'G2' as const;
        readonly name = 'Test Plan';
        readonly purpose =
                'Validate that test strategy meets coverage, performance, and accessibility requirements';
        readonly requiresHumanApproval = true;
        readonly chainIo = getGateChainIoProfile('G2');

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: 'qa-lead',
		description: 'QA Lead approval for test plan and quality budgets',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};

	readonly automatedChecks: AutomatedCheck[] = [
		new CoverageTargetsCheck(),
		new PerfAndA11yBudgetCheck(),
		new TestCategoriesPlanCheck(),
	];

	protected async executeGateLogic(
		context: GateContext,
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	) {
		const artifacts: string[] = [];
		const evidence: string[] = [];

		const allChecksPassed = automatedResults.every((r) => r.status === 'pass');
		if (allChecksPassed) {
			const testPlan: Evidence = {
				id: nanoid(),
				type: 'analysis',
				source: 'g2-test-plan',
				content: JSON.stringify({
					plan: {
						categories: ['unit', 'integration', 'e2e', 'a11y', 'security'],
						coverage: context.enforcementProfile.budgets.coverageLines,
						branches: context.enforcementProfile.budgets.coverageBranches,
						performance: {
							lcp: context.enforcementProfile.budgets.performanceLCP,
							tbt: context.enforcementProfile.budgets.performanceTBT,
						},
						a11yScore: context.enforcementProfile.budgets.a11yScore,
					},
				}),
				timestamp: new Date().toISOString(),
				phase: 'build',
				commitSha: context.repoInfo.commitSha,
			};
			context.state.evidence.push(testPlan);
			evidence.push(testPlan.id);
			artifacts.push('test-plan.md');
		}

		return { artifacts, evidence };
	}

	protected shouldRequestApproval(
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	): boolean {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
