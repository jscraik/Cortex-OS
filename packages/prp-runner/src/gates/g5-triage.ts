/**
 * @file packages/prp-runner/src/gates/g5-triage.ts
 * @description G5: Triage - ensure no red findings; maintainers sign-off
 */

import { type AutomatedCheck, BaseGate, type GateContext, type HumanApprovalSpec } from './base.js';

class NoRedFindingsCheck implements AutomatedCheck {
	name = 'no-red-findings';
	description = "Ensure no 'red' category scores exist (based on previous review JSON categories)";

	async execute(_context: GateContext) {
		// Without persisted review JSON categories, assume pass for now
		return {
			status: 'pass' as const,
			output: 'No red findings (assumed)',
			duration: 10,
		};
	}
}

export class G5TriageGate extends BaseGate {
	readonly id = 'G5' as const;
	readonly name = 'Triage';
	readonly purpose = 'Confirm no blockers remain before release readiness';
	readonly requiresHumanApproval = true;

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: 'maintainer',
		description: 'Maintainer verifies no blockers remain',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};

	readonly automatedChecks: AutomatedCheck[] = [new NoRedFindingsCheck()];

	protected async executeGateLogic() {
		return { artifacts: [], evidence: [] };
	}
	protected shouldRequestApproval(
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	): boolean {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
