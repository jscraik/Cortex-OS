import { describe, expect, it } from 'vitest';
import type { GateResult, PRPState } from '@cortex-os/kernel';

import { buildGitHubSpecKitPlan, createGitHubSpecKitIssuePayload, formatSpecKitMarkdown } from '../integrations/github-spec-kit.js';
import { computeBmadAlignment } from '../bmad/index.js';
import { CURRENT_SCHEMA_VERSION, RunManifestSchema } from '../run-manifest/schema.js';

function gateWithApproval(id: GateResult['id']): GateResult {
        const now = new Date().toISOString();
        return {
                id,
                name: `${id} Gate`,
                status: 'passed',
                requiresHumanApproval: true,
                humanApproval: {
                        gateId: id,
                        actor: `${id.toLowerCase()}@example.com`,
                        decision: 'approved',
                        timestamp: now,
                        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        rationale: 'OK',
                },
                automatedChecks: [],
                artifacts: [],
                evidence: [],
                timestamp: now,
                nextSteps: [],
        } satisfies GateResult;
}

function createState(blueprint: { title: string; description: string; requirements: string[] }): PRPState {
        return {
                id: 'prp-spec',
                runId: 'run-010',
                phase: 'strategy',
                blueprint,
                enforcementProfile: undefined,
                gates: {},
                approvals: [],
                exports: {},
                outputs: {},
                validationResults: {},
                evidence: [],
                metadata: { startTime: new Date().toISOString() },
        } as PRPState;
}

function buildManifest() {
        const now = new Date().toISOString();
        return RunManifestSchema.parse({
                schemaVersion: CURRENT_SCHEMA_VERSION,
                manifestId: 'run-manifest-010',
                runId: 'run-010',
                generatedAt: now,
                actor: 'system',
                strictMode: true,
                blueprint: {
                        title: 'Spec Kit Ready',
                        description: 'Turn BMAD output into Spec Kit payload.',
                        requirements: ['Align blueprint', 'Capture approvals'],
                },
                repo: {
                        owner: 'brainwav',
                        name: 'cortex-os',
                        branch: 'main',
                        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                },
                stages: [
                        {
                                key: 'product-foundation',
                                title: 'Product Foundation',
                                category: 'product',
                                sequence: 1,
                                status: 'passed',
                                dependencies: [],
                                timings: {},
                                telemetry: {},
                                gate: {
                                        sourceGateIds: ['G0', 'G1'],
                                        requiresHumanApproval: true,
                                        approvals: [
                                                {
                                                        role: 'product-owner',
                                                        actor: 'pm@example.com',
                                                        decision: 'approved',
                                                        timestamp: now,
                                                        rationale: 'Ready',
                                                        commitSha: 'cccccccccccccccccccccccccccccccccccccccc',
                                                },
                                                {
                                                        role: 'architect',
                                                        actor: 'arch@example.com',
                                                        decision: 'approved',
                                                        timestamp: now,
                                                        rationale: 'Architecture ready',
                                                        commitSha: 'dddddddddddddddddddddddddddddddddddddddd',
                                                },
                                        ],
                                        automatedChecks: [],
                                },
                                artifacts: [],
                                evidence: [],
                                nextSteps: [],
                        },
                ],
                summary: {
                        status: 'completed',
                        completedStageKeys: ['product-foundation'],
                        pendingStageKeys: [],
                        failedStageKeys: [],
                        requiresHumanAttention: [],
                        blockers: [],
                },
                telemetry: {
                        startedAt: now,
                        completedAt: now,
                        durationMs: 0,
                        spoolRunId: 'run-010',
                        events: [],
                        metrics: { totalStages: 1, completedStages: 1, failedStages: 0 },
                },
        });
}

describe('GitHub Spec Kit integration helpers', () => {
        it('creates plan and issue payloads from BMAD alignment', () => {
                const blueprint = {
                        title: 'Spec Kit Ready',
                        description: 'Turn BMAD output into Spec Kit payload.',
                        requirements: ['Align blueprint', 'Capture approvals'],
                };
                const state = createState(blueprint);
                state.gates.G0 = gateWithApproval('G0');
                state.gates.G1 = gateWithApproval('G1');
                state.approvals.push(
                        {
                                gateId: 'G0',
                                actor: 'pm@example.com',
                                decision: 'approved',
                                timestamp: new Date().toISOString(),
                                commitSha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                rationale: 'Ready',
                        },
                        {
                                gateId: 'G1',
                                actor: 'arch@example.com',
                                decision: 'approved',
                                timestamp: new Date().toISOString(),
                                commitSha: 'ffffffffffffffffffffffffffffffffffffffff',
                                rationale: 'Ready',
                        },
                );

                const manifest = buildManifest();
                const alignment = computeBmadAlignment(state, manifest);
                const plan = buildGitHubSpecKitPlan(blueprint, manifest, alignment);

                expect(plan.readiness).toBe('ready');
                expect(plan.gates).toHaveLength(2);
                expect(plan.alignment.isAligned).toBe(true);

                const issue = createGitHubSpecKitIssuePayload(plan);
                expect(issue.title).toContain('Spec Kit Ready');
                expect(issue.body).toContain('## Gates');
                expect(issue.body).toContain('Align blueprint');

                const markdown = formatSpecKitMarkdown(plan);
                expect(markdown).toContain('---');
                expect(markdown).toContain('runId: run-010');
        });
});
