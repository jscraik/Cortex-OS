import type express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { createApp } from '../../src/lib/server/app';

const mcpServer = {
	listTools: async () => ({ tools: [] }),
	callTool: async () => ({ ok: true }),
	getHealth: async () => ({ status: 'ok' }),
};

let app: express.Express;

beforeAll(() => {
	delete process.env.PRP_REDIS_URL;
	delete process.env.REDIS_URL;
	process.env.API_KEY = 'test';
	process.env.METRICS_KEY = 'metrics';
	app = createApp(mcpServer as unknown as ASBRAIMcpServer);
});

describe('Redis health endpoint', () => {
	it('should report disabled when no Redis configured', async () => {
		const res = await request(app).get('/health/redis').set('X-API-Key', 'test');
		expect(res.status).toBe(200);
		expect(res.body.redis).toBe('disabled');
	});
});
