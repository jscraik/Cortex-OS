import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signMock = vi.fn(async () => ({ signature: 'sig', bundle: { messageSignature: 'sig' } }));
const verifyMock = vi.fn(async () => undefined);

vi.mock('@sigstore/sign', () => ({ sign: signMock }));
vi.mock('@sigstore/verify', () => ({ verify: verifyMock }));

import {
	resolveProofTargets,
	runCreate,
	runSign,
	runStageCreate,
	runStageVerify,
	runVerify,
} from '../../src/cli/cortex-proofs.js';

const createFixtureArtifact = () => {
	const base = join(process.cwd(), 'test-temp');
	mkdirSync(base, { recursive: true });
	const dir = mkdtempSync(join(base, 'proof-cli-'));
	const artifactPath = join(dir, 'report.md');
	writeFileSync(artifactPath, '# CLI Test Artifact');
	return artifactPath;
};

describe('cortex-proofs CLI helpers', () => {
	beforeEach(() => {
		signMock.mockClear();
		verifyMock.mockClear();
	});
	it('creates, verifies, and signs proof envelopes', async () => {
		const artifactPath = createFixtureArtifact();
		runCreate({
			artifact: artifactPath,
			mime: 'text/markdown',
			context: JSON.stringify({ instruction: 'cli' }),
			runtime: JSON.stringify({ model: 'gpt-5-codex' }),
			evidence: '[]',
			policy: '[]',
		});

		const proofPath = `${artifactPath}.proof.json`;
		const envelope = JSON.parse(readFileSync(proofPath, 'utf-8'));
		expect(envelope.artifact.uri).toContain('file://');

		await runVerify([proofPath]);
		await runSign([proofPath], 'OIDC@GitHub', 'token');
		expect(signMock).toHaveBeenCalledTimes(1);
		expect(verifyMock).toHaveBeenCalledTimes(1);
	});

	it('resolves proof targets when scanning all files', async () => {
		const artifactPath = createFixtureArtifact();
		const proofPath = `${artifactPath}.proof.json`;
		runCreate({
			artifact: artifactPath,
			mime: 'text/markdown',
			context: JSON.stringify({ instruction: 'scan' }),
			runtime: JSON.stringify({ model: 'gpt-5-codex' }),
			evidence: '[]',
			policy: '[]',
		});

 	const matches = await resolveProofTargets([], true);
		expect(matches).toContain(proofPath);
	});

	it('creates and verifies stage proofs from a manifest', async () => {
		const dir = mkdtempSync(join(process.cwd(), 'manifest-stage-'));
		const manifestPath = join(dir, 'run-manifest.json');
		const manifest = {
			manifestId: 'run-manifest-stage',
			runId: 'run-stage',
			schemaVersion: '1.0.0',
			generatedAt: '2025-10-14T00:00:00.000Z',
			actor: 'system',
			strictMode: false,
			blueprint: { title: 'Stage Demo', description: 'Stage CLI e2e', requirements: ['R1'] },
			repo: { owner: 'brainwav', name: 'cortex-os', branch: 'main', commitSha: 'abc123' },
			telemetry: {
				startedAt: '2025-10-14T00:00:00.000Z',
				completedAt: '2025-10-14T00:01:00.000Z',
				durationMs: 60000,
				spoolRunId: 'run-stage',
				events: [
					{ stageKey: 'product-foundation', type: 'start', timestamp: '2025-10-14T00:00:01.000Z' },
					{ stageKey: 'product-foundation', type: 'settle', status: 'fulfilled', timestamp: '2025-10-14T00:00:10.000Z' },
				],
			},
			summary: {
				status: 'completed',
				completedStageKeys: ['product-foundation'],
				pendingStageKeys: [],
				failedStageKeys: [],
				requiresHumanAttention: [],
				blockers: [],
			},
			stages: [
				{
					key: 'product-foundation',
					title: 'Product Foundation',
					category: 'product',
					sequence: 1,
					status: 'passed',
					summary: 'Stage complete',
					dependencies: [],
					timings: { startedAt: '2025-10-14T00:00:01.000Z', completedAt: '2025-10-14T00:00:10.000Z' },
					telemetry: { spoolTaskId: 'G0', spoolStatus: 'fulfilled' },
					gate: {
						sourceGateIds: ['G0', 'G1'],
						requiresHumanApproval: true,
						approvals: [
							{
								role: 'product-owner',
								actor: 'po@brainwav.ai',
								decision: 'approved',
								timestamp: '2025-10-14T00:00:05.000Z',
								commitSha: 'abc123',
							},
						],
						automatedChecks: [{ id: 'G0-check-0', name: 'lint', status: 'pass' }],
					},
					artifacts: [],
					evidence: [{ type: 'kernel', evidenceId: 'ev-1' }],
					nextSteps: [],
				},
			],
		};
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

		await runStageCreate({
			manifest: manifestPath,
			stage: 'product-foundation',
			runtime: JSON.stringify({ model: 'gpt-5-codex' }),
			policy: '[]',
		});

		const proofPath = `${manifestPath}.product-foundation.proof.json`;
		const verifyResult = await runStageVerify({
			manifest: manifestPath,
			stage: 'product-foundation',
			proof: proofPath,
		});
		expect(verifyResult.valid).toBe(true);
	});
});
