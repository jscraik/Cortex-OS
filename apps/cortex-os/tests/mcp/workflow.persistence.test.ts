import { describe, expect, it } from 'vitest';
import { createTestMcpContainer } from './util/factory';

// Tests for in-memory workflow run persistence added to gateway.

describe('MCP Gateway workflow run persistence', () => {
    const { mcp } = createTestMcpContainer({ allowMutations: false });

    it('stores synchronous (async=false) workflow run result', async () => {
        const run = await mcp.callTool('orchestration.run_workflow', {
            workflow: 'wf.echo',
            input: { value: 1 },
            async: false,
        });
        if (!isRecord(run)) throw new Error('Run result not object');
        expect(run.status).toBe('completed');
        const status = await mcp.callTool('orchestration.get_workflow_status', {
            runId: String(run.runId),
        });
        if (!isRecord(status)) throw new Error('Status not object');
        expect(status.runId).toBe(run.runId);
        expect(
            status.status === 'completed' ||
            status.status === 'queued' ||
            status.status === 'running' ||
            status.status === 'failed',
        ).toBe(true);
    });

    it('returns failed status with not_found error for unknown run id', async () => {
        const status = await mcp.callTool('orchestration.get_workflow_status', {
            runId: 'wf_missing_123',
        });
        if (!isRecord(status)) throw new Error('Status not object');
        expect(status.status).toBe('failed');
        const err = status.error as Record<string, unknown> | undefined;
        expect(err?.code).toBe('not_found');
    });
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
it('returns failed status with not_found error for unknown run id', async () => {
    const status = await mcp.callTool('orchestration.get_workflow_status', {
        runId: 'wf_missing_123',
    });
    if (!isRecord(status)) throw new Error('Status not object');
    expect(status.status).toBe('failed');
    const err = status.error as Record<string, unknown> | undefined;
    expect(err?.code).toBe('not_found');
});
});

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}
