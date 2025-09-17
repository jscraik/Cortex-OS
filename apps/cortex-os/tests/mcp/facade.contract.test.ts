import { describe, expect, it } from 'vitest';
import { type CortexOsToolName, cortexOsMcpTools } from '../../src/mcp/tools';
import { createTestMcpContainer } from './util/factory';

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
            .sort();
        const registry = cortexOsMcpTools.map((t) => t.name).sort();
        expect(listed).toEqual(registry);
    });

    it('system.status returns expected shape subset', async () => {
        const res = await mcp.callTool('system.status', {});
        if (!res || typeof res !== 'object') throw new Error('Result not object');
        const maybeServices = (res as Record<string, unknown>).services;
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
