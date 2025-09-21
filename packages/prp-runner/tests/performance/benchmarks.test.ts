import type express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { createApp } from '../../src/lib/server/app';

// Minimal mock MCP server
const mcpServer = {
    listTools: async () => ({ tools: ['ai_generate_text', 'ai_rag_query'] }),
    callTool: async (_body: { method: string; params: { name: string } }) => ({ ok: true }),
    getHealth: async () => ({ status: 'ok' }),
};

let app: express.Express;

beforeAll(() => {
    process.env.API_KEY = 'test';
    process.env.METRICS_KEY = 'metrics';
    app = createApp(mcpServer as unknown as ASBRAIMcpServer, { jsonLimit: '100kb' });
});

function p95(values: number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
}

describe('Performance Benchmarks', () => {
    it('should handle 100 concurrent health requests under 5s', async () => {
        const start = Date.now();
        await Promise.all(
            Array.from({ length: 100 }, () => request(app).get('/health').set('X-API-Key', 'test')),
        );
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000);
    });

    it('should maintain P95 latency < 100ms for /health', async () => {
        const latencies: number[] = [];
        for (let i = 0; i < 200; i++) {
            const t0 = Date.now();
            await request(app).get('/health').set('X-API-Key', 'test');
            latencies.push(Date.now() - t0);
        }
        expect(p95(latencies)).toBeLessThan(100);
    }, 30_000);
});
