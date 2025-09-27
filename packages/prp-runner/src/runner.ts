/**
 * @file packages/prp-runner/src/runner.ts
 * @description End-to-end PRP workflow runner using gate framework (G0→G1 for now)
 */

import { runSpool } from '@cortex-os/orchestration';
import type { HumanApproval, PRPState } from '@cortex-os/kernel';
import {
	generatePRPMarkdown,
	generateReviewJSON,
	type PRPDocument,
	writePRPDocument,
} from './documentation/index.js';
import { loadInitialMd } from './enforcement/initial-processor.js';
import type { BaseGate, GateContext, GateResult } from './gates/base.js';
import { G0IdeationGate } from './gates/g0-ideation.js';
import { G1ArchitectureGate } from './gates/g1-architecture.js';
import { G2TestPlanGate } from './gates/g2-test-plan.js';
import { G3CodeReviewGate } from './gates/g3-code-review.js';
import { G4VerificationGate } from './gates/g4-verification.js';
import { G5TriageGate } from './gates/g5-triage.js';
import { G6ReleaseReadinessGate } from './gates/g6-release-readiness.js';
import { G7ReleaseGate } from './gates/g7-release.js';

export interface RepoInfo {
	owner: string;
	repo: string;
	branch: string;
	commitSha: string;
}

export interface RunOptions {
	workingDirectory: string;
	projectRoot: string;
	initialMdPath?: string;
	actor?: string;
	strictMode?: boolean;
	outputPath?: string; // Where to write prp.md
}

export interface Blueprint {
	title: string;
	description: string;
	requirements: string[];
	metadata?: Record<string, unknown>;
}

export interface HumanApprovalProvider {
	requestApproval(input: {
		gateId: string;
		role: string;
		description: string;
		context: GateContext;
	}): Promise<HumanApproval>;
}

class AutoApproveProvider implements HumanApprovalProvider {
	async requestApproval({
		gateId,
		role,
		context,
	}: {
		gateId: string;
		role: string;
		description: string;
		context: GateContext;
	}): Promise<HumanApproval> {
		return {
			gateId: gateId as HumanApproval['gateId'],
			actor: context.actor || role,
			decision: 'approved',
			timestamp: new Date().toISOString(),
			commitSha: context.repoInfo.commitSha,
			rationale: `Auto-approved by ${role} in non-strict mode`,
		};
	}
}

