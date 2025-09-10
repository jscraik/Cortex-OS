/**
 * @file packages/prp-runner/src/gates/g2-test-plan.ts
 * @description G2: Test Plan - QA lead approval and coverage/perf/a11y plans
 */

import { nanoid } from 'nanoid';
import { BaseGate } from './base.js';

class CoverageTargetsCheck {
	name = 'coverage-targets';
	description =
		'Validate coverage targets (lines/branches) are defined and > 0';
	async execute(context) {
		const { coverageLines, coverageBranches } =
			context.enforcementProfile.budgets;
		const issues = [];
		if (!(coverageLines > 0)) issues.push('coverageLines must be > 0');
		if (!(coverageBranches > 0)) issues.push('coverageBranches must be > 0');
		const evidence = [
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
			status: issues.length === 0 ? 'pass' : 'fail',
			output:
				issues.length === 0
					? 'Coverage targets present'
					: `Issues: ${issues.join(', ')}`,
			duration: 40,
			evidence,
		};
	}
}
class PerfAndA11yBudgetCheck {
	name = 'perf-a11y-budgets';
	description =
		'Validate performance (LCP/TBT) and accessibility budgets present';
	async execute(context) {
		const { performanceLCP, performanceTBT, a11yScore } =
			context.enforcementProfile.budgets;
		const issues = [];
		if (!(performanceLCP > 0)) issues.push('performanceLCP must be > 0');
		if (!(performanceTBT > 0)) issues.push('performanceTBT must be > 0');
		if (!(a11yScore > 0)) issues.push('a11yScore must be > 0');
		const evidence = [
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
			status: issues.length === 0 ? 'pass' : 'fail',
			output:
				issues.length === 0
					? 'Performance and accessibility budgets present'
					: `Issues: ${issues.join(', ')}`,
			duration: 40,
			evidence,
		};
	}
}
class TestCategoriesPlanCheck {
	name = 'test-categories-plan';
	description =
		'Ensure test categories (unit, integration, e2e, a11y, security) are planned';
	async execute(context) {
		const meta = context.state.blueprint.metadata || {};
		const categories = meta.testCategories || [
			'unit',
			'integration',
			'e2e',
			'a11y',
			'security',
		];
		const required = new Set([
			'unit',
			'integration',
			'e2e',
			'a11y',
			'security',
		]);
		const missing = Array.from(required).filter((c) => !categories.includes(c));
		const evidence = [
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
			status: missing.length === 0 ? 'pass' : 'fail',
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
	id = 'G2';
	name = 'Test Plan';
	purpose =
		'Validate that test strategy meets coverage, performance, and accessibility requirements';
	requiresHumanApproval = true;
	humanApprovalSpec = {
		role: 'qa-lead',
		description: 'QA Lead approval for test plan and quality budgets',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};
	automatedChecks = [
		new CoverageTargetsCheck(),
		new PerfAndA11yBudgetCheck(),
		new TestCategoriesPlanCheck(),
	];
	async executeGateLogic(context, automatedResults) {
		const artifacts = [];
		const evidence = [];
		const allChecksPassed = automatedResults.every((r) => r.status === 'pass');
		if (allChecksPassed) {
			const testPlan = {
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
	shouldRequestApproval(automatedResults) {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
//# sourceMappingURL=g2-test-plan.js.map
