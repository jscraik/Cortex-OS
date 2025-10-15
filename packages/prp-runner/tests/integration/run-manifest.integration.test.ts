import { mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runPRPWorkflow } from '../../src/runner.js';
import { RunManifestSchema } from '../../src/run-manifest/schema.js';

vi.mock('@cortex-os/orchestration', async () => {
	const mod = await import('../../../orchestration/src/langgraph/spool');
	return { runSpool: mod.runSpool };
});

vi.mock('../../src/documentation/index.js', () => ({
	generateReviewJSON: vi.fn(() => ({})),
	generatePRPMarkdown: vi.fn(() => '# PRP'),
	writePRPDocument: vi.fn(async () => undefined),
}));

vi.mock('../../src/enforcement/initial-processor.js', () => ({
	loadInitialMd: vi.fn(async () => ({
		budgets: {
			coverageLines: 95,
			coverageBranches: 90,
			performanceLCP: 2500,
			performanceTBT: 300,
			a11yScore: 95,
		},
		architecture: {
			allowedPackageBoundaries: [],
			namingConventions: {},
			repoLayout: [],
			crossBoundaryImports: [],
		},
		governance: {
			licensePolicy: '(Apache-2.0 OR Commercial)',
			codeownersMapping: {},
			structureGuardExceptions: [],
			requiredChecks: [],
		},
	})),
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

vi.mock('../../src/gates/g0-ideation.js', () => ({ G0IdeationGate: makeGate('G0', { approval: true }) }));
vi.mock('../../src/gates/g1-architecture.js', () => ({ G1ArchitectureGate: makeGate('G1', { approval: true }) }));
vi.mock('../../src/gates/g2-test-plan.js', () => ({ G2TestPlanGate: makeGate('G2') }));
vi.mock('../../src/gates/g3-code-review.js', () => ({ G3CodeReviewGate: makeGate('G3', { approval: true }) }));
vi.mock('../../src/gates/g4-verification.js', () => ({ G4VerificationGate: makeGate('G4') }));
vi.mock('../../src/gates/g5-triage.js', () => ({ G5TriageGate: makeGate('G5') }));
vi.mock('../../src/gates/g6-release-readiness.js', () => ({
	G6ReleaseReadinessGate: makeGate('G6', { approval: true }),
}));
vi.mock('../../src/gates/g7-release.js', () => ({ G7ReleaseGate: makeGate('G7', { approval: true }) }));

const blueprint = {
	title: 'Manifest Workflow',
	description: 'Validates manifest persistence',
	requirements: ['Stage aggregation'],
};

const repoInfo = {
	owner: 'brainwav',
	repo: 'cortex-os',
	branch: 'main',
	commitSha: 'abc123',
};

describe('run manifest emission', () => {
	it('writes manifest JSON and records path in exports', async () => {
		const projectRoot = mkdtempSync(join(tmpdir(), 'prp-manifest-'));
		const runnerOptions = {
			workingDirectory: projectRoot,
			projectRoot,
			outputPath: join(projectRoot, 'prp.md'),
		};

		const result = await runPRPWorkflow(blueprint, repoInfo, runnerOptions);
		const manifestPath = result.state.exports.runManifestPath as string;
		expect(manifestPath).toContain('.cortex/run-manifests');

		const manifestJson = await readFile(manifestPath, 'utf8');
		const manifest = RunManifestSchema.parse(JSON.parse(manifestJson));
		expect(manifest.runId).toBe(result.state.runId);
		expect(manifest.stages).toHaveLength(5);
		expect(manifest.summary.status).toBe('completed');
		expect(manifest.artifacts?.prpMarkdownPath).toBe(runnerOptions.outputPath);
		const stageKeys = manifest.stages.map((stage) => stage.key);
		expect(stageKeys).toEqual([
			'product-foundation',
			'product-test-strategy',
			'engineering-execution',
			'quality-triage',
			'automation-release',
		]);
	});
});
