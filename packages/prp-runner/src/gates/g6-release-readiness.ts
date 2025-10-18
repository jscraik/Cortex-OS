/**
 * @file packages/prp-runner/src/gates/g6-release-readiness.ts
 * @description G6: Release Readiness - ensure all prior gates passed and artifacts present
 */

import { type AutomatedCheck, BaseGate, type GateContext, type HumanApprovalSpec } from './base.js';
import { getGateChainIoProfile } from './chain-io-profiles.js';

class AllPriorGatesPassedCheck implements AutomatedCheck {
	name = 'all-prior-gates-passed';
	description = 'Verify G0-G5 passed (based on state.gates)';

	async execute(context: GateContext) {
		const required = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5'] as const;
		const missing = required.filter(
			(id) => !context.state.gates[id] || context.state.gates[id].status !== 'passed',
		);
		return {
			status: (missing.length === 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output:
				missing.length === 0
					? 'All prior gates passed'
					: `Pending/failed gates: ${missing.join(', ')}`,
			duration: 20,
		};
	}
}

export class G6ReleaseReadinessGate extends BaseGate {
	readonly id = 'G6' as const;
        readonly name = 'Release Readiness';
        readonly purpose = 'Final checks before release manager approval';
        readonly requiresHumanApproval = true;
        readonly chainIo = getGateChainIoProfile('G6');

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: 'release-manager',
		description: 'Release manager confirms readiness',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};

	readonly automatedChecks: AutomatedCheck[] = [new AllPriorGatesPassedCheck()];
	protected async executeGateLogic() {
		return { artifacts: ['release-checklist.md'], evidence: [] };
	}
	protected shouldRequestApproval(
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	): boolean {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
