/**
 * @file packages/prp-runner/src/gates/g6-release-readiness.ts
 * @description G6: Release Readiness - ensure all prior gates passed and artifacts present
 */
import { BaseGate } from './base.js';

class AllPriorGatesPassedCheck {
	name = 'all-prior-gates-passed';
	description = 'Verify G0-G5 passed (based on state.gates)';
	async execute(context) {
		const required = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5'];
		const missing = required.filter(
			(id) =>
				!context.state.gates[id] || context.state.gates[id].status !== 'passed',
		);
		return {
			status: missing.length === 0 ? 'pass' : 'fail',
			output:
				missing.length === 0
					? 'All prior gates passed'
					: `Pending/failed gates: ${missing.join(', ')}`,
			duration: 20,
		};
	}
}
export class G6ReleaseReadinessGate extends BaseGate {
	id = 'G6';
	name = 'Release Readiness';
	purpose = 'Final checks before release manager approval';
	requiresHumanApproval = true;
	humanApprovalSpec = {
		role: 'release-manager',
		description: 'Release manager confirms readiness',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};
	automatedChecks = [new AllPriorGatesPassedCheck()];
	async executeGateLogic() {
		return { artifacts: ['release-checklist.md'], evidence: [] };
	}
	shouldRequestApproval(automatedResults) {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
//# sourceMappingURL=g6-release-readiness.js.map
