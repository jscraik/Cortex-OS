import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { createToolsRouter } from '../../src/lib/server/tools-router';

// Mock MCP server
const mcpServer = {
    listTools: async () => ({ tools: ['ai_generate_text'] }),
    callTool: async () => ({ ok: true }),
    getHealth: async () => ({ status: 'ok' }),
};

let app: express.Express;

beforeAll(() => {
    process.env.API_KEY = 'test';
    app = express();
    app.use(express.json());
    app.use('/mcp/tools', createToolsRouter(mcpServer as unknown as ASBRAIMcpServer));
});

describe('Admin bypass for rate limiting', () => {
    it('should rate limit normal user but allow admin beyond limits', async () => {
        // Hit the tools list limit (60/min) as normal user
        const normal = await Promise.all(
            Array.from({ length: 65 }, () =>
                // Use the configured API key so requests are authorized and subject to rate limiting
                request(app).get('/mcp/tools/list').set('X-API-Key', 'test'),
            ),
        );
        const limited = normal.filter((r) => r.status === 429);
        expect(limited.length).toBeGreaterThan(0);

        // Admin should bypass limits
        const admin = await Promise.all(
            Array.from({ length: 65 }, () =>
                request(app)
                    .get('/mcp/tools/list')
                    // Same API key, but with admin role header to exercise bypass logic
                    .set('X-API-Key', 'test')
                    .set('X-Role', 'admin'),
            ),
        );
        const adminLimited = admin.filter((r) => r.status === 429);
        expect(adminLimited.length).toBe(0);
    }, 20_000);
});
