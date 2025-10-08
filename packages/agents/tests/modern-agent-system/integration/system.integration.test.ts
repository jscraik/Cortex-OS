import { describe, expect, it, vi } from 'vitest';
import { createModernAgentSystem } from '../../../../src/modern-agent-system/index.js';
import type {
        ApprovalDecision,
        PlannerGoal,
        PlannerSessionState,
        SessionMemoryAdapter,
        WorkerDefinition,
} from '../../../../src/modern-agent-system/types.js';

const createMemoryAdapter = () => {
        const store = new Map<string, PlannerSessionState>();
        const adapter: SessionMemoryAdapter = {
                loadSession: async (sessionId) => store.get(sessionId) ?? null,
                saveSession: async (sessionId, state) => {
                        store.set(sessionId, state);
                },
                appendEvent: async (sessionId, event) => {
                        const current = store.get(sessionId);
                        if (!current) return;
                        current.facts.push(JSON.stringify(event.payload));
                        current.lastUpdated = event.timestamp;
                        store.set(sessionId, current);
                },
        };
        return { adapter, store };
};

const createWorker = (name: string): WorkerDefinition => ({
        name,
        description: 'integration planner',
        capabilities: ['plan'],
        handler: async (task, context) => {
                const tool = await context.tools.invoke({
                        tool: 'analysis.summarize',
                        input: { text: context.goal.objective },
                });
                return {
                        capability: task.capability,
                        worker: name,
                        output: { summary: tool.result, evidence: context.contextDocuments },
                };
        },
});

describe('createModernAgentSystem', () => {
        it('runs planner, records memory, and respects approvals', async () => {
                const { adapter, store } = createMemoryAdapter();
                const approvalSpy = vi.fn(async () => ({ approved: true } satisfies ApprovalDecision));
                const system = createModernAgentSystem({
                        workers: [createWorker('planner-worker')],
                        memory: { session: adapter, rag: { retrieve: async () => [{ id: 'ctx', content: 'fact' }] } },
                        approvals: { require: true, gate: approvalSpy },
                        mcp: { stdio: [], streamableHttp: [] },
                        tools: {
                                'analysis.summarize': async (request) => ({
                                        tool: request.tool,
                                        result: { text: `summary:${(request.input as { text: string }).text}` },
                                        tokensUsed: 8,
                                }),
                        },
                });

                const goal: PlannerGoal = {
                        sessionId: 'session-42',
                        objective: 'Refine integration flow',
                        requiredCapabilities: ['plan'],
                };

                const result = await system.planner.run(goal);

                expect(result.steps).toHaveLength(1);
                expect(result.steps[0].status).toBe('completed');
                expect(result.steps[0].output).toMatchObject({ summary: { text: expect.stringContaining('summary:Refine') } });
                expect(approvalSpy).toHaveBeenCalledOnce();
                expect(result.reasoning.strategy).toBe('chain-of-thought');
                expect(result.reasoning.thoughts[0]?.text).toContain('Refine integration flow');

                const stored = store.get(goal.sessionId);
                expect(stored?.steps[0]?.status).toBe('completed');
                expect(stored?.reasoning?.strategy).toBe('chain-of-thought');
        });
});
