import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { applyServerHardening } from '../../src/lib/server/hardening';
import { createHealthRouter } from '../../src/lib/server/health-router';
import { createToolsRouter } from '../../src/lib/server/tools-router';
import { applyMetrics } from '../../src/monitoring/metrics';
import { applyLogging } from '../../src/observability/logging';

const mcpServer: Partial<ASBRAIMcpServer> = {
	listTools: (async () => ({
		tools: [
			{
				name: 'ai_generate_text',
				description: 'mock',
				inputSchema: { type: 'object', properties: {}, required: [] },
			},
		],
	})) as ASBRAIMcpServer['listTools'],
	callTool: async (_body: unknown) =>
		({ isError: false, content: [{ type: 'text', text: 'ok' }] }) as unknown as ReturnType<
			ASBRAIMcpServer['callTool']
		>,
	getHealth: async () => ({ status: 'healthy', tools: 1, features: ['mcp-tools-only'] }),
};

let app: express.Express;

beforeAll(() => {
	process.env.METRICS_KEY = 'metrics-secret';
	process.env.API_KEY = 'test';
});

beforeEach(() => {
	app = express();
	applyServerHardening(app);
	applyLogging(app);
	const { ai } = applyMetrics(app, { metricsKeyEnv: 'METRICS_KEY' });
	app.use('/health', createHealthRouter(mcpServer as ASBRAIMcpServer));
	app.use('/mcp/tools', createToolsRouter(mcpServer as ASBRAIMcpServer, ai));
});

describe('Observability / Metrics', () => {
	it('protects /metrics with API key and exposes Prometheus format', async () => {
		const unauthorized = await request(app).get('/metrics');
		expect(unauthorized.status).toBe(401);

		const res = await request(app).get('/metrics').set('X-API-Key', 'metrics-secret');
		expect(res.status).toBe(200);
		expect(res.text).toContain('# HELP');
		expect(res.text).toContain('# TYPE');
		expect(res.text).toContain('http_requests_total');
	});

	it('tracks request counters and durations for HTTP requests', async () => {
		await request(app).get('/health');
		const res = await request(app).get('/metrics').set('X-API-Key', 'metrics-secret');
		expect(res.text).toContain('http_requests_total');
		expect(res.text).toContain('http_request_duration_seconds');
		// Labeled series include path and status
		expect(res.text).toMatch(/http_requests_total\{[^}]*path="\/health"[^}]*status="200"[^}]*}/);
	});

	it('tracks AI operation counters and durations for ai_* tool calls', async () => {
		await request(app)
			.post('/mcp/tools/call')
			.set('X-API-Key', 'test')
			.send({ method: 'tools/call', params: { name: 'ai_generate_text' } });
		const res = await request(app).get('/metrics').set('X-API-Key', 'metrics-secret');
		expect(res.text).toContain('ai_operations_total');
		expect(res.text).toContain('ai_operation_duration_seconds');
		// Tool label exposed
		expect(res.text).toMatch(/ai_operations_total\{[^}]*tool="ai_generate_text"[^}]*}/);
	});

	it('exposes basic process metrics (uptime, memory)', async () => {
		const res = await request(app).get('/metrics').set('X-API-Key', 'metrics-secret');
		expect(res.text).toContain('process_uptime_seconds');
		expect(res.text).toContain('process_resident_memory_bytes');
		expect(res.text).toContain('process_heap_used_bytes');
	});
});
