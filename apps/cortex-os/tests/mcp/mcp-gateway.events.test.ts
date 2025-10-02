import { describe, expect, it, vi } from 'vitest';
import type { MemoriesLike } from '../../src/mcp/gateway.js';
import { createMcpGateway } from '../../src/mcp/gateway.js';

const baseDeps = {
	memories: {} as MemoriesLike,
	orchestration: { config: {} },
	config: { runtime: {} },
};

describe('McpGateway tool lifecycle events', () => {
	it('publishes started and completed events for successful calls', async () => {
		const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
		const gateway = createMcpGateway({
			...baseDeps,
			publishToolEvent: (evt) => {
				events.push(evt);
			},
		});

		await gateway.callTool('system.status', {});

		expect(events.map((evt) => evt.type)).toEqual([
			'cortex.mcp.tool.execution.started',
			'cortex.mcp.tool.execution.completed',
		]);

		const started = events[0]?.payload;
		const completed = events[1]?.payload;

		expect(started?.tool).toBe('system.status');
		expect(completed?.tool).toBe('system.status');
		expect(started?.correlationId).toBe(completed?.correlationId);
		expect(completed?.status).toBe('success');
	});

	it('publishes forbidden completion when security denies tool', async () => {
		const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
		const gateway = createMcpGateway({
			...baseDeps,
			security: {
				allowTool: vi.fn(() => false),
			},
			publishToolEvent: (evt) => {
				events.push(evt);
			},
		});

		const response = await gateway.callTool('system.restart_service', {
			service: 'memories',
			mode: 'graceful',
		});

		expect(response).toHaveProperty('error.code', 'forbidden');
		expect(events.map((evt) => evt.type)).toEqual([
			'cortex.mcp.tool.execution.started',
			'cortex.mcp.tool.execution.completed',
		]);
		expect(events[1]?.payload.status).toBe('forbidden');
	});
});
