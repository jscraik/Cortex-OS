import { describe, expect, it } from 'vitest';
import { type CortexOsToolName, cortexOsMcpTools } from '../../src/mcp/tools.js';
import { createTestMcpContainer } from './util/factory.js';

// Contract test: ensures facade tools list matches tool registry and selected calls conform.

describe('MCP Facade Contract', () => {
	const { mcp, published } = createTestMcpContainer({
		allowMutations: false,
		capturePublished: true,
	});

	it('exposes all registered tool names', () => {
		const listed = mcp
			.listTools()
			.map((t: { name: CortexOsToolName; description: string }) => t.name)
			.sort((a, b) => a.localeCompare(b));
		const registry = cortexOsMcpTools.map((t) => t.name).sort((a, b) => a.localeCompare(b));
		expect(listed).toEqual(registry);
	});

	it('system.status returns expected envelope shape subset', async () => {
		const res = await mcp.callTool('system.status', {});
		if (!res || typeof res !== 'object') throw new Error('Result not object');
		const envelope = res as {
			tool?: string;
			content?: Array<{ type: string; text?: string }>;
			metadata?: Record<string, unknown>;
			data?: { services?: unknown[] };
		};
		expect(envelope.tool).toBe('system.status');
		const metadata = envelope.metadata as Record<string, unknown> | undefined;
		expect(metadata?.['brand']).toBe('brAInwav');
		expect(typeof metadata?.['correlationId']).toBe('string');
		const firstContent = envelope.content?.[0];
		expect(firstContent?.type).toBe('text');
		expect(firstContent?.text).toContain('brAInwav MCP');
		const maybeServices = envelope.data?.services;
		expect(Array.isArray(maybeServices)).toBe(true);
	});

	it('secure tool denied without mutation flag', async () => {
		const res = await mcp.callTool('config.set', { key: 'X', value: 1 });
		expect(res && typeof res === 'object' && 'error' in res).toBe(true);
	});

	it('publishes audit events for tool calls when capture enabled', async () => {
		await mcp.callTool('system.status', {});
		expect(published.length).toBeGreaterThan(0);
		const auditEvt = published.find((p) => p.type === 'mcp.tool.audit.v1');
		expect(auditEvt).toBeDefined();
		if (auditEvt) {
			expect(auditEvt.payload.tool).toBe('system.status');
			expect(typeof auditEvt.payload.durationMs).toBe('number');
		}
	});
});
