/**
 * @file packages/prp-runner/src/gates/g7-release.ts
 * @description G7: Release - final release action and sign-off
 */
import { nanoid } from 'nanoid';
import { BaseGate } from './base.js';

class ReleaseArtifactsPresentCheck {
	name = 'release-artifacts-present';
	description = 'Ensure key artifacts exist from prior gates';
	async execute(context) {
		const have = Object.values(context.state.gates).flatMap((g) => g.artifacts);
		const needed = [
			'prp-scaffold-template.md',
			'architecture-review.md',
			'test-plan.md',
			'verification-report.md',
			'release-checklist.md',
		];
		const missing = needed.filter((a) => !have.includes(a));
		return {
			status: missing.length === 0 ? 'pass' : 'fail',
			output:
				missing.length === 0
					? 'All release artifacts present'
					: `Missing artifacts: ${missing.join(', ')}`,
			duration: 30,
		};
	}
}
export class G7ReleaseGate extends BaseGate {
	id = 'G7';
	name = 'Release';
	purpose = 'Perform release (stub) and sign final artifact';
	requiresHumanApproval = true;
	humanApprovalSpec = {
		role: 'release-manager',
		description: 'Release manager approves the actual release',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};
	automatedChecks = [new ReleaseArtifactsPresentCheck()];
	async executeGateLogic(context) {
		const artifacts = ['release-notes.md'];
		const evidence = [];
		const signed = {
			id: nanoid(),
			type: 'analysis',
			source: 'g7-release-signature',
			content: JSON.stringify({ signed: true, method: 'sigstore-stub' }),
			timestamp: new Date().toISOString(),
			phase: 'evaluation',
			commitSha: context.repoInfo.commitSha,
		};
		context.state.evidence.push(signed);
		evidence.push(signed.id);
		return { artifacts, evidence };
	}
	shouldRequestApproval(automatedResults) {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
//# sourceMappingURL=g7-release.js.map
