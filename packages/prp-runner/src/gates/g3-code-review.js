/**
 * @file packages/prp-runner/src/gates/g3-code-review.ts
 * @description G3: Code Review - code reviewer approval and policy checks
 */
import { nanoid } from 'nanoid';
import { BaseGate } from './base.js';

class LintAndTypesConfiguredCheck {
	name = 'lint-and-types-configured';
	description = 'Ensure lint and type-check are included in required checks';
	async execute(context) {
		const required = new Set(
			context.enforcementProfile.governance.requiredChecks || [],
		);
		const missing = [];
		for (const check of ['lint', 'type-check'])
			if (!required.has(check)) missing.push(check);
		const evidence = [
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
			status: missing.length === 0 ? 'pass' : 'fail',
			output:
				missing.length === 0
					? 'Lint and type-check configured'
					: `Missing: ${missing.join(', ')}`,
			duration: 30,
			evidence,
		};
	}
}
class CodeownersPresentCheck {
	name = 'codeowners-present';
	description = 'Ensure CODEOWNERS mapping is present in enforcement profile';
	async execute(context) {
		const mapping =
			context.enforcementProfile.governance.codeownersMapping || {};
		const ok = Object.keys(mapping).length > 0;
		const evidence = [
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
			status: ok ? 'pass' : 'fail',
			output: ok ? 'CODEOWNERS mapping present' : 'No CODEOWNERS mapping',
			duration: 25,
			evidence,
		};
	}
}
export class G3CodeReviewGate extends BaseGate {
	id = 'G3';
	name = 'Code Review';
	purpose = 'Ensure code quality gates configured and codeowners present';
	requiresHumanApproval = true;
	humanApprovalSpec = {
		role: 'code-reviewer',
		description: 'Code reviewer approves code quality and readiness',
		requiredDecision: 'approved',
		timeoutMs: 24 * 60 * 60 * 1000,
	};
	automatedChecks = [
		new LintAndTypesConfiguredCheck(),
		new CodeownersPresentCheck(),
	];
	async executeGateLogic(context) {
		const artifacts = [];
		const evidence = [];
		// Stub: record a code review checklist evidence
		const checklist = {
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
	shouldRequestApproval(automatedResults) {
		return automatedResults.every((r) => r.status === 'pass');
	}
}
//# sourceMappingURL=g3-code-review.js.map
