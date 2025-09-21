import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { createCapabilitiesRouter } from '../../src/lib/server/capabilities-router';
import { createHealthRouter } from '../../src/lib/server/health-router';
import { createToolsRouter } from '../../src/lib/server/tools-router';

// Minimal mock MCP server
const mcpServer = {
	listTools: async () => ({ tools: ['t1', 't2'] }),
	callTool: async () => ({ ok: true }),
	getHealth: async () => ({ status: 'ok' }),
};

// Placeholder tokens
const VALID_API_KEY = 'test-key';

let app: express.Express;
beforeAll(() => {
	process.env.API_KEY = VALID_API_KEY;
	app = express();
	app.use(express.json());
	// Routes under /mcp/tools and /health
	app.use('/mcp/tools', createToolsRouter(mcpServer as unknown as ASBRAIMcpServer));
	app.use('/health', createHealthRouter(mcpServer as unknown as ASBRAIMcpServer));
	app.use('/mcp/capabilities', createCapabilitiesRouter(mcpServer as unknown as ASBRAIMcpServer));
});

describe('API Key Authentication', () => {
	it('should reject requests without API key', async () => {
		const res = await request(app).get('/mcp/tools/list');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('API key required');
	});

	it('should reject invalid API keys', async () => {
		const res = await request(app).get('/mcp/tools/list').set('X-API-Key', 'invalid');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('Invalid API key');
	});

	it('should accept valid API key', async () => {
		const res = await request(app).get('/mcp/tools/list').set('X-API-Key', VALID_API_KEY);
		expect(res.status).toBe(200);
		expect(res.body.tools || res.body).toBeDefined();
	});
});

describe('Bearer token auth (placeholder)', () => {
	it('should accept Bearer token for access (mocked)', async () => {
		// Implemented later when JWT middleware is added; test ensures 200 when auth header present
		const res = await request(app)
			.get('/mcp/tools/list')
			.set('Authorization', 'Bearer mocktoken')
			.set('X-API-Key', VALID_API_KEY);
		expect(res.status).toBe(200);
	});
});

describe('RBAC', () => {
	it('should enforce role permissions', async () => {
		const res = await request(app)
			.post('/mcp/tools/call')
			.set('X-API-Key', VALID_API_KEY)
			.send({ method: 'tools/call', params: { name: 'admin_only_tool' } });
		expect(res.status).toBe(403);
		expect(res.body.error).toBe('Insufficient permissions');
	});

	it('should allow admin access', async () => {
		const res = await request(app)
			.post('/mcp/tools/call')
			.set('X-API-Key', VALID_API_KEY)
			.set('X-Role', 'admin')
			.send({ method: 'tools/call', params: { name: 'admin_only_tool' } });
		expect(res.status).toBe(200);
	});
});
