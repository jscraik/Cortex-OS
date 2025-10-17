import { describe, expect, it, vi } from 'vitest';
import type { PRPState } from '@cortex-os/kernel';

import { runBmadLoop } from '../bmad/index.js';
import type { Blueprint } from '../runner.js';
import { CURRENT_SCHEMA_VERSION, RunManifestSchema } from '../run-manifest/schema.js';

const BLUEPRINT: Blueprint = {
        title: 'Review neuron wiring',
        description: 'Ensure BMAD review hook is invoked with frozen state.',
        requirements: ['Freeze context', 'Expose alignment report'],
};

function createState(): PRPState {
        return {
                id: 'prp-loop',
                runId: 'run-010',
                phase: 'strategy',
                blueprint: { ...BLUEPRINT },
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

function createManifest() {
        const now = new Date().toISOString();
        return RunManifestSchema.parse({
                schemaVersion: CURRENT_SCHEMA_VERSION,
                manifestId: 'run-manifest-002',
                runId: 'run-010',
                generatedAt: now,
                actor: 'system',
                strictMode: false,
                blueprint: { ...BLUEPRINT },
                repo: { owner: 'brainwav', name: 'cortex-os', branch: 'main', commitSha: 'ffffffffffffffffffffffffffffffffffffffff' },
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
                                        sourceGateIds: ['G0'],
                                        requiresHumanApproval: false,
                                        approvals: [],
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

describe('runBmadLoop', () => {
        it('invokes review hook with frozen context', async () => {
                const state = createState();
                const manifest = createManifest();

                const workflowResult = {
                        state,
                        prpPath: '/tmp/prp.md',
                        markdown: '# PRP',
                        manifestPath: '/tmp/run-manifest-002.json',
                        manifest,
                };

                const workflowRunner = vi.fn().mockResolvedValue(workflowResult);

                const reviewHook = {
                        id: 'review.neuron',
                        mode: 'review-only' as const,
                        onReviewReady: vi.fn((context) => {
                                expect(Object.isFrozen(context.state)).toBe(true);
                                expect(Object.isFrozen(context.manifest)).toBe(true);
                                expect(context.alignment.isAligned).toBe(true);
                        }),
                };

                const result = await runBmadLoop(
                        BLUEPRINT,
                        { owner: 'brainwav', repo: 'cortex-os', branch: 'main', commitSha: 'ffffffffffffffffffffffffffffffffffffffff' },
                        {
                                workingDirectory: '/tmp',
                                projectRoot: '/tmp',
                                reviewHook,
                        },
                        workflowRunner,
                );

                expect(workflowRunner).toHaveBeenCalledOnce();
                expect(reviewHook.onReviewReady).toHaveBeenCalledOnce();
                expect(result.alignment).toBeDefined();
        });

        it('rejects non review-only hooks', async () => {
                await expect(
                        runBmadLoop(
                                BLUEPRINT,
                                { owner: 'brainwav', repo: 'cortex-os', branch: 'main', commitSha: 'ffffffffffffffffffffffffffffffffffffffff' },
                                {
                                        workingDirectory: '/tmp',
                                        projectRoot: '/tmp',
                                        reviewHook: {
                                                id: 'invalid-hook',
                                                mode: 'mutating' as 'review-only',
                                                onReviewReady: async () => undefined,
                                        },
                                },
                        ),
                ).rejects.toThrow('Review neuron hook must operate in review-only mode.');
        });
});
