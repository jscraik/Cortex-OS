/**
 * @file packages/prp-runner/src/gates/g4-verification.ts
 * @description G4: Verification - validate quality budgets satisfied (simulation/stub)
 */

import { nanoid } from 'nanoid';
import {
	type AutomatedCheck,
	BaseGate,
	type Evidence,
	type GateContext,
	type HumanApprovalSpec,
} from './base.js';

class QualityBudgetsSatisfiedCheck implements AutomatedCheck {
	name = 'quality-budgets-satisfied';
	description = 'Simulate verification pass if budgets are configured (no real execution here)';

	async execute(context: GateContext) {
		const b = context.enforcementProfile.budgets;
		const ok =
			b.coverageLines > 0 &&
			b.coverageBranches > 0 &&
			b.performanceLCP > 0 &&
			b.performanceTBT > 0 &&
			b.a11yScore > 0;
		const evidence: Evidence[] = [
			{
				id: nanoid(),
				type: 'validation',
				source: 'g4-quality-budgets-satisfied',
				content: JSON.stringify({ budgets: b, ok }),
				timestamp: new Date().toISOString(),
				phase: 'evaluation',
				commitSha: context.repoInfo.commitSha,
			},
		];
		return {
			status: (ok ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output: ok ? 'Quality budgets satisfied (simulated)' : 'Budgets incomplete',
			duration: 50,
			evidence,
		};
	}
}

export class G4VerificationGate extends BaseGate {
	readonly id = 'G4' as const;
	readonly name = 'Verification';
	readonly purpose = 'Verify that implemented solution meets the planned quality budgets (stubbed)';
	readonly requiresHumanApproval = true;

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: 'qa-lead',
		description: 'QA lead verifies budgets met based on reports',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};

	readonly automatedChecks: AutomatedCheck[] = [new QualityBudgetsSatisfiedCheck()];

	protected async executeGateLogic(context: GateContext) {
		const artifacts: string[] = ['verification-report.md'];
		const evidence: string[] = [];
		const report: Evidence = {
			id: nanoid(),
			type: 'analysis',
			source: 'g4-verification-report',
			content: JSON.stringify({ result: 'simulated-pass' }),
			timestamp: new Date().toISOString(),
			phase: 'evaluation',
			commitSha: context.repoInfo.commitSha,
		};
		context.state.evidence.push(report);
		evidence.push(report.id);
		return { artifacts, evidence };
	}

	protected shouldRequestApproval(
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	): boolean {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
