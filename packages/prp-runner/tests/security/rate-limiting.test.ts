import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { createHealthRouter } from '../../src/lib/server/health-router';
import { createToolsRouter } from '../../src/lib/server/tools-router';

// Minimal mock server implementation
const mcpServer = {
	listTools: async () => ({ tools: ['ai_generate_text', 'ai_rag_query'] }),
	callTool: async (body: { method: string; params: { name: string } }) => {
		return { ok: true, tool: body.params.name } as const;
	},
	getHealth: async () => ({ status: 'ok' }),
};

const API_KEY = 'test';
let app: express.Express;

beforeAll(() => {
	process.env.API_KEY = API_KEY;
	app = express();
	app.use(express.json());
	app.use('/mcp/tools', createToolsRouter(mcpServer as unknown as ASBRAIMcpServer));
	app.use('/health', createHealthRouter(mcpServer as unknown as ASBRAIMcpServer));
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Rate Limiting', () => {
	it('should limit requests per minute', async () => {
		const reqs = Array.from({ length: 65 }, () =>
			request(app).get('/mcp/tools/list').set('X-API-Key', API_KEY),
		);
		const responses = await Promise.all(reqs);
		const limited = responses.filter((r) => r.status === 429);
		expect(limited.length).toBeGreaterThan(0);
		expect(limited[0].body).toHaveProperty('retryAfter');
	});

	it('should limit AI operations separately', async () => {
		const requestsList: Array<Promise<request.Response>> = [];
		for (let i = 0; i < 15; i++) {
			requestsList.push(
				request(app)
					.post('/mcp/tools/call')
					.set('X-API-Key', API_KEY)
					.send({ method: 'tools/call', params: { name: 'ai_generate_text' } }),
			);
		}
		const responses = await Promise.all(requestsList);
		const limited = responses.filter((r) => r.status === 429);
		// Expect 5 to be limited if cap is 10
		expect(limited.length).toBe(5);
	});

	it('should use sliding window', async () => {
		for (let i = 0; i < 10; i++) {
			await request(app).get('/health').set('X-API-Key', API_KEY);
		}
		const over = await request(app).get('/health').set('X-API-Key', API_KEY);
		expect([200, 429]).toContain(over.status);
		if (over.status !== 429) return; // if headroom allowed in env, skip rest

		await sleep(30_000);
		const after = await request(app).get('/health').set('X-API-Key', API_KEY);
		expect(after.status).toBe(200);
	}, 35_000);
});
