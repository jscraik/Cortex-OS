import { describe, expect, it } from 'vitest';
import { createOpenAIAgentsAdapter } from '../../src/agents/openai-agents-js-adapter.js';

describe('openai-agents-js-adapter', () => {
	it('chat forwards to client and returns response', async () => {
		const client = {
			async chat() {
				return { content: 'ok' };
			},
		};
		const adapter = createOpenAIAgentsAdapter({ client });
		const res = await adapter.chat({ messages: [{ role: 'user', content: 'hi' }] });
		expect(res.content).toBe('ok');
	});

	it('errors are branded and thrown', async () => {
		const client = {
			async chat() {
				throw new Error('boom');
			},
		};
		const adapter = createOpenAIAgentsAdapter({ client });
		await expect(adapter.chat({ messages: [{ role: 'user', content: 'x' }] })).rejects.toThrow(
			/brAInwav Cortex-OS/,
		);
	});
});
