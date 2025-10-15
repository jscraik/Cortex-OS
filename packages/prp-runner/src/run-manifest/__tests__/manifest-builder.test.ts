import { describe, expect, it } from 'vitest';
import type { GateResult, HumanApproval, PRPState } from '@cortex-os/kernel';
import type { RepoInfo } from '../../runner.js';
import { PRODUCT_TO_AUTOMATION_PIPELINE, RunManifestSchema } from '../schema.js';
import { buildRunManifest } from '../builder.js';

function createState(blueprint: PRPState['blueprint'], overrides: Partial<PRPState> = {}): PRPState {
	return {
		id: overrides.id ?? 'prp-test',
		runId: overrides.runId ?? 'run-test',
		phase: overrides.phase ?? 'strategy',
		blueprint,
		enforcementProfile: overrides.enforcementProfile,
		gates: overrides.gates ?? {},
		approvals: overrides.approvals ?? [],
		exports: overrides.exports ?? {},
		outputs: overrides.outputs ?? {},
		validationResults: overrides.validationResults ?? {},
		evidence: overrides.evidence ?? [],
		metadata: overrides.metadata ?? {
			startTime: overrides.metadata?.startTime ?? new Date().toISOString(),
		},
		checkpoints: overrides.checkpoints,
	} as PRPState;
}

function createGateResult(overrides: Partial<GateResult>): GateResult {
	return {
		id: overrides.id ?? 'G0',
		name: overrides.name ?? 'Gate',
		status: overrides.status ?? 'passed',
		requiresHumanApproval: overrides.requiresHumanApproval ?? true,
		automatedChecks: overrides.automatedChecks ?? [
			{ name: 'Example check', status: 'pass', output: 'ok' },
		],
		artifacts: overrides.artifacts ?? [],
		evidence: overrides.evidence ?? [],
		timestamp: overrides.timestamp ?? new Date().toISOString(),
		nextSteps: overrides.nextSteps,
		humanApproval: overrides.humanApproval,
	};
}

function createApproval(overrides: Partial<HumanApproval>): HumanApproval {
	return {
		gateId: overrides.gateId ?? 'G0',
		actor: overrides.actor ?? 'approver@example.com',
		decision: overrides.decision ?? 'approved',
		timestamp: overrides.timestamp ?? new Date().toISOString(),
		commitSha: overrides.commitSha ?? 'abc123',
		rationale: overrides.rationale ?? 'approved via unit test',
		signature: overrides.signature,
	};
}

const repoInfo: RepoInfo = {
	owner: 'brainwav',
	repo: 'cortex-os',
	branch: 'main',
	commitSha: 'abcdef1234567890',
};

