import { describe, expect, it } from 'vitest';
import { createTestMcpContainer } from './util/factory';

const { mcp } = createTestMcpContainer({ allowMutations: false });

describe('MCP workflow persistence', () => {
	it('stores synchronous workflow results', async () => {
		const runResult = await mcp.callTool('orchestration.run_workflow', {
			workflow: 'wf.echo',
			input: { foo: 'bar' },
			async: false,
		});

		if (!isRecord(runResult)) throw new Error('Run result not object');
		expect(runResult.status).toBe('completed');

		const statusResult = await mcp.callTool('orchestration.get_workflow_status', {
			runId: String(runResult.runId),
		});
		if (!isRecord(statusResult)) throw new Error('Status result not object');
		expect(statusResult.runId).toBe(runResult.runId);
		expect(statusResult.status).toBeTruthy();
	});

	it('returns not_found error for missing workflow run', async () => {
		const statusResult = await mcp.callTool('orchestration.get_workflow_status', {
			runId: 'missing-run-id',
		});
		if (!isRecord(statusResult)) throw new Error('Status result not object');
		expect(statusResult.status).toBe('failed');
		const err = statusResult.error as Record<string, unknown> | undefined;
		expect(err?.code).toBe('not_found');
	});
});

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}
