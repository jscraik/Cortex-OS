import { describe, expect, it } from 'vitest';
import { evaluateResponses } from '../tools/scripts/evaluate-llm-responses.js';

const dataset = [
	{
		prompt: 'Is the sky blue?',
		expected: 'yes',
		response: 'yes',
		latency_ms: 120,
	},
	{
		prompt: 'Are cats mammals?',
		expected: 'yes',
		response: 'yes',
		latency_ms: 150,
	},
	{ prompt: 'Is 2+2=5?', expected: 'no', response: 'no', latency_ms: 110 },
	{
		prompt: 'Is Earth flat?',
		expected: 'no',
		response: 'yes',
		latency_ms: 200,
	},
];

describe('evaluateResponses', () => {
	it('computes metrics and pass status', () => {
		const result = evaluateResponses({ dataset });
		expect(result).toMatchObject({
			accuracy: 0.75,
			recall: 1,
			f1: 0.8,
			latency_ms: 145,
			toxicity_score: 0,
			pass: false,
		});
	});
});
