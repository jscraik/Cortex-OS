/**
 * @file packages/prp-runner/src/gates/g7-release.ts
 * @description G7: Release - final release action and sign-off
 */

import { nanoid } from 'nanoid';
import {
	type AutomatedCheck,
	BaseGate,
	type Evidence,
	type GateContext,
	type HumanApprovalSpec,
} from './base.js';

class ReleaseArtifactsPresentCheck implements AutomatedCheck {
	name = 'release-artifacts-present';
	description = 'Ensure key artifacts exist from prior gates';

	async execute(context: GateContext) {
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
			status: (missing.length === 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output:
				missing.length === 0
					? 'All release artifacts present'
					: `Missing artifacts: ${missing.join(', ')}`,
			duration: 30,
		};
	}
}

export class G7ReleaseGate extends BaseGate {
	readonly id = 'G7' as const;
	readonly name = 'Release';
	readonly purpose = 'Perform release (stub) and sign final artifact';
	readonly requiresHumanApproval = true;

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: 'release-manager',
		description: 'Release manager approves the actual release',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};

	readonly automatedChecks: AutomatedCheck[] = [new ReleaseArtifactsPresentCheck()];

	protected async executeGateLogic(context: GateContext) {
		const artifacts: string[] = ['release-notes.md'];
		const evidence: string[] = [];
		const signed: Evidence = {
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

	protected shouldRequestApproval(
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	): boolean {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
