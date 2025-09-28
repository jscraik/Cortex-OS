import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import {
	agentStateToN0,
	cortexStateToN0,
	workflowStateToN0,
} from '../src/langgraph/n0-adapters.js';
import { createInitialN0State, mergeN0State, type N0Session } from '../src/langgraph/n0-state.js';

describe('n0 state contracts', () => {
	const session: N0Session = {
		id: 'session-123',
		model: 'brAInwav-sonnet',
		user: 'integration-test',
		cwd: '/tmp',
	};

	it('creates and validates initial n0 state', () => {
		const state = createInitialN0State('hello world', session, {
			ctx: { featureFlag: true },
			budget: { tokens: 2048, timeMs: 120000, depth: 1 },
		});

		expect(state.input).toBe('hello world');
		expect(state.session).toEqual(session);
		expect(state.ctx).toEqual({ featureFlag: true });
		expect(state.budget).toEqual({ tokens: 2048, timeMs: 120000, depth: 1 });
	});

	it('merges state patches without losing existing context', () => {
		const base = createInitialN0State('primary', session, {
			ctx: { count: 1 },
			messages: [new HumanMessage('primary message')],
		});

		const merged = mergeN0State(base, {
			ctx: { count: 2, step: 'validation' },
			output: 'complete',
		});

		expect(merged.ctx).toEqual({ count: 2, step: 'validation' });
		expect(merged.messages?.length).toBe(1);
		expect(merged.output).toBe('complete');
	});

	it('maps agent state annotation into n0 state shape', () => {
		const agentState = {
			messages: [new HumanMessage({ content: 'Agent input' })],
			currentAgent: 'analysis',
			taskType: 'code-review',
			result: { content: 'Agent output' },
			error: undefined,
		};

		const n0 = agentStateToN0(agentState, session, {
			budget: { tokens: 1024, timeMs: 60000, depth: 1 },
		});

		expect(n0.input).toBe('Agent input');
		expect(n0.ctx).toMatchObject({ currentAgent: 'analysis', taskType: 'code-review' });
		expect(n0.output).toContain('Agent output');
		expect(n0.budget?.tokens).toBe(1024);
	});

	it('maps cortex agent state into n0 state shape', () => {
		const cortexState = {
			messages: [new HumanMessage('Prompt'), new AIMessage('Draft answer')],
			currentStep: 'drafting',
			context: { filesTouched: 2 },
			tools: [{ name: 'agent.write', description: 'Writes files' }],
			result: { status: 'ok' },
			error: undefined,
		};

		const n0 = cortexStateToN0(cortexState, session);

		expect(n0.input).toBe('Prompt');
		expect(n0.messages?.length).toBe(2);
		expect(n0.ctx).toMatchObject({ currentStep: 'drafting', context: { filesTouched: 2 } });
	});

	it('maps workflow state into n0 state shape', () => {
		const workflowState = {
			messages: [new HumanMessage('workflow prompt')],
			prpState: { phase: 'plan', steps: 3 },
			nextStep: 'execute',
			error: 'none',
		};

		const n0 = workflowStateToN0(workflowState, session);

		expect(n0.input).toBe('workflow prompt');
		expect(n0.ctx).toMatchObject({ prpState: { phase: 'plan', steps: 3 }, nextStep: 'execute' });
	});
});