export async function runPRPWorkflow(
	blueprint: Blueprint,
	repoInfo: RepoInfo,
	options: RunOptions,
	approvalProvider?: HumanApprovalProvider,
): Promise<{ state: PRPState; prpPath: string; markdown: string }> {
	const enforcementProfile = await loadInitialMd(options.projectRoot, options.initialMdPath);

	// Initialize state
	const state: PRPState = {
		id: `prp-${Date.now()}`,
		runId: `run-${Date.now()}`,
		phase: 'strategy',
		blueprint: {
			title: blueprint.title,
			description: blueprint.description,
			requirements: blueprint.requirements,
			metadata: blueprint.metadata,
		},
		enforcementProfile,
		gates: {},
		approvals: [],
		exports: {},
		outputs: {},
		evidence: [],
		validationResults: {},
		metadata: {
			startTime: new Date().toISOString(),
		},
	};

	const gates: BaseGate[] = [
		new G0IdeationGate(),
		new G1ArchitectureGate(),
		new G2TestPlanGate(),
		new G3CodeReviewGate(),
		new G4VerificationGate(),
		new G5TriageGate(),
		new G6ReleaseReadinessGate(),
		new G7ReleaseGate(),
	];

	const ctxBase: Omit<GateContext, 'state'> = {
		workingDirectory: options.workingDirectory,
		projectRoot: options.projectRoot,
		enforcementProfile,
		repoInfo,
		actor: options.actor || 'system',
		strictMode: !!options.strictMode,
	};

	const approver = approvalProvider ?? new AutoApproveProvider();

	const gateMap = new Map<string, BaseGate>();
	for (const gate of gates) gateMap.set(gate.id, gate);

	const executeGate = async (gate: BaseGate) => {
		const context: GateContext = { ...ctxBase, state };
		const result = await gate.execute(context);
		let shouldAbort = false;

		if (result.requiresHumanApproval) {
			const approval = await approver.requestApproval({
				gateId: gate.id,
				role: gate.humanApprovalSpec?.role || 'reviewer',
				description: gate.humanApprovalSpec?.description || gate.name,
				context,
			});
			state.approvals.push(approval);
			(result as GateResult & { humanApproval?: HumanApproval }).humanApproval = approval;
			const hasFailures = result.automatedChecks.some(
				(c: { status: 'pass' | 'fail' | 'skip' }) => c.status === 'fail',
			);
			if (approval.decision === 'approved' && !hasFailures) {
				result.status = 'passed';
			} else if (approval.decision !== 'approved') {
				result.status = 'failed';
				if (options.strictMode) {
					shouldAbort = true;
				}
			}
			if (options.strictMode && approval.decision !== 'approved') {
				shouldAbort = true;
			}
		}

		state.gates[gate.id] = result;
		return { gateId: gate.id, status: result.status ?? 'pending', shouldAbort };
	};

	const controller = new AbortController();
	const spoolEvents =
		(state.metadata.spoolEvents as
			| Array<{ type: string; id: string; status?: string }>
			| undefined) ?? [];
	if (!state.metadata.spoolEvents) {
		state.metadata.spoolEvents = spoolEvents;
	}

	const spoolResults = await runSpool(
		gates.map((gate) => ({
			id: gate.id,
			name: gate.name,
			estimateTokens: 512,
			execute: async () => {
				const summary = await executeGate(gate);
				if (summary.shouldAbort) {
					controller.abort();
				}
				return summary;
			},
		})),
		{
			concurrency: 1,
			tokens: Math.max(1, gates.length) * 2048,
			ms: options.strictMode ? 10 * 60 * 1000 : undefined,
			signal: controller.signal,
			onStart: (task) => spoolEvents.push({ type: 'start', id: task.id }),
			onSettle: (settled) =>
				spoolEvents.push({ type: 'settle', id: settled.id, status: settled.status }),
		},
	);

	state.metadata.spoolSummary = spoolResults.map(({ id, status }) => ({ id, status }));

	for (const settled of spoolResults) {
		if (settled.status === 'fulfilled') {
			continue;
		}
		const gate = gateMap.get(settled.id);
		if (!gate) continue;
		if (!state.gates[gate.id]) {
			const timestamp = new Date().toISOString();
			state.gates[gate.id] = {
				id: gate.id,
				name: gate.name,
				status: 'failed',
				requiresHumanApproval: false,
				automatedChecks: [
					{
						name: 'spool-dispatch',
						status: 'fail',
						output: settled.reason?.message ?? `spool ${settled.status}`,
					},
				],
				artifacts: [],
				evidence: [],
				timestamp,
				nextSteps: ['Review spool dispatch failure'],
			} as GateResult;
		}
	}

	// Generate review JSON and prp.md
	const review = generateReviewJSON(state);
	// Calculate final document status
	const allPassed = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].every(
		(id) => state.gates[id]?.status === 'passed',
	);
	const status = allPassed ? 'ready-for-release' : 'in-progress';
	const prpDoc: PRPDocument = {
		id: state.id,
		title: state.blueprint.title,
		repo: `${repoInfo.owner}/${repoInfo.repo}`,
		branch: repoInfo.branch,
		owner: repoInfo.owner,
		created: state.metadata.startTime,
		updated: new Date().toISOString(),
		version: '0.1.0',
		status,
		links: {},
	};
	const markdown = generatePRPMarkdown(state, prpDoc, review);
	const prpPath = options.outputPath || `${options.projectRoot}/prp.md`;
	await writePRPDocument(markdown, prpPath);

	return { state, prpPath, markdown };
}
