import { describe, expect, it, vi } from 'vitest';
import { runPRPWorkflow } from '../../src/runner.js';

vi.mock('@cortex-os/orchestration', async () => {
	const mod = await import('../../../orchestration/src/langgraph/spool.ts');
	return { runSpool: mod.runSpool };
});

vi.mock('../../src/documentation/index.js', () => ({
	generateReviewJSON: vi.fn(() => ({})),
	generatePRPMarkdown: vi.fn(() => '# PRP'),
	writePRPDocument: vi.fn(async () => undefined),
}));

vi.mock('../../src/enforcement/initial-processor.js', () => ({
	loadInitialMd: vi.fn(async () => ({ profile: 'test-profile' })),
}));

type GateOptions = { approval?: boolean };

function makeGate(id: string, opts: GateOptions = {}) {
	return class MockGate {
		readonly id = id as const;
		readonly name = `Gate-${id}`;
		readonly purpose = `Mock gate ${id}`;
		readonly requiresHumanApproval = !!opts.approval;
		readonly humanApprovalSpec = opts.approval
			? {
					role: 'code-reviewer' as const,
					description: `Approve ${id}`,
					requiredDecision: 'approved' as const,
				}
			: undefined;
		readonly automatedChecks: [] = [];

		async execute(context: any) {
			context.state.metadata.executed ??= [];
			context.state.metadata.executed.push(id);
			return {
				id,
				name: this.name,
				status: opts.approval ? 'pending' : 'passed',
				requiresHumanApproval: this.requiresHumanApproval,
				automatedChecks: [],
				artifacts: [],
				evidence: [],
				timestamp: new Date().toISOString(),
				nextSteps: [],
			};
		}
	};
}

vi.mock('../../src/gates/g0-ideation.js', () => ({ G0IdeationGate: makeGate('G0') }));
vi.mock('../../src/gates/g1-architecture.js', () => ({
	G1ArchitectureGate: makeGate('G1', { approval: true }),
}));
vi.mock('../../src/gates/g2-test-plan.js', () => ({ G2TestPlanGate: makeGate('G2') }));
vi.mock('../../src/gates/g3-code-review.js', () => ({ G3CodeReviewGate: makeGate('G3') }));
vi.mock('../../src/gates/g4-verification.js', () => ({ G4VerificationGate: makeGate('G4') }));
vi.mock('../../src/gates/g5-triage.js', () => ({ G5TriageGate: makeGate('G5') }));
vi.mock('../../src/gates/g6-release-readiness.js', () => ({
	G6ReleaseReadinessGate: makeGate('G6'),
}));
vi.mock('../../src/gates/g7-release.js', () => ({ G7ReleaseGate: makeGate('G7') }));

const blueprint = {
	title: 'Test Blueprint',
	description: 'Validates spool integration',
	requirements: ['r1'],
};

const repoInfo = {
	owner: 'cortex',
	repo: 'prp',
	branch: 'main',
	commitSha: 'abc123',
};

const baseOptions = {
	workingDirectory: '/tmp',
	projectRoot: '/tmp/project',
};

describe('PRP runner spool integration', () => {
	it('dispatches gates via runSpool with instrumentation', async () => {
		const result = await runPRPWorkflow(blueprint, repoInfo, baseOptions);
		const events = result.state.metadata.spoolEvents as Array<{ type: string; id: string }>;
		expect(Array.isArray(events)).toBe(true);
		expect(events.filter((e) => e.type === 'start').map((e) => e.id)).toEqual([
			'G0',
			'G1',
			'G2',
			'G3',
			'G4',
			'G5',
			'G6',
			'G7',
		]);
		const summary = result.state.metadata.spoolSummary as Array<{ id: string; status: string }>;
		expect(summary.map((s) => s.status)).toEqual([
			'fulfilled',
			'fulfilled',
			'fulfilled',
			'fulfilled',
			'fulfilled',
			'fulfilled',
			'fulfilled',
			'fulfilled',
		]);
		expect(result.state.approvals).toHaveLength(1);
		expect(result.state.gates.G1?.status).toBe('passed');
	});

	it('aborts remaining gates when strict mode approval is rejected', async () => {
		const rejectingProvider = {
			async requestApproval({ gateId, actor, context }: any) {
				return {
					gateId,
					actor: actor ?? 'reviewer',
					decision: 'rejected' as const,
					timestamp: new Date().toISOString(),
					commitSha: context.repoInfo.commitSha,
					rationale: 'Rejected for test',
				};
			},
		};

		const result = await runPRPWorkflow(
			blueprint,
			repoInfo,
			{ ...baseOptions, strictMode: true },
			rejectingProvider,
		);

		const events = result.state.metadata.spoolEvents as Array<{ type: string; id: string }>;
		expect(events.filter((e) => e.type === 'start').map((e) => e.id)).toEqual(['G0', 'G1']);

		const summary = result.state.metadata.spoolSummary as Array<{ id: string; status: string }>;
		const statuses = new Map(summary.map((item) => [item.id, item.status]));
		expect(statuses.get('G1')).toBe('fulfilled');
		expect(statuses.get('G2')).toBe('skipped');
		expect(statuses.get('G7')).toBe('skipped');

		expect(result.state.gates.G1?.status).toBe('failed');
		expect(result.state.gates.G2?.automatedChecks?.[0]?.name).toBe('spool-dispatch');
	});
});
