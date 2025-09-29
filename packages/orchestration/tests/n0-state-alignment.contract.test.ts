import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { projectKernelWorkflowToN0 } from '../../kernel/src/kernel.js';
import { createInitialPRPState } from '../../kernel/src/state.js';
import {
        agentStateToN0,
        cortexStateToN0,
        workflowStateToN0,
} from '../src/langgraph/n0-adapters.js';
import {
        createInitialN0State,
        mergeN0State,
        N0SessionSchema,
        N0StateSchema,
} from '../src/langgraph/n0-state.js';

describe('cross-package n0 state alignment', () => {
        const session = N0SessionSchema.parse({
                id: 'alignment-session',
                model: 'brAInwav-sonnet',
                user: 'contract-tests',
                cwd: '/workspace/alignment',
                brainwavSession: 'session-trace-alignment',
        });
        const ctxOverrides = {
                ctx: {
                        thermal: { level: 'warning' },
                        delegation: { lane: 'analysis', status: 'active' },
                },
        } as const;

        it('keeps state keys aligned across agents, kernel, and orchestration', () => {
                const agentState = {
                        messages: [new HumanMessage('Inspect repo'), new AIMessage('analysis complete')],
                        currentAgent: 'analysis',
                        taskType: 'code-review',
                        result: { status: 'ok' },
                        error: undefined as string | undefined,
                };
                const agentN0 = agentStateToN0(agentState, session, {
                        budget: { tokens: 2048, timeMs: 120000, depth: 1 },
                        overrides: ctxOverrides,
                });

                const prpState = createInitialPRPState(
                        {
                                title: 'Cross package contract',
                                description: 'Ensure kernel projections keep parity',
                                requirements: ['state-alignment'],
                        },
                        { deterministic: true },
                );
                const kernelWorkflow = {
                        messages: [new HumanMessage('align states'), new AIMessage('kernel done')],
                        prpState,
                        nextStep: 'complete',
                        error: '',
                };
                const kernelN0 = projectKernelWorkflowToN0(kernelWorkflow, session, {
                        budget: { tokens: 1024, timeMs: 60000, depth: 1 },
                        overrides: ctxOverrides,
                });

                const cortexState = {
                        messages: [new HumanMessage('orchestrate tasks'), new AIMessage('finished')],
                        currentStep: 'execution',
                        context: { filesTouched: 4 },
                        tools: [{ name: 'agent.write' }],
                        result: { ok: true },
                        error: undefined as string | undefined,
                };
                const cortexN0 = cortexStateToN0(cortexState, session, {
                        overrides: ctxOverrides,
                });

                const workflowState = {
                        messages: [new HumanMessage('workflow start'), new AIMessage('workflow end')],
                        prpState: { phase: 'plan' },
                        nextStep: 'deliver',
                        error: undefined as string | undefined,
                };
                const orchestrationN0 = workflowStateToN0(workflowState, session, {
                        overrides: ctxOverrides,
                });

                const sortedKeys = (value: Record<string, unknown>) =>
                        Object.keys(value).sort((a, b) => a.localeCompare(b));
                const sessionKeys = sortedKeys(session as Record<string, unknown>);

                expect(sortedKeys(agentN0)).toEqual([
                        'budget',
                        'ctx',
                        'input',
                        'messages',
                        'output',
                        'session',
                ]);
                expect(sortedKeys(kernelN0)).toEqual([
                        'budget',
                        'ctx',
                        'input',
                        'messages',
                        'output',
                        'session',
                ]);
                expect(sortedKeys(cortexN0)).toEqual([
                        'budget',
                        'ctx',
                        'input',
                        'messages',
                        'output',
                        'session',
                ]);
                expect(sortedKeys(orchestrationN0)).toEqual([
                        'budget',
                        'ctx',
                        'input',
                        'messages',
                        'output',
                        'session',
                ]);

                expect(sortedKeys(agentN0.session)).toEqual(sessionKeys);
                expect(sortedKeys(kernelN0.session)).toEqual(sessionKeys);
                expect(sortedKeys(cortexN0.session)).toEqual(sessionKeys);
                expect(sortedKeys(orchestrationN0.session)).toEqual(sessionKeys);
                expect(agentN0.session).toEqual(session);
                expect(kernelN0.session).toEqual(session);
                expect(cortexN0.session).toEqual(session);
                expect(orchestrationN0.session).toEqual(session);

                expect(agentN0.ctx).toMatchObject({
                        currentAgent: 'analysis',
                        taskType: 'code-review',
                        result: { status: 'ok' },
                        thermal: { level: 'warning' },
                        delegation: { lane: 'analysis', status: 'active' },
                });
                expect(kernelN0.ctx).toMatchObject({
                        prpState,
                        nextStep: 'complete',
                        error: '',
                        thermal: { level: 'warning' },
                        delegation: { lane: 'analysis', status: 'active' },
                });
                expect(cortexN0.ctx).toMatchObject({
                        currentStep: 'execution',
                        context: { filesTouched: 4 },
                        tools: [{ name: 'agent.write' }],
                        thermal: { level: 'warning' },
                        delegation: { lane: 'analysis', status: 'active' },
                });
                expect(orchestrationN0.ctx).toMatchObject({
                        prpState: { phase: 'plan' },
                        nextStep: 'deliver',
                        thermal: { level: 'warning' },
                        delegation: { lane: 'analysis', status: 'active' },
                });

                expect(() => N0StateSchema.parse(kernelN0)).not.toThrow();
                expect(() => N0StateSchema.parse(cortexN0)).not.toThrow();
                expect(() => N0StateSchema.parse(orchestrationN0)).not.toThrow();
        });

        it('merges partial patches without drifting shared fields', () => {
                const initial = createInitialN0State('initial', session, {
                        ctx: { phase: 'plan', checkpoints: 1 },
                        output: 'pending',
                });
                const patched = mergeN0State(initial, {
                        ctx: {
                                checkpoints: 2,
                                thermal: { status: 'nominal' },
                                delegation: { lane: 'analysis', status: 'active' },
                        },
                        output: 'ready',
                        budget: { tokens: 512, timeMs: 30000, depth: 1 },
                });

                expect(patched.ctx).toEqual({
                        phase: 'plan',
                        checkpoints: 2,
                        thermal: { status: 'nominal' },
                        delegation: { lane: 'analysis', status: 'active' },
                });
                expect(patched.output).toBe('ready');
                expect(sortedKeys(patched.session)).toEqual(sortedKeys(initial.session));
        });
});
