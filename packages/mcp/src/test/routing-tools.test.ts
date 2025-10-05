import { describe, expect, it, vi } from 'vitest';

import { createRoutingTools } from '../server/routing-tools.js';

describe('routing tools', () => {
        it('invokes router for dry runs and explanations', async () => {
                const mockDecision = {
                        requestId: 'req-1',
                        interfaceId: 'cli',
                        policyVersion: '0.4',
                        request: {
                                requestId: 'req-1',
                                interfaceId: 'cli',
                                capabilities: ['code_edit'],
                                tags: [],
                                source: 'test',
                                command: '',
                                env: 'development',
                                operation: 'read_only',
                                metadata: {},
                        },
                        selectedAgent: 'packages/agents/dev',
                        candidates: [],
                        appliedRules: [],
                        approval: { required: false, approvers: [], policies: [] },
                        fallback: null,
                        createdAt: new Date().toISOString(),
                };
                const router = {
                        route: vi.fn().mockResolvedValue(mockDecision),
                        explain: vi.fn().mockReturnValue(mockDecision),
                } as unknown as import('@cortex-os/orchestration').PolicyRouter;
                const [dryRun, explain] = createRoutingTools(router);

                const dryRunResult = await dryRun.handler({ interfaceId: 'cli', capabilities: ['code_edit'] });
                expect(router.route).toHaveBeenCalledWith({
                        interfaceId: 'cli',
                        capabilities: ['code_edit'],
                        tags: [],
                        source: 'mcp',
                });
                expect(dryRunResult.selectedAgent).toBe('packages/agents/dev');

                const explainResult = await explain.handler({ requestId: 'req-1' });
                expect(router.explain).toHaveBeenCalledWith('req-1');
                expect(explainResult.found).toBe(true);
        });

        it('returns not found when explain misses', async () => {
                const router = {
                        route: vi.fn(),
                        explain: vi.fn().mockReturnValue(undefined),
                } as unknown as import('@cortex-os/orchestration').PolicyRouter;
                const [, explain] = createRoutingTools(router);
                const result = await explain.handler({ requestId: 'missing' });
                expect(result.found).toBe(false);
        });
});
