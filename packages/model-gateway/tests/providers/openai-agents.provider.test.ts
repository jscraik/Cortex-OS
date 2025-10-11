/**
 * brAInwav Cortex-OS: Tests for OpenAI Agents Provider
 * No network calls; uses fakes per TDD plan
 */

import type { AgentResponse, OpenAIAgentsClientLike } from '@openai/apps-sdk';
import { describe, expect, it, vi } from 'vitest';
import { createOpenAIAgentsProvider } from '../../src/providers/openai-agents.provider.js';

describe('openai-agents.provider', () => {
	const createFakeClient = (
		response?: AgentResponse,
		shouldFail = false,
	): OpenAIAgentsClientLike => {
		return {
			async chat() {
				if (shouldFail) {
					throw new Error('fake client error');
				}
				return response ?? { content: 'brAInwav response' };
			},
		};
	};

	it('chat forwards request and returns response with brAInwav branding', async () => {
		const client = createFakeClient({ content: 'test response', toolCalls: [] });
		const logger = {
			info: vi.fn(),
			error: vi.fn(),
		};

		const provider = createOpenAIAgentsProvider({ client, logger, modelName: 'test-model' });

		const result = await provider.chat({
			messages: [{ role: 'user', content: 'hello' }],
		});

		expect(result.content).toBe('test response');
		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining('brAInwav Cortex-OS'),
			expect.objectContaining({ brand: 'brAInwav' }),
		);
	});

	it('chat handles tools parameter', async () => {
		const client = createFakeClient({ content: 'tool response' });
		const provider = createOpenAIAgentsProvider({ client });

		const result = await provider.chat({
			messages: [{ role: 'user', content: 'test' }],
			tools: [{ name: 'get_weather', description: 'Get weather' }],
		});

		expect(result.content).toBe('tool response');
	});

	it('chat respects abort signal', async () => {
		const controller = new AbortController();
		const client: OpenAIAgentsClientLike = {
			async chat({ abortSignal }) {
				if (abortSignal?.aborted) {
					throw new Error('aborted');
				}
				return { content: 'ok' };
			},
		};

		const provider = createOpenAIAgentsProvider({ client });

		controller.abort();

		await expect(
			provider.chat({
				messages: [{ role: 'user', content: 'test' }],
				abortSignal: controller.signal,
			}),
		).rejects.toThrow('aborted');
	});

	it('chat logs errors with brAInwav branding', async () => {
		const client = createFakeClient(undefined, true);
		const logger = {
			info: vi.fn(),
			error: vi.fn(),
		};

		const provider = createOpenAIAgentsProvider({ client, logger });

		await expect(
			provider.chat({
				messages: [{ role: 'user', content: 'test' }],
			}),
		).rejects.toThrow('fake client error');

		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining('brAInwav Cortex-OS'),
			expect.objectContaining({ brand: 'brAInwav' }),
		);
	});

	it('health returns brAInwav-branded status', async () => {
		const client = createFakeClient();
		const provider = createOpenAIAgentsProvider({ client, modelName: 'test-model' });

		const health = await provider.health();

		expect(health).toEqual({
			status: 'operational',
			brand: 'brAInwav',
			model: 'test-model',
		});
	});

	it('provider includes brAInwav brand property', () => {
		const client = createFakeClient();
		const provider = createOpenAIAgentsProvider({ client });

		expect(provider.brand).toBe('brAInwav');
	});
});
