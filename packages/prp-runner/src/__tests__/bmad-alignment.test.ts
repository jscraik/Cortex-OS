import { describe, expect, it } from 'vitest';
import type { GateResult, PRPState } from '@cortex-os/kernel';

import { computeBmadAlignment } from '../bmad/index.js';
import { CURRENT_SCHEMA_VERSION, RunManifestSchema } from '../run-manifest/schema.js';

function buildGate(id: GateResult['id'], overrides: Partial<GateResult> = {}): GateResult {
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
                        rationale: 'Auto-approved for test',
                },
                automatedChecks: [],
                artifacts: [],
                evidence: [],
                timestamp: now,
                nextSteps: ['Proceed'],
                ...overrides,
        } satisfies GateResult;
}

const BASE_BLUEPRINT = {
        title: 'Spec Kit Integration',
        description: 'Demonstrate Spec Kit wiring through PRP runner.',
        requirements: ['Align manifest with blueprint', 'Capture approvals'],
};

function createState(
        blueprint = BASE_BLUEPRINT,
        overrides: Partial<PRPState> = {},
): PRPState {
        const now = new Date().toISOString();
        return {
                id: 'prp-001',
                runId: 'run-001',
                phase: 'strategy',
                blueprint,
                enforcementProfile: undefined,
                gates: {},
                approvals: [],
                exports: {},
                outputs: {},
                validationResults: {},
                evidence: [],
                metadata: { startTime: now },
                ...overrides,
        } as PRPState;
}

function buildManifest(overrides: Partial<Parameters<typeof RunManifestSchema.parse>[0]> = {}) {
        const now = new Date().toISOString();
        const base = {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                manifestId: 'run-manifest-001',
                runId: 'run-001',
                generatedAt: now,
                actor: 'system',
                strictMode: true,
                blueprint: { ...BASE_BLUEPRINT },
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
                                summary: 'Planning complete',
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
                                                        rationale: 'Looks good',
                                                        commitSha: 'cccccccccccccccccccccccccccccccccccccccc',
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
                        spoolRunId: 'run-001',
                        events: [],
                        metrics: { totalStages: 1, completedStages: 1, failedStages: 0 },
                },
        } satisfies Parameters<typeof RunManifestSchema.parse>[0];

        return RunManifestSchema.parse({ ...base, ...overrides });
}

describe('computeBmadAlignment', () => {
        it('reports aligned state when manifest matches PRP state', () => {
                const state = createState(BASE_BLUEPRINT, { id: 'prp-001', runId: 'run-001' });

                state.gates.G0 = buildGate('G0');
                state.gates.G1 = buildGate('G1');
                state.approvals.push(
                        {
                                gateId: 'G0',
                                actor: 'g0@example.com',
                                decision: 'approved',
                                timestamp: new Date().toISOString(),
                                commitSha: 'dddddddddddddddddddddddddddddddddddddddd',
                                rationale: 'OK',
                        },
                        {
                                gateId: 'G1',
                                actor: 'g1@example.com',
                                decision: 'approved',
                                timestamp: new Date().toISOString(),
                                commitSha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                rationale: 'OK',
                        },
                );

                const manifest = buildManifest();
                const report = computeBmadAlignment(state, manifest);

                expect(report.isAligned).toBe(true);
                expect(report.approvals.pendingGateIds).toHaveLength(0);
                expect(report.issues).toHaveLength(0);
        });

        it('flags blueprint and approval mismatches', () => {
                const state = createState(BASE_BLUEPRINT, { id: 'prp-002', runId: 'run-002' });

                state.gates.G0 = buildGate('G0', { requiresHumanApproval: true, humanApproval: undefined });
                const manifest = buildManifest({
                        runId: 'run-002',
                        blueprint: {
                                ...BASE_BLUEPRINT,
                                requirements: ['Align manifest with blueprint'],
                        },
                        summary: {
                                status: 'in-progress',
                                completedStageKeys: [],
                                pendingStageKeys: ['product-foundation'],
                                failedStageKeys: [],
                                requiresHumanAttention: ['product-foundation'],
                                blockers: [
                                        { stageKey: 'product-foundation', severity: 'blocker', message: 'Approval pending' },
                                ],
                        },
                });

                const report = computeBmadAlignment(state, manifest);

                expect(report.isAligned).toBe(false);
                expect(report.blueprint.missingRequirements).toEqual(['Capture approvals']);
                expect(report.approvals.pendingGateIds).toContain('G0');
                expect(report.issues.some((issue) => issue.includes('Manifest is missing'))).toBe(true);
        });
});
