import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';

import { executePlannedWorkflow } from '../../packages/orchestration/src/langgraph/planning-orchestrator.js';

describe('brAInwav orchestration latency', () => {
        it('completes long-horizon planning within the latency budget', async () => {
                const base = new Date('2025-01-02T00:00:00.000Z').getTime();
                let tick = 0;
                const clock = () => new Date(base + tick++ * 500);

                const started = performance.now();
                const workflow = await executePlannedWorkflow({
                        input: 'Benchmark planning throughput for integration test harness.',
                        task: {
                                description: 'Latency check for brAInwav orchestrator',
                                complexity: 5,
                                priority: 5,
                                metadata: { capabilities: ['analysis'] },
                        },
                        session: {
                                id: 'latency-session',
                                model: 'mlx-brainwav',
                                user: 'qa-perf',
                                cwd: '/workspace/perf',
                        },
                        clock,
                });
                const elapsed = performance.now() - started;

                expect(workflow.planningResult.success).toBe(true);
                expect(workflow.planningResult.totalDuration).toBeLessThan(1500);
                expect(workflow.planningResult.phases.length).toBeGreaterThan(0);
                expect(workflow.coordinationDecision.confidence).toBeGreaterThan(0.3);
                expect(workflow.coordinationDecision.confidence).toBeLessThanOrEqual(1);

                expect(elapsed).toBeLessThan(200);
        });
});
