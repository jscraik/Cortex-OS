import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { buildManifestSummary, loadManifest, renderManifestSummary, validateManifest } from '../src/lib/manifest.js';

const createManifestFixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'prp-cli-manifest-'));
  const manifestPath = join(dir, 'run-manifest.json');
  const manifest = {
    manifestId: 'run-manifest-cli',
    runId: 'run-cli',
    schemaVersion: '1.0.0',
    generatedAt: '2025-10-14T00:00:00.000Z',
    actor: 'system',
    strictMode: true,
    blueprint: { title: 'CLI', description: 'Test manifest inspect', requirements: ['R1'] },
    repo: { owner: 'brainwav', name: 'cortex-os', branch: 'main', commitSha: 'abc123' },
    telemetry: {
      startedAt: '2025-10-14T00:00:00.000Z',
      completedAt: '2025-10-14T00:01:00.000Z',
      durationMs: 60000,
      spoolRunId: 'run-cli',
      events: [
        { stageKey: 'product-foundation', type: 'start', timestamp: '2025-10-14T00:00:01.000Z' },
        { stageKey: 'product-foundation', type: 'settle', status: 'fulfilled', timestamp: '2025-10-14T00:00:10.000Z' },
      ],
    },
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
      {
        key: 'product-test-strategy',
        title: 'Test Strategy',
        category: 'product',
        sequence: 2,
        status: 'passed',
        summary: 'All green',
        dependencies: ['product-foundation'],
        timings: {},
        gate: {
          sourceGateIds: ['G2'],
          requiresHumanApproval: true,
          approvals: [
            {
              role: 'qa-lead',
              actor: 'qa@brainwav.ai',
              decision: 'approved',
              timestamp: '2025-10-14T00:00:20.000Z',
              commitSha: 'abc123',
            },
          ],
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
        summary: 'Implementation ready',
        dependencies: ['product-test-strategy'],
        timings: {},
        gate: {
          sourceGateIds: ['G3', 'G4'],
          requiresHumanApproval: true,
          approvals: [
            {
              role: 'reviewer',
              actor: 'review@brainwav.ai',
              decision: 'approved',
              timestamp: '2025-10-14T00:00:30.000Z',
              commitSha: 'abc123',
            },
          ],
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
        summary: 'No blockers',
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
        summary: 'Ready for release',
        dependencies: ['quality-triage'],
        timings: {},
        gate: {
          sourceGateIds: ['G6', 'G7'],
          requiresHumanApproval: true,
          approvals: [
            {
              role: 'release-manager',
              actor: 'release@brainwav.ai',
              decision: 'approved',
              timestamp: '2025-10-14T00:00:40.000Z',
              commitSha: 'abc123',
            },
          ],
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

describe('manifest helpers', () => {
  it('loads and summarizes manifests', async () => {
    const { manifestPath } = createManifestFixture();
    const { manifest } = await loadManifest(manifestPath);
    const summary = buildManifestSummary(manifest);
    expect(summary.status).toBe('completed');
    expect(summary.staged).toHaveLength(5);
    const rendered = renderManifestSummary(summary);
    expect(rendered).toContain('Run Manifest');
  });

  it('validates manifest ordering and approvals', async () => {
    const { manifestPath } = createManifestFixture();
    const { manifest } = await loadManifest(manifestPath);
    const result = validateManifest(manifest);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
