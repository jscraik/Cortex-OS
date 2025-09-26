import { HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { projectKernelWorkflowToN0 } from '../src/kernel.js';
import { createInitialPRPState } from '../src/state.js';

describe('projectKernelWorkflowToN0', () => {
	it('projects workflow state into shared n0 shape', () => {
		const prpState = createInitialPRPState(
			{
				title: 'Demo Blueprint',
				description: 'Validates projection of kernel state',
				requirements: ['collect-evidence'],
			},
			{ deterministic: true },
		);

		const workflowState = {
			messages: [new HumanMessage('Run PRP workflow')],
			prpState,
			nextStep: 'build',
			error: '',
		};

		const session = {
			id: 'kernel-session',
			model: 'brAInwav-sonnet',
			user: 'unit-test',
			cwd: '/workspace/kernel',
		};

		const n0 = projectKernelWorkflowToN0(workflowState, session, {
			budget: { tokens: 4096, timeMs: 180000, depth: 1 },
		});

		expect(n0.input).toBe('Run PRP workflow');
		expect(n0.session).toEqual(session);
		expect(n0.ctx).toMatchObject({
			prpState: expect.objectContaining({ phase: 'strategy' }),
			nextStep: 'build',
	});
		expect(n0.budget).toEqual({ tokens: 4096, timeMs: 180000, depth: 1 });
	});
});
