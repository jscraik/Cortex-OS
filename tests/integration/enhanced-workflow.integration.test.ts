import { describe, expect, it } from 'vitest';

import { executePlannedWorkflow } from '../../packages/orchestration/src/langgraph/planning-orchestrator.js';
import {
        createPlanningSessionTool,
        executePlanningPhaseTool,
        getPlanningStatusTool,
        PlanningPhase as McpPlanningPhase,
} from '../../packages/mcp-core/src/tools/planning-tools.js';
import { InMemoryStore } from '../../packages/memories/src/adapters/store.memory.js';
import { NoopEmbedder } from '../../packages/memories/src/adapters/embedder.noop.js';
import { createMemoryService } from '../../packages/memories/src/service/memory-service.js';

describe('Cross-cutting workflow integration', () => {
        it('runs the brAInwav planning pipeline end-to-end with memory persistence', async () => {
                const anchor = new Date('2025-01-01T00:00:00.000Z').getTime();
                let tick = 0;
                const clock = () => new Date(anchor + tick++ * 1000);

                const workflow = await executePlannedWorkflow({
                        input: 'Run enhanced DSP orchestration with memory + security validation.',
                        task: {
                                description: 'Execute brAInwav end-to-end workflow covering DSP, coordination, and persistence.',
                                complexity: 7,
                                priority: 6,
                                metadata: { capabilities: ['analysis', 'security', 'memory'] },
                        },
                        session: {
                                id: 'integration-session',
                                model: 'mlx-brainwav',
                                user: 'qa-integration',
                                cwd: '/workspace/tests',
                                brainwavSession: 'integration-e2e',
                        },
                        clock,
                });

                expect(workflow.planningResult.success).toBe(true);
                expect(workflow.planningResult.phases.length).toBeGreaterThan(0);
                expect(workflow.coordinationDecision.assignments.length).toBeGreaterThan(0);
                expect(workflow.stateTransitions.every((transition) => transition.status === 'completed')).toBe(true);
                expect(workflow.coordinationDecision.telemetry.every((entry) => entry.branding === 'brAInwav')).toBe(true);

                const planningCtx = (workflow.state.ctx as { planning?: { phases?: unknown[] } } | undefined)?.planning;
                expect(Array.isArray(planningCtx?.phases)).toBe(true);

                const sessionResult = await createPlanningSessionTool.execute({
                        name: 'brAInwav integration session',
                        description: 'Tracks the orchestrated run for verification',
                        workspaceId: 'workspace-integration',
                        agentId: workflow.coordinationDecision.assignments[0]?.agentId,
                        complexity: 6,
                        priority: 6,
                });

                const store = new InMemoryStore();
                const embedder = new NoopEmbedder();
                const memoryService = createMemoryService(store, embedder);

                for (const phase of workflow.planningResult.phases) {
                        const result = await executePlanningPhaseTool.execute({
                                sessionId: sessionResult.sessionId,
                                phase: phase.phase as unknown as McpPlanningPhase,
                                action: `brAInwav phase alignment: ${phase.phase}`,
                                metadata: { duration: phase.duration },
                        });
                        expect(result.status).toBe('completed');
                        expect(result.brainwavMetadata.dspOptimized).toBe(true);
                }

                const status = await getPlanningStatusTool.execute({
                        sessionId: sessionResult.sessionId,
                        includeHistory: true,
                        includeSteps: true,
                });

                expect(status.status).toBe('completed');
                expect(status.context.metadata.createdBy).toBe('brAInwav');
                expect(status.context.steps.length).toBe(workflow.planningResult.phases.length);
                expect(status.context.history.length).toBeGreaterThan(0);

                const nowIso = new Date().toISOString();
                const memoryId = `integration-${Date.now()}`;
                const stored = await memoryService.save({
                        id: memoryId,
                        kind: 'event',
                        text: `brAInwav orchestration summary: ${workflow.output ?? 'no output generated'}`,
                        tags: ['brAInwav', 'orchestration', workflow.coordinationDecision.strategy],
                        createdAt: nowIso,
                        updatedAt: nowIso,
                        provenance: {
                                source: 'system',
                                actor: 'brAInwav-integration-suite',
                        },
                        policy: {
                                scope: 'session',
                        },
                });

                expect(stored.status).toBe('approved');

                const fetched = await memoryService.get(memoryId);
                expect(fetched?.status).toBe('approved');
                expect(fetched?.tags).toContain('orchestration');

                const searchResults = await memoryService.search({ text: 'orchestration', topK: 5 });
                expect(searchResults.some((memory) => memory.id === memoryId)).toBe(true);

                const pending = await memoryService.listPending?.();
                expect(pending).toBeDefined();
                expect(pending?.length).toBe(0);
        });
});
