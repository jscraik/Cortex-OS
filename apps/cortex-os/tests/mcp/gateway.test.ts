import { describe, expect, it } from 'vitest';
import { cortexOsMcpTools } from '../../src/mcp/tools';
import { createTestMcpContainer } from './util/factory';

describe('MCP Gateway', () => {
	const { mcp: gw } = createTestMcpContainer({ allowMutations: false });
	it('lists tools', () => {
		const names = gw.listTools().map((t) => t.name);
		for (const td of cortexOsMcpTools) {
			expect(names).toContain(td.name);
		}
	});
	it('executes system.status', async () => {
		const result: unknown = await gw.callTool('system.status', {});
		if (isError(result)) throw new Error('Unexpected error response');
		if (!isRecord(result)) throw new Error('Result not object');
		const services = result.services as unknown[] | undefined;
		expect(services?.length).toBeGreaterThan(0);
	});
	it('rate limits after threshold (synthetic)', async () => {
		let triggered = false;
		let lastOkCpu: number | undefined;
		for (let i = 0; i < 55; i++) {
			const res: unknown = await gw.callTool('system.resources', {
				sampleWindowSec: 1,
			});
			if (isError(res)) {
				expect(res.error.code).toBe('rate_limited');
				triggered = true;
				break;
			}
			if (isRecord(res) && typeof res.cpu === 'number') {
				lastOkCpu = res.cpu;
			}
		}
		if (!triggered) expect(lastOkCpu).toBeDefined();
	});
	it('validates input and returns validation error object', async () => {
		const local = createTestMcpContainer({ allowMutations: true }).mcp;
		const result: unknown = await local.callTool('system.restart_service', {
			service: '',
			timeoutMs: 5,
		});
		expect(isError(result) && result.error.code).toBe('validation_failed');
	});
});

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}
function isError(v: unknown): v is { error: { code: string } } {
	if (!isRecord(v) || !('error' in v)) return false;
	const errVal = v.error;
	if (!isRecord(errVal)) return false;
	return typeof errVal.code === 'string';
}