describe('buildRunManifest', () => {
	it('creates manifest with aggregated Product→Automation stages', () => {
		const blueprint = {
			title: 'Sample Feature',
			description: 'Implement new manifest workflow',
			requirements: ['Capture Product→Automation stage data'],
		};
		const state = createState(blueprint, { id: 'prp-test', runId: 'run-test' });

		state.gates['G0'] = createGateResult({
			id: 'G0',
			name: 'G0 Ideation',
			humanApproval: createApproval({ gateId: 'G0', actor: 'pm@brainwav.ai' }),
		});
		state.gates['G1'] = createGateResult({
			id: 'G1',
			name: 'G1 Architecture',
			humanApproval: createApproval({ gateId: 'G1', actor: 'architect@brainwav.ai' }),
		});
		state.gates['G2'] = createGateResult({
			id: 'G2',
			name: 'G2 Test Plan',
			humanApproval: createApproval({ gateId: 'G2', actor: 'qa-lead@brainwav.ai' }),
		});
		state.gates['G3'] = createGateResult({
			id: 'G3',
			name: 'G3 Code Review',
			humanApproval: createApproval({ gateId: 'G3', actor: 'reviewer@brainwav.ai' }),
		});
		state.gates['G4'] = createGateResult({
			id: 'G4',
			name: 'G4 Verification',
			humanApproval: createApproval({ gateId: 'G4', actor: 'verification@brainwav.ai' }),
		});
		state.gates['G5'] = createGateResult({
			id: 'G5',
			name: 'G5 Triage',
			humanApproval: createApproval({ gateId: 'G5', actor: 'triage@brainwav.ai' }),
		});
		state.gates['G6'] = createGateResult({
			id: 'G6',
			name: 'G6 Release Readiness',
			humanApproval: createApproval({ gateId: 'G6', actor: 'release@brainwav.ai' }),
		});
		state.gates['G7'] = createGateResult({
			id: 'G7',
			name: 'G7 Release',
			humanApproval: createApproval({ gateId: 'G7', actor: 'ops@brainwav.ai' }),
		});

		const manifest = buildRunManifest({
			state,
			repoInfo,
			actor: 'system',
			strictMode: true,
			generatedAt: '2025-10-14T00:00:00.000Z',
			telemetry: {
				startedAt: '2025-10-14T00:00:00.000Z',
				completedAt: '2025-10-14T00:05:00.000Z',
				durationMs: 300000,
				spoolRunId: 'spool-run',
				events: PRODUCT_TO_AUTOMATION_PIPELINE.map((stage) => ({
					stageKey: stage.key,
					type: 'settle',
					status: 'fulfilled',
					timestamp: '2025-10-14T00:01:00.000Z',
				})),
				metrics: {
					totalStages: 5,
					completedStages: 5,
					failedStages: 0,
				},
			},
			artifacts: {
				prpMarkdownPath: '/tmp/prp.md',
				reviewJsonPath: '/tmp/review.json',
				manifestPath: '/tmp/run-manifest.json',
			},
		});

		expect(() => RunManifestSchema.parse(manifest)).not.toThrow();
		expect(manifest.stages).toHaveLength(PRODUCT_TO_AUTOMATION_PIPELINE.length);
		const firstStage = manifest.stages[0];
		expect(firstStage.key).toBe('product-foundation');
		expect(firstStage.gate.sourceGateIds).toEqual(['G0', 'G1']);
		expect(firstStage.gate.approvals).toHaveLength(2);
		expect(manifest.summary.completedStageKeys).toEqual(
			PRODUCT_TO_AUTOMATION_PIPELINE.map((stage) => stage.key),
		);
		expect(manifest.summary.failedStageKeys).toHaveLength(0);
		expect(manifest.telemetry.events).toHaveLength(5);
		expect(manifest.artifacts?.prpMarkdownPath).toBe('/tmp/prp.md');
	});

	it('marks stage blocked when approvals are pending in strict mode', () => {
		const blueprint = {
			title: 'Sample Feature',
			description: 'Check strict mode',
			requirements: ['Enforce approvals'],
		};
		const state = createState(blueprint, { id: 'prp-strict', runId: 'run-strict' });

		state.gates['G0'] = createGateResult({
			id: 'G0',
			status: 'passed',
			requiresHumanApproval: true,
			humanApproval: undefined,
		});
		state.gates['G1'] = createGateResult({
			id: 'G1',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G1', actor: 'architect@brainwav.ai' }),
		});
		state.gates['G2'] = createGateResult({
			id: 'G2',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G2', actor: 'qa-lead@brainwav.ai' }),
		});
		state.gates['G3'] = createGateResult({
			id: 'G3',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G3', actor: 'reviewer@brainwav.ai' }),
		});
		state.gates['G4'] = createGateResult({
			id: 'G4',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G4', actor: 'verification@brainwav.ai' }),
		});
		state.gates['G5'] = createGateResult({
			id: 'G5',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G5', actor: 'triage@brainwav.ai' }),
		});
		state.gates['G6'] = createGateResult({
			id: 'G6',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G6', actor: 'release@brainwav.ai' }),
		});
		state.gates['G7'] = createGateResult({
			id: 'G7',
			status: 'passed',
			humanApproval: createApproval({ gateId: 'G7', actor: 'ops@brainwav.ai' }),
		});

		const manifest = buildRunManifest({
			state,
			repoInfo,
			actor: 'system',
			strictMode: true,
			generatedAt: '2025-10-14T00:00:00.000Z',
			telemetry: {
				startedAt: '2025-10-14T00:00:00.000Z',
				events: [],
			},
			artifacts: {
				prpMarkdownPath: '/tmp/prp.md',
				manifestPath: '/tmp/run-manifest.json',
			},
		});

		const productStage = manifest.stages.find((stage) => stage.key === 'product-foundation');
		expect(productStage?.status).toBe('blocked');
		expect(manifest.summary.blockers).toHaveLength(1);
		expect(manifest.summary.requiresHumanAttention).toContain('product-foundation');
	});
});
