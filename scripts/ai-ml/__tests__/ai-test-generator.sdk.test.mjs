import { describe, expect, it, vi } from 'vitest';
import {
	buildPrompt,
	DEFAULT_MODEL,
	extractAnthropicText,
	generateWithAnthropic,
} from '../ai-test-generator.mjs';

describe('extractAnthropicText', () => {
	it('reads tool_use response.output_text from beta schema', () => {
		const payload = {
			content: [
				{
					type: 'tool_use',
					id: 'toolu_parse',
					name: 'generate-tests',
					input: {},
					response: { output_text: 'describe("suite", () => {});' },
				},
			],
		};
		expect(extractAnthropicText(payload)).toBe('describe("suite", () => {});');
	});

	it('throws branded error when no textual response is present', () => {
		expect(() =>
			extractAnthropicText({ content: [{ type: 'tool_use', id: 't', name: 'n', input: {} }] }),
		).toThrow(/brAInwav Anthropic SDK response missing output text/);
	});
});

describe('generateWithAnthropic', () => {
	it('invokes the Anthropic client and unwraps nested output text', async () => {
		const client = {
			messages: {
				create: vi.fn(async () => ({
					content: [
						{
							type: 'tool_use',
							id: 'toolu_beta',
							name: 'generate-tests',
							input: { seed: 17 },
							response: { output_text: 'export const generated = true;' },
						},
					],
				})),
			},
		};
		const source = 'export const answer = 42;';
		const output = await generateWithAnthropic({
			source,
			client,
			maxTokens: 256,
			model: DEFAULT_MODEL,
		});

		expect(client.messages.create).toHaveBeenCalledWith({
			model: DEFAULT_MODEL,
			max_tokens: 256,
			messages: [{ role: 'user', content: buildPrompt(source) }],
		});
		expect(output).toBe('export const generated = true;');
	});
});
