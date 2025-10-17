import { describe, expect, it } from 'vitest';
import {
        CURRENT_SCHEMA_VERSION,
        PRODUCT_TO_AUTOMATION_PIPELINE,
        RunManifestSchema,
        type RunManifest,
        type StageEntry,
} from '../run-manifest/schema.js';
import { augmentManifest, buildPrpBlueprint } from '../task-integration.js';

describe('task integration', () => {
        const baseBaton = {
                schema_version: '1.1',
                task_slug: 'demo-task',
                goal: 'Deliver demo task integration for PRP runner',
                constraints: ['Named exports only', 'Functions must remain ≤40 lines'],
                testing: {
                        coverage_target: '≥95% changed lines',
                        types: ['unit', 'integration'],
                        determinism: 'Inject fixed clock values',
                },
                planner: {
                        plan_paths: {
                                implementation_plan_md: 'tasks/demo-task/implementation-plan.md',
                                tdd_plan_md: 'tasks/demo-task/tdd-plan.md',
                                spec_md: 'tasks/demo-task/spec.md',
                        },
                },
        } as const;

        function buildManifest(): RunManifest {
                const stageDefinition = PRODUCT_TO_AUTOMATION_PIPELINE[0];
                const stageEntry: StageEntry = {
                        key: stageDefinition.key,
                        title: stageDefinition.title,
                        category: stageDefinition.category,
                        sequence: stageDefinition.sequence,
                        status: 'pending',
                        summary: 'Awaiting execution',
                        dependencies: stageDefinition.dependencies,
                        timings: {},
                        telemetry: undefined,
                        gate: {
                                sourceGateIds: stageDefinition.sourceGateIds,
                                requiresHumanApproval: stageDefinition.requiresHumanApproval,
                                approvals: [],
                                automatedChecks: [],
                        },
                        artifacts: [],
                        evidence: [],
                        nextSteps: [],
                };

                const manifest: RunManifest = {
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                        manifestId: 'manifest-123',
                        runId: 'run-123',
                        generatedAt: new Date('2025-10-16T00:00:00.000Z').toISOString(),
                        actor: 'test-bot',
                        strictMode: false,
                        blueprint: {
                                title: 'Baseline',
                                description: 'Baseline manifest',
                                requirements: ['Initial requirement'],
                        },
                        repo: {
                                owner: 'cortex-os',
                                name: 'cortex',
                                branch: 'main',
                                commitSha: 'abcdef1234567890',
                        },
                        stages: [stageEntry],
                        summary: {
                                status: 'in-progress',
                                completedStageKeys: [],
                                pendingStageKeys: [stageDefinition.key],
                                failedStageKeys: [],
                                requiresHumanAttention: [],
                                blockers: [],
                        },
                        telemetry: {
                                startedAt: new Date('2025-10-16T00:00:00.000Z').toISOString(),
                                events: [],
                        },
                };

                return RunManifestSchema.parse(manifest);
        }

        it('builds blueprint metadata from baton', () => {
                const { blueprint, metadata } = buildPrpBlueprint(baseBaton);

                expect(blueprint.title).toBe('Demo Task');
                expect(blueprint.description).toContain('Deliver demo task integration');
                expect(blueprint.requirements.length).toBeGreaterThanOrEqual(3);
                expect(blueprint.requirements).toEqual(
                        expect.arrayContaining([
                                'Named exports only',
                                'Functions must remain ≤40 lines',
                                'Coverage target: ≥95% changed lines',
                        ]),
                );
                expect(blueprint.metadata).toMatchObject({
                        source: 'task-manager',
                        schemaVersion: '1.1',
                        planPaths: {
                                implementation_plan_md: 'tasks/demo-task/implementation-plan.md',
                                tdd_plan_md: 'tasks/demo-task/tdd-plan.md',
                                spec_md: 'tasks/demo-task/spec.md',
                        },
                });
                expect(metadata).toEqual({
                        taskId: 'demo-task',
                        priority: undefined,
                        specPath: 'tasks/demo-task/spec.md',
                        batonPath: undefined,
                        taskDir: undefined,
                        planPaths: {
                                implementation_plan_md: 'tasks/demo-task/implementation-plan.md',
                                tdd_plan_md: 'tasks/demo-task/tdd-plan.md',
                                spec_md: 'tasks/demo-task/spec.md',
                        },
                });
        });

        it('augments run manifest with task metadata', () => {
                const manifest = buildManifest();
                const { metadata } = buildPrpBlueprint(baseBaton);

                const augmented = augmentManifest(manifest, metadata);

                expect(augmented).not.toBe(manifest);
                expect(augmented.taskId).toBe('demo-task');
                expect(augmented.specPath).toBe('tasks/demo-task/spec.md');
                expect(augmented.blueprint.metadata?.task).toMatchObject({
                        id: 'demo-task',
                        specPath: 'tasks/demo-task/spec.md',
                });
                expect(manifest.taskId).toBeUndefined();
        });
});
