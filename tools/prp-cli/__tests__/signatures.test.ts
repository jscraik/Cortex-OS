import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { createStageProofEnvelope } from '@cortex-os/proof-artifacts';
import { verifyStageProofs } from '../src/lib/signatures.js';

const createManifestFixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'prp-cli-signatures-'));
  const manifestPath = join(dir, 'run-manifest.json');
  const manifest = {
    manifestId: 'signature-test',
    runId: 'run-signature',
    schemaVersion: '1.0.0',
    generatedAt: '2025-10-14T00:00:00.000Z',
    actor: 'system',
    strictMode: false,
    blueprint: { title: 'Signatures', description: 'Test signature verification', requirements: ['R1'] },
    repo: { owner: 'brainwav', name: 'cortex-os', branch: 'main', commitSha: 'abc123' },
    telemetry: {
      startedAt: '2025-10-14T00:00:00.000Z',
      completedAt: '2025-10-14T00:01:00.000Z',
      durationMs: 60000,
      spoolRunId: 'run-signature',
      events: [],
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
        summary: 'Complete',
        dependencies: [],
        timings: {},
        gate: {
          sourceGateIds: ['G0', 'G1'],
          requiresHumanApproval: true,
          approvals: [{ role: 'po', actor: 'po@brainwav.ai', decision: 'approved', timestamp: '2025-10-14T00:00:10.000Z', commitSha: 'abc123' }],
          automatedChecks: [{ id: 'G0-check-0', name: 'lint', status: 'pass' }],
        },
        artifacts: [],
        evidence: [{ type: 'kernel', evidenceId: 'ev-123' }],
        nextSteps: [],
      },
    ],
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath, manifest };
};

describe('signature verification helpers', () => {
  it('verifies stage proofs created from manifest', async () => {
    const { manifestPath, manifest } = createManifestFixture();
    const { envelope } = createStageProofEnvelope({
      manifest,
      manifestPath,
      stageKey: 'product-foundation',
      runtime: { model: 'gpt-5-codex' },
    });
    const proofPath = `${manifestPath}.product-foundation.proof.json`;
    writeFileSync(proofPath, `${JSON.stringify(envelope, null, 2)}\n`);

    const verification = await verifyStageProofs(manifestPath, [proofPath]);
    expect(verification.ok).toBe(true);
  });
});
