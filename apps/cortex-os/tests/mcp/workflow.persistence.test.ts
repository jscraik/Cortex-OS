import { describe, expect, it } from 'vitest';
import { createTestMcpContainer } from './util/factory.js';

const { mcp } = createTestMcpContainer({ allowMutations: false });

describe('MCP workflow persistence', () => {
	it('stores synchronous workflow results', async () => {
		const runEnvelope = await mcp.callTool('orchestration.run_workflow', {
			workflow: 'wf.echo',
			input: { foo: 'bar' },
			async: false,
		});

		if (!isRecord(runEnvelope)) throw new Error('Run result not object');
		expect(runEnvelope.tool).toBe('orchestration.run_workflow');
		const runData = runEnvelope.data as Record<string, unknown> | undefined;
		expect(runData?.status).toBe('completed');
		const runId = String(runData?.runId ?? '');
		expect(runId).not.toHaveLength(0);

		const statusEnvelope = await mcp.callTool('orchestration.get_workflow_status', {
			runId,
		});
		if (!isRecord(statusEnvelope)) throw new Error('Status result not object');
		const statusData = statusEnvelope.data as Record<string, unknown> | undefined;
		expect(statusData?.runId).toBe(runId);
		expect(statusData?.status).toBeTruthy();
	});

	it('returns not_found error for missing workflow run', async () => {
		const statusEnvelope = await mcp.callTool('orchestration.get_workflow_status', {
			runId: 'missing-run-id',
		});
		if (!isRecord(statusEnvelope)) throw new Error('Status result not object');
		const statusData = statusEnvelope.data as Record<string, unknown> | undefined;
		expect(statusData?.status).toBe('failed');
		const err = statusData?.error as Record<string, unknown> | undefined;
		expect(err?.code).toBe('not_found');
	});
});

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}
