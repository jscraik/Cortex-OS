/**
 * @file packages/prp-runner/src/run-manifest/builder.ts
 * @description Transform PRP state into Product→Automation run manifest artifacts.
 */

import { randomUUID } from 'node:crypto';
import { structuredClone } from 'node:util';
import type { GateResult, PRPState } from '@cortex-os/kernel';
import type { RepoInfo } from '../runner.js';
import {
	PRODUCT_TO_AUTOMATION_PIPELINE,
	RunManifestSchema,
	type EnforcementProfileSnapshot,
	type RunManifest,
	type RunManifestTelemetry,
	type StageAutomatedCheck,
	type StageEntry,
	type StageKey,
} from './schema.js';

export interface BuildRunManifestArtifacts {
	prpMarkdownPath: string;
	manifestPath: string;
	reviewJsonPath?: string;
}

export interface BuildRunManifestParams {
	state: PRPState;
	repoInfo: RepoInfo;
	actor: string;
	strictMode: boolean;
	telemetry: RunManifestTelemetry;
	artifacts: BuildRunManifestArtifacts;
	manifestId?: string;
	generatedAt?: string;
}

interface StageBlocker {
	stageKey: StageKey;
	severity: 'blocker' | 'major' | 'minor';
	message: string;
}

interface BuildStageEntriesResult {
	stages: StageEntry[];
	blockers: StageBlocker[];
}

function normalizeAutomatedChecks(gate: GateResult): StageAutomatedCheck[] {
	return gate.automatedChecks.map((check, index) => ({
		id: `${gate.id}-check-${index}`,
		name: check.name,
		status: check.status === 'skip' ? 'skip' : (check.status as StageAutomatedCheck['status']),
		output: check.output,
		durationMs: check.duration,
		// Evidence references resolved separately at stage level.
		// Default to empty to avoid leaking gate evidence IDs directly.
		// Downstream builder will inject references.
		evidence: [],
	}));
}

/**
 * Derives the overall stage status from constituent gate statuses.
 * 
 * Status precedence (highest to lowest):
 * 1. failed - any gate failed
 * 2. blocked - missing approvals in strict mode
 * 3. in-progress - any gate running or pending
 * 4. skipped - all gates skipped
 * 5. passed - all gates passed or skipped
 * 6. pending - default state
 * 
 * @param gates - Array of gate results for this stage
 * @param strictMode - Whether to enforce approval requirements
 * @param missingApprovals - Whether required approvals are missing
 * @returns Derived stage status
 */
function deriveStageStatusFromGates(
	gates: GateResult[],
	strictMode: boolean,
	missingApprovals: boolean,
): StageEntry['status'] {
	const gateStatuses = gates.map((gate) => gate.status);

	// Priority 1: Failed gates block everything
	if (gateStatuses.some((status) => status === 'failed')) {
		return 'failed';
	}

	// Priority 2: Missing approvals in strict mode
	if (missingApprovals && strictMode) {
		return 'blocked';
	}

	// Priority 3: Any running gates indicate in-progress
	if (gateStatuses.some((status) => status === 'running')) {
		return 'in-progress';
	}

	// Priority 4: Any pending gates indicate in-progress
	if (gateStatuses.some((status) => status === 'pending')) {
		return 'in-progress';
	}

	// Priority 5: All skipped
	if (gateStatuses.every((status) => status === 'skipped')) {
		return 'skipped';
	}

	// Priority 6: All passed or skipped
	if (gateStatuses.every((status) => status === 'passed' || status === 'skipped')) {
		return 'passed';
	}

	// Default: pending
	return 'pending';
}

function snapshotEnforcementProfile(state: PRPState): EnforcementProfileSnapshot | undefined {
	if (!state.enforcementProfile) return undefined;
	return structuredClone(state.enforcementProfile);
}

function mapEvidenceIds(evidenceIds: string[]): StageEntry['evidence'] {
	return [...new Set(evidenceIds)].map((id) => ({ type: 'kernel' as const, evidenceId: id }));
}

function collectEvidenceFromGates(gates: GateResult[]): string[] {
	return gates.flatMap((gate) => gate.evidence ?? []);
}

function collectNextSteps(gates: GateResult[]): string[] {
	return Array.from(new Set(gates.flatMap((gate) => gate.nextSteps ?? [])));
}

function collectApprovals(gates: GateResult[]) {
	return gates
		.map((gate) => gate.humanApproval)
		.filter((approval): approval is NonNullable<GateResult['humanApproval']> => !!approval)
		.map((approval) => ({
			role: approval.role ?? 'approver',
			actor: approval.actor,
			decision: approval.decision,
			timestamp: approval.timestamp,
			rationale: approval.rationale,
			commitSha: approval.commitSha,
		}));
}

function deriveStageTimings(gates: GateResult[]) {
	const timestamps = gates
		.map((gate) => gate.timestamp)
		.filter((timestamp): timestamp is string => typeof timestamp === 'string')
		.sort((a, b) => a.localeCompare(b));
	const timings: { startedAt?: string; completedAt?: string; durationMs?: number } = {};
	if (timestamps.length > 0) {
		timings.startedAt = timestamps[0];
		timings.completedAt = timestamps[timestamps.length - 1];
		if (timings.startedAt && timings.completedAt) {
			const start = Date.parse(timings.startedAt);
			const end = Date.parse(timings.completedAt);
			if (Number.isFinite(start) && Number.isFinite(end)) {
				const durationMs = end - start;
				if (durationMs < 0) {
					// Clock skew or out-of-order timestamps - log warning and set to 0
					console.warn(`brAInwav: negative duration detected (${durationMs}ms), setting to 0. Check system clocks.`);
					timings.durationMs = 0;
				} else {
					timings.durationMs = durationMs;
				}
			}
		}
	}
	return timings;
}

