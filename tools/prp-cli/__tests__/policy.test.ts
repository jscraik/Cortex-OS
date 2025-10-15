import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadManifest } from '../src/lib/manifest.js';
import { evaluatePolicy, loadPolicy } from '../src/lib/policy.js';

const createManifest = () => {
  const dir = mkdtempSync(join(tmpdir(), 'prp-cli-policy-'));
  const manifestPath = join(dir, 'run-manifest.json');
  const manifest = {
    manifestId: 'policy-test',
    runId: 'run-policy',
    schemaVersion: '1.0.0',
    generatedAt: '2025-10-14T00:00:00.000Z',
    actor: 'system',
    strictMode: true,
    blueprint: { title: 'Policy Test', description: 'Policy evaluation', requirements: ['R1'] },
    repo: { owner: 'brainwav', name: 'cortex-os', branch: 'main', commitSha: 'abc123' },
    telemetry: { startedAt: '2025-10-14T00:00:00.000Z', completedAt: '2025-10-14T00:01:00.000Z', durationMs: 60000, spoolRunId: 'run-policy', events: [] },
    summary: {
      status: 'completed',
      completedStageKeys: ['product-foundation', 'product-test-strategy', 'engineering-execution', 'quality-triage', 'automation-release'],
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
          approvals: [{ role: 'product-owner', actor: 'po@brainwav.ai', decision: 'approved', timestamp: '2025-10-14T00:00:05.000Z', commitSha: 'abc123' }],
          automatedChecks: [{ id: 'G0-check-0', name: 'lint', status: 'pass' }],
        },
        artifacts: [],
        evidence: [],
        nextSteps: [],
      },
      {
        key: 'product-test-strategy',
        title: 'Test Strategy',
        category: 'product',
        sequence: 2,
        status: 'passed',
        summary: 'Ready',
        dependencies: ['product-foundation'],
        timings: {},
        gate: {
          sourceGateIds: ['G2'],
          requiresHumanApproval: true,
          approvals: [{ role: 'qa-lead', actor: 'qa@brainwav.ai', decision: 'approved', timestamp: '2025-10-14T00:00:10.000Z', commitSha: 'abc123' }],
          automatedChecks: [{ id: 'G2-check-0', name: 'coverage-plan', status: 'pass' }],
        },
        artifacts: [],
        evidence: [],
        nextSteps: [],
      },
      {
        key: 'engineering-execution',
        title: 'Engineering Execution',
        category: 'engineering',
        sequence: 3,
        status: 'passed',
        summary: 'Implemented',
        dependencies: ['product-test-strategy'],
        timings: {},
        gate: {
          sourceGateIds: ['G3', 'G4'],
          requiresHumanApproval: true,
          approvals: [{ role: 'reviewer', actor: 'review@brainwav.ai', decision: 'approved', timestamp: '2025-10-14T00:00:20.000Z', commitSha: 'abc123' }],
          automatedChecks: [{ id: 'G3-check-0', name: 'unit-tests', status: 'pass' }],
        },
        artifacts: [],
        evidence: [],
        nextSteps: [],
      },
      {
        key: 'quality-triage',
        title: 'Quality Triage',
        category: 'quality',
        sequence: 4,
        status: 'passed',
        summary: 'Stable',
        dependencies: ['engineering-execution'],
        timings: {},
        gate: {
          sourceGateIds: ['G5'],
          requiresHumanApproval: false,
          approvals: [],
          automatedChecks: [{ id: 'G5-check-0', name: 'bug-review', status: 'pass' }],
        },
        artifacts: [],
        evidence: [],
        nextSteps: [],
      },
      {
        key: 'automation-release',
        title: 'Automation Release',
        category: 'automation',
        sequence: 5,
        status: 'passed',
        summary: 'Ready to release',
        dependencies: ['quality-triage'],
        timings: {},
        gate: {
          sourceGateIds: ['G6', 'G7'],
          requiresHumanApproval: true,
          approvals: [{ role: 'release-manager', actor: 'release@brainwav.ai', decision: 'approved', timestamp: '2025-10-14T00:00:30.000Z', commitSha: 'abc123' }],
          automatedChecks: [{ id: 'G7-check-0', name: 'release-checklist', status: 'pass' }],
        },
        artifacts: [],
        evidence: [],
        nextSteps: [],
      },
    ],
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath };
};

describe('policy evaluation', () => {
  it('passes when manifest meets policy requirements', async () => {
    const { manifestPath } = createManifest();
    const policyDir = mkdtempSync(join(tmpdir(), 'prp-cli-policy-file-'));
    const policyPath = join(policyDir, 'policy.json');
    const policy = {
      version: '1.0.0',
      requireStrictMode: true,
      stageRules: {
        'product-foundation': { allowStatus: ['passed'] },
        'automation-release': { requireApprovals: 1 },
      },
    };
    writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);

    const [{ manifest }, loadedPolicy] = await Promise.all([
      loadManifest(manifestPath),
      loadPolicy(policyPath),
    ]);

    const evaluation = evaluatePolicy(manifest, loadedPolicy);
    expect(evaluation.ok).toBe(true);
  });

  it('fails when policy conditions are not satisfied', async () => {
    const { manifestPath } = createManifest();
    const policyDir = mkdtempSync(join(tmpdir(), 'prp-cli-policy-file-fail-'));
    const policyPath = join(policyDir, 'policy.json');
    const policy = {
      requireStrictMode: true,
      stageRules: {
        'product-foundation': { allowStatus: ['failed'] },
      },
    };
    writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);

    const [{ manifest }, loadedPolicy] = await Promise.all([
      loadManifest(manifestPath),
      loadPolicy(policyPath),
    ]);

    const evaluation = evaluatePolicy(manifest, loadedPolicy);
    expect(evaluation.ok).toBe(false);
    expect(evaluation.findings.some((finding) => finding.level === 'error')).toBe(true);
  });
});
