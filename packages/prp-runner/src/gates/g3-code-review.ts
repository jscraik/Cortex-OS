/**
 * @file packages/prp-runner/src/gates/g3-code-review.ts
 * @description G3: Code Review - code reviewer approval and policy checks
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

class LintAndTypesConfiguredCheck implements AutomatedCheck {
	name = 'lint-and-types-configured';
	description = 'Ensure lint and type-check are included in required checks';

	async execute(context: GateContext) {
		const required = new Set(context.enforcementProfile.governance.requiredChecks || []);
		const missing: string[] = [];
		for (const check of ['lint', 'type-check']) if (!required.has(check)) missing.push(check);

		const evidence: Evidence[] = [
			{
				id: nanoid(),
				type: 'validation',
				source: 'g3-lint-types-config',
				content: JSON.stringify({ requiredChecks: [...required], missing }),
				timestamp: new Date().toISOString(),
				phase: 'build',
				commitSha: context.repoInfo.commitSha,
			},
		];

		return {
			status: (missing.length === 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output:
				missing.length === 0 ? 'Lint and type-check configured' : `Missing: ${missing.join(', ')}`,
			duration: 30,
			evidence,
		};
	}
}

class CodeownersPresentCheck implements AutomatedCheck {
	name = 'codeowners-present';
	description = 'Ensure CODEOWNERS mapping is present in enforcement profile';

	async execute(context: GateContext) {
		const mapping = context.enforcementProfile.governance.codeownersMapping || {};
		const ok = Object.keys(mapping).length > 0;

		const evidence: Evidence[] = [
			{
				id: nanoid(),
				type: 'analysis',
				source: 'g3-codeowners',
				content: JSON.stringify({ mapping, ok }),
				timestamp: new Date().toISOString(),
				phase: 'build',
				commitSha: context.repoInfo.commitSha,
			},
		];

		return {
			status: (ok ? 'pass' : 'fail') as 'pass' | 'fail' | 'skip',
			output: ok ? 'CODEOWNERS mapping present' : 'No CODEOWNERS mapping',
			duration: 25,
			evidence,
		};
	}
}

export class G3CodeReviewGate extends BaseGate {
        readonly id = 'G3' as const;
        readonly name = 'Code Review';
        readonly purpose = 'Ensure code quality gates configured and codeowners present';
        readonly requiresHumanApproval = true;
        readonly chainIo = getGateChainIoProfile('G3');

	readonly humanApprovalSpec: HumanApprovalSpec = {
		role: 'code-reviewer',
		description: 'Code reviewer approves code quality and readiness',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};

	readonly automatedChecks: AutomatedCheck[] = [
		new LintAndTypesConfiguredCheck(),
		new CodeownersPresentCheck(),
	];

	protected async executeGateLogic(context: GateContext) {
		const artifacts: string[] = [];
		const evidence: string[] = [];
		// Stub: record a code review checklist evidence
		const checklist: Evidence = {
			id: nanoid(),
			type: 'analysis',
			source: 'g3-review-checklist',
			content: JSON.stringify({
				items: ['naming', 'boundaries', 'error-handling', 'tests'],
			}),
			timestamp: new Date().toISOString(),
			phase: 'build',
			commitSha: context.repoInfo.commitSha,
		};
		context.state.evidence.push(checklist);
		evidence.push(checklist.id);
		artifacts.push('code-review-checklist.md');
		return { artifacts, evidence };
	}

	protected shouldRequestApproval(
		automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
	): boolean {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