/**
 * Validates that stage dependencies respect the defined ordering.
 * 
 * @param stages - Array of stage entries to validate
 * @throws Error if dependencies are violated
 */
function validateStageDependencies(stages: StageEntry[]): void {
	for (const stage of stages) {
		for (const depKey of stage.dependencies) {
			const dep = stages.find(s => s.key === depKey);
			if (!dep) {
				throw new Error(`brAInwav: Stage ${stage.key} depends on missing stage ${depKey}`);
			}
			if (dep.sequence >= stage.sequence) {
				throw new Error(
					`brAInwav: Stage ${stage.key} (seq ${stage.sequence}) depends on ${depKey} (seq ${dep.sequence}) which comes after it`
				);
			}
		}
	}
}

function buildStageEntries(
	state: PRPState,
	strictMode: boolean,
): BuildStageEntriesResult {
	const blockers: StageBlocker[] = [];
	const stages: StageEntry[] = PRODUCT_TO_AUTOMATION_PIPELINE.map((definition) => {
		const gates = definition.sourceGateIds
			.map((gateId) => state.gates[gateId])
			.filter((gate): gate is GateResult => !!gate);

		const approvals = collectApprovals(gates);
		const missingApprovals = definition.requiresHumanApproval && gates.some((gate) => gate.requiresHumanApproval && !gate.humanApproval);

		const automatedChecks = gates.flatMap((gate) => normalizeAutomatedChecks(gate));
		const evidenceIds = collectEvidenceFromGates(gates);
		const stage: StageEntry = {
			key: definition.key,
			title: definition.title,
			category: definition.category,
			sequence: definition.sequence,
			status: 'pending',
			summary: gates.length > 0 ? gates.map((gate) => `${gate.id}:${gate.status}`).join(', ') : 'No gate data recorded',
			dependencies: definition.dependencies,
			timings: deriveStageTimings(gates),
			telemetry: undefined,
			gate: {
				sourceGateIds: definition.sourceGateIds,
				requiresHumanApproval: definition.requiresHumanApproval,
				approvals,
				automatedChecks,
			},
			artifacts: [],
			evidence: mapEvidenceIds(evidenceIds),
			nextSteps: collectNextSteps(gates),
			proof: undefined,
			policy: undefined,
		};

		stage.status = deriveStageStatusFromGates(gates, strictMode, missingApprovals);
		if (stage.status === 'failed' || (stage.status === 'blocked' && missingApprovals)) {
			blockers.push({
				stageKey: stage.key,
				severity: stage.status === 'failed' ? 'blocker' : 'major',
				message:
					stage.status === 'failed'
						? `${stage.title} blocked: upstream gates failed`
						: `${stage.title} awaiting human approval`,
			});
		}
		return stage;
	});

	// Validate stage dependencies are correctly ordered
	validateStageDependencies(stages);

	return { stages, blockers };
}

function deriveSummary(stages: StageEntry[], blockers: StageBlocker[]) {
	const completedStageKeys = stages.filter((stage) => stage.status === 'passed').map((stage) => stage.key);
	const failedStageKeys = stages.filter((stage) => stage.status === 'failed').map((stage) => stage.key);
	const pendingStageKeys = stages
		.filter((stage) => stage.status === 'pending' || stage.status === 'in-progress' || stage.status === 'blocked')
		.map((stage) => stage.key);
	const requiresHumanAttention = stages
		.filter((stage) => stage.status === 'blocked' || stage.status === 'failed')
		.map((stage) => stage.key);

	let status: 'in-progress' | 'completed' | 'failed' = 'in-progress';
	if (failedStageKeys.length > 0) {
		status = 'failed';
	} else if (pendingStageKeys.length === 0 && stages.every((stage) => stage.status === 'passed' || stage.status === 'skipped')) {
		status = 'completed';
	}

	return {
		status,
		completedStageKeys,
		pendingStageKeys,
		failedStageKeys,
		requiresHumanAttention,
		blockers,
	};
}

export function buildRunManifest(params: BuildRunManifestParams): RunManifest {
	const { state, repoInfo, actor, strictMode, telemetry, artifacts, manifestId, generatedAt } = params;
	const { stages, blockers } = buildStageEntries(state, strictMode);

	const metrics = telemetry.metrics ?? {
		totalStages: stages.length,
		completedStages: stages.filter((stage) => stage.status === 'passed').length,
		failedStages: stages.filter((stage) => stage.status === 'failed').length,
	};

	const manifest: RunManifest = {
		schemaVersion: '1.0.0',
		manifestId: manifestId ?? `run-manifest-${state.runId ?? randomUUID()}`,
		runId: state.runId,
		generatedAt: generatedAt ?? new Date().toISOString(),
		actor,
		strictMode,
		blueprint: state.blueprint,
		repo: {
			owner: repoInfo.owner,
			name: repoInfo.repo,
			branch: repoInfo.branch,
			commitSha: repoInfo.commitSha,
		},
		enforcementProfile: snapshotEnforcementProfile(state),
		stages,
		summary: deriveSummary(stages, blockers),
		telemetry: { ...telemetry, metrics },
		artifacts: {
			prpMarkdownPath: artifacts.prpMarkdownPath,
			manifestPath: artifacts.manifestPath,
			reviewJsonPath: artifacts.reviewJsonPath,
		},
		links: undefined,
	};

	return RunManifestSchema.parse(manifest);
}
