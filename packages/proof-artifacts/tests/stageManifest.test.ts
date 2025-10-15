import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { createStageProofEnvelope, loadRunManifest, verifyStageProofEnvelope } from '../src/stageManifest.js';

const createManifestFixture = () => {
	const dir = mkdtempSync(join(tmpdir(), 'manifest-fixture-'));
	const manifestPath = join(dir, 'run-manifest.json');
	const manifest = {
		manifestId: 'run-manifest-test',
		runId: 'run-fixture',
		schemaVersion: '1.0.0',
		generatedAt: '2025-10-14T00:00:00.000Z',
		actor: 'system',
		strictMode: true,
		blueprint: {
			title: 'Test',
			description: 'Stage proof test',
			requirements: ['R1'],
		},
		repo: { owner: 'brainwav', name: 'cortex-os', branch: 'main', commitSha: 'abc123' },
		telemetry: {
			startedAt: '2025-10-14T00:00:00.000Z',
			completedAt: '2025-10-14T00:01:00.000Z',
			durationMs: 60000,
			spoolRunId: 'run-fixture',
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
				summary: 'All good',
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
					automatedChecks: [
						{ id: 'G0-check-0', name: 'lint', status: 'pass' },
					],
				},
				artifacts: [],
				evidence: [
					{ type: 'kernel', evidenceId: 'evidence-123' },
					{ type: 'url', href: 'https://example.com', description: 'Spec link' },
				],
				nextSteps: [],
			},
		],
	};
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	return { manifestPath };
};

describe('stage manifest helpers', () => {
	it('loads manifest and creates stage proof envelope', async () => {
		const { manifestPath } = createManifestFixture();
		const manifest = await loadRunManifest(manifestPath);
		const { envelope } = createStageProofEnvelope({
			manifest,
			manifestPath,
			stageKey: 'product-foundation',
			runtime: { model: 'gpt-5-codex' },
		});
		expect(envelope.artifact.uri).toContain('#stage=product-foundation');
		expect(envelope.evidence).toHaveLength(2);
	});

	it('verifies stage proof envelope alignment', async () => {
		const { manifestPath } = createManifestFixture();
		const manifest = await loadRunManifest(manifestPath);
		const { envelope } = createStageProofEnvelope({
			manifest,
			manifestPath,
			stageKey: 'product-foundation',
			runtime: { model: 'gpt-5-codex' },
		});
		const verification = verifyStageProofEnvelope({
			manifest,
			manifestPath,
			stageKey: 'product-foundation',
			envelope,
		});
		expect(verification.valid).toBe(true);
		expect(verification.issues).toHaveLength(0);
	});
});
