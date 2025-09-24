import { describe, expect, it } from 'vitest';
import type { CortexOsToolName } from '../../src/mcp/tools.js';
import { TOKENS } from '../../src/tokens.js';
import { createTestMcpContainer } from './util/factory.js';

interface McpFacade {
	listTools(): { name: CortexOsToolName; description: string }[];
	callTool(tool: CortexOsToolName, input: unknown): Promise<unknown>;
	close(): Promise<void> | void;
}

type ErrorEnvelope = {
	error: { code: string; message: string; details?: Record<string, unknown> };
};
function isErrorEnvelope(v: unknown): v is ErrorEnvelope {
	if (!v || typeof v !== 'object') return false;
	if (!('error' in v)) return false;
	const errVal = (v as Record<string, unknown>).error;
	if (!errVal || typeof errVal !== 'object') return false;
	const code = (errVal as Record<string, unknown>).code;
	return typeof code === 'string';
}

// Simple integration verifying DI-provided MCP gateway functions end-to-end.

describe('cortex-os MCP integration (DI)', () => {
	const { container: testContainer } = createTestMcpContainer({
		allowMutations: false,
	});
	const mcp = testContainer.get<McpFacade>(TOKENS.MCPGateway);

	it('lists tool names', () => {
		const tools = mcp.listTools();
		expect(Array.isArray(tools)).toBe(true);
		expect(tools.some((t) => t.name === 'system.status')).toBe(true);
	});

	it('invokes system.status via DI gateway', async () => {
		const result = await mcp.callTool('system.status', {});
		expect(isErrorEnvelope(result)).toBe(false);
		expect(result).toBeTruthy();
	});

	it('denies secure mutation without env flag', async () => {
		const res = await mcp.callTool('config.set', { key: 'X', value: 1 });
		expect(isErrorEnvelope(res)).toBe(true);
		if (isErrorEnvelope(res)) expect(res.error.code).toBe('forbidden');
	});
});
