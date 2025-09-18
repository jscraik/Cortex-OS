import {
	A2AEventStreamSubscribeInputSchema,
	A2AEventStreamSubscribeResultSchema,
	A2AOutboxSyncInputSchema,
	A2AOutboxSyncResultSchema,
	A2AQueueMessageInputSchema,
	A2AQueueMessageResultSchema,
} from '@cortex-os/contracts/dist/src/index.js';
import { describe, expect, it } from 'vitest';
import { createA2AMcpTools } from '../src/mcp/tools.js';

/**
 * Contract tests for A2A MCP tool schemas ensuring validation round-trips.
 */

describe('a2a mcp contracts', () => {
	it('validates queue message input/result', () => {
		const input = {
			message: { role: 'user', parts: [{ text: 'Hello' }] },
			context: [{ role: 'system', parts: [{ text: 'Ctx' }] }],
		};
		const parsed = A2AQueueMessageInputSchema.parse(input);
		expect(parsed.message.role).toBe('user');

		const result = {
			id: 'task-123',
			status: 'completed',
			message: { role: 'assistant', parts: [{ text: 'Echo: Hello' }] },
		};
		const r = A2AQueueMessageResultSchema.parse(result);
		expect(r.status).toBe('completed');
	});

	it('rejects invalid queue message role', () => {
		expect(() =>
			A2AQueueMessageInputSchema.parse({
				message: { role: 'other', parts: [{ text: 'x' }] },
			}),
		).toThrow();
	});

	it('validates event stream subscribe input/result', () => {
		const input = { includeCurrent: true };
		const parsed = A2AEventStreamSubscribeInputSchema.parse(input);
		expect(parsed.includeCurrent).toBe(true);

		const result = {
			subscriptionId: '123e4567-e89b-12d3-a456-426614174000',
			events: [],
			note: 'snapshot',
		};
		const r = A2AEventStreamSubscribeResultSchema.parse(result);
		expect(r.subscriptionId).toBe(result.subscriptionId);
	});

	it('validates outbox sync input/result', () => {
		const input = { action: 'dlqStats' };
		const parsed = A2AOutboxSyncInputSchema.parse(input);
		expect(parsed.action).toBe('dlqStats');

		const result = {
			action: 'dlqStats',
			dlqStats: { size: 0 },
			timestamp: new Date().toISOString(),
		};
		const r = A2AOutboxSyncResultSchema.parse(result);
		expect(r.dlqStats).toBeDefined();
	});
});

describe('a2a mcp tools runtime smoke', () => {
	const tools = createA2AMcpTools();

	it('exposes expected tool names', () => {
		const names = tools.map((t) => t.name).sort();
		expect(names).toEqual(
			['a2a_event_stream_subscribe', 'a2a_outbox_sync', 'a2a_queue_message'].sort(),
		);
	});

	it('queue message tool handles valid input', async () => {
		const tool = tools.find((t) => t.name === 'a2a_queue_message');
		expect(tool).toBeDefined();
		if (!tool) return;
		const input = {
			message: { role: 'user', parts: [{ text: 'Hi' }] },
		} as unknown as {
			message: { role: 'user'; parts: Array<{ text: string }> };
		};
		const res = await tool.handler(input as never);
		expect(res.content[0].text).toContain('status');
	});

	it('event stream subscribe returns snapshot', async () => {
		const tool = tools.find((t) => t.name === 'a2a_event_stream_subscribe');
		expect(tool).toBeDefined();
		if (!tool) return;
		const res = await tool.handler({ includeCurrent: false } as never);
		expect(res.content[0].text).toContain('subscriptionId');
	});

	it('outbox sync tool returns placeholder metrics', async () => {
		const tool = tools.find((t) => t.name === 'a2a_outbox_sync');
		expect(tool).toBeDefined();
		if (!tool) return;
		const res = await tool.handler({ action: 'dlqStats' } as never);
		expect(res.content[0].text).toContain('dlqStats');
	});
});
