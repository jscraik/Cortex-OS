import { describe, expect, it } from 'vitest';
import { parseAnthropicToolResponse } from '../../src/lib/anthropic-contract.js';

const buildBetaPayload = () => ({
	id: 'msg_01',
	role: 'assistant',
	content: [
		{
			type: 'tool_use' as const,
			id: 'toolu_01',
			name: 'planner.vendor_weight',
			input: { seed: 17, maxTokens: 512 },
			response: {
				output_text: 'Plan weighting computed via claude-3.5-sonnet.',
			},
		},
	],
	response: {
		output_text: 'Plan weighting computed via claude-3.5-sonnet.',
	},
});

describe('@anthropic-ai/sdk 0.69 contract', () => {
	it('extracts tool call payload with response.output_text envelope', () => {
		const payload = buildBetaPayload();
		const snapshot = parseAnthropicToolResponse(payload);

		expect(snapshot.messageOutputText).toBe('Plan weighting computed via claude-3.5-sonnet.');
		expect(snapshot.toolCalls).toEqual([
			{
				id: 'toolu_01',
				name: 'planner.vendor_weight',
				input: { seed: 17, maxTokens: 512 },
				outputText: 'Plan weighting computed via claude-3.5-sonnet.',
			},
		]);
	});

	it('throws a branded error when response.output_text is missing', () => {
		const payload = buildBetaPayload();
		payload.content = [
			{
				type: 'tool_use' as const,
				id: 'toolu_missing',
				name: 'planner.vendor_weight',
				input: { seed: 17, maxTokens: 512 },
			},
		];

		expect(() => parseAnthropicToolResponse(payload)).toThrowError(
			'brAInwav Anthropic contract violation: response.output_text must be provided for tool_use blocks',
		);
	});

	it('rejects non-positive seeds to preserve deterministic execution guarantees', () => {
		const payload = buildBetaPayload();
		payload.content[0] = {
			type: 'tool_use',
			id: 'toolu_seed',
			name: 'planner.vendor_weight',
			input: { seed: 0 },
			response: { output_text: 'noop' },
		};

		expect(() => parseAnthropicToolResponse(payload)).toThrowError(
			/brAInwav Anthropic contract violation: input\.seed must be a positive integer/,
		);
	});
});
