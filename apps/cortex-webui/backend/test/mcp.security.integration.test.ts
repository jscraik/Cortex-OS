import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { CapabilityTokenIssuer } from '@cortex-os/security';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../src/monitoring/services/healthService.ts', () => {
	return {
		HealthService: {
			getInstance: () => ({
				performHealthCheck: async () => ({
					status: 'healthy',
					checks: {},
					timestamp: new Date().toISOString(),
					uptime: 0,
					version: 'test',
				}),
				checkReadiness: async () => ({
					status: 'ready',
					checks: {},
					timestamp: new Date().toISOString(),
				}),
				checkLiveness: async () => ({
					status: 'alive',
					timestamp: new Date().toISOString(),
					uptime: 0,
				}),
			}),
		},
	};
});

vi.mock('../src/monitoring/services/metricsService.ts', () => {
	class MockMetricsService {
		static instance = new MockMetricsService();

		static getInstance() {
			return MockMetricsService.instance;
		}

		getMetrics() {
			return '# HELP test_metric counter\n# TYPE test_metric counter\ntest_metric 1';
		}

		incrementCounter() {}
		recordHttpRequestMetric() {}
		recordDatabaseMetric() {}
		recordCustomMetric() {}
		reset() {}
	}

	return {
		MetricsService: MockMetricsService,
	};
});

vi.mock('../src/monitoring/services/advancedMetricsService.ts', () => {
	const mockInstance = {
		recordHttpRequest: vi.fn(),
		recordDatabaseEvent: vi.fn(),
		recordCacheEvent: vi.fn(),
		getMetrics: () => '# HELP test_metric counter',
		reset: vi.fn(),
		close: vi.fn(),
	};

	return {
		AdvancedMetricsService: {
			getInstance: () => mockInstance,
		},
		advancedMetricsService: mockInstance,
		cortexWebuiSLOs: [],
		cortexWebuiAlerts: [],
	};
});

vi.mock('../src/services/a2a-integration.ts', () => {
	return {
		WebUIEventTypes: {},
		a2aBus: {
			publish: vi.fn(),
		},
	};
});

vi.mock('../src/db/index.ts', () => {
	return {
		initializeDatabase: vi.fn().mockResolvedValue(undefined),
		initializeDatabaseAsync: vi.fn().mockResolvedValue(undefined),
		db: {
			exec: vi.fn().mockResolvedValue(undefined),
			run: vi.fn().mockResolvedValue({ lastID: 0, changes: 0 }),
			all: vi.fn().mockResolvedValue([]),
			get: vi.fn().mockResolvedValue(null),
		},
		drizzleDb: {},
		sqlite: {},
	};
});

vi.mock('better-auth', () => {
	return {
		betterAuth: () => ({
			createRouter: () => ({ handler: vi.fn() }),
			createMiddleware: () => (_req: any, _res: any, next: any) => next(),
			createCLI: () => ({}),
		}),
	};
});

vi.mock('better-auth/plugins', () => {
	const noop = () => ({
		handle: vi.fn(),
	});
	return {
		bearer: noop,
		magicLink: noop,
		organization: noop,
		twoFactor: noop,
		oauth2: noop,
		passkey: noop,
	};
});

vi.mock('../src/services/pdfWithImagesService.ts', () => ({
	processPdfWithImages: vi.fn().mockResolvedValue({ pages: 1 }),
}));

vi.mock('../src/monitoring/metricsRoutes.ts', () => {
	const { Router } = require('express') as typeof import('express');
	const router = Router();
	router.get('/', (_req: import('express').Request, res: import('express').Response) => {
		res.status(200).json({ status: 'ok' });
	});
	router.get('/metrics', (_req: import('express').Request, res: import('express').Response) => {
		res.type('text/plain').send('# HELP test_metric\n# TYPE test_metric counter');
	});
	return { default: router };
});

const TEST_TENANT = 'integration-tenant';
const TEST_CAPABILITY_SECRET = 'integration-cap-secret';
const TEST_BUDGET_PROFILE = 'integration-budget';

function createTestTool() {
	const id = randomUUID();
	return {
		metadata: {
			id,
			name: `integration-tool-${id.slice(0, 8)}`,
			version: '1.0.0',
			description: 'Integration test tool',
			category: 'test',
			tags: ['test'],
			author: 'integration',
			transport: 'stdio',
			serverName: 'integration-server',
			status: 'active' as const,
			registeredAt: new Date().toISOString(),
			usageCount: 0,
			permissions: [],
		},
		schema: {
			name: 'integration-schema',
			description: 'Integration schema',
			inputSchema: z.object({ input: z.string() }),
			outputSchema: z.object({ output: z.string() }),
		},
		handler: async () => ({ output: 'ok' }),
	};
}

describe('MCP HTTP security integration', () => {
	let app: import('express').Express;
	let testBudgetDir: string;
	let budgetFilePath: string;
	let capabilityIssuer: CapabilityTokenIssuer;
	let toolRegistry: any;
	let toolId: string;
	let toolName: string;

	beforeEach(async () => {
		testBudgetDir = mkdtempSync(path.join(tmpdir(), 'mcp-http-security-'));
		budgetFilePath = path.join(testBudgetDir, 'budget.yml');
		writeFileSync(
			budgetFilePath,
			`budgets:\n  ${TEST_BUDGET_PROFILE}:\n    max_total_req: 1\n`,
		);

		process.env.MCP_CAPABILITY_SECRET = TEST_CAPABILITY_SECRET;
		process.env.MCP_BUDGET_FILE = budgetFilePath;
		process.env.MCP_BUDGET_PROFILE = TEST_BUDGET_PROFILE;

		vi.resetModules();

		const expressModule = await import('express');
		const expressApp = expressModule.default;
		const expressJson = expressModule.json;
		const { executeTool, __testHooks } = await import('../src/controllers/mcpController');
		app = expressApp();
		app.use(expressJson());
		app.post('/api/v1/mcp/tools/:id/execute', executeTool);
		toolRegistry = __testHooks.toolRegistry;

		const tool = createTestTool();
		await toolRegistry.registerTool(tool);
		toolId = tool.metadata.id;
		toolName = tool.metadata.name;

		capabilityIssuer = new CapabilityTokenIssuer(TEST_CAPABILITY_SECRET);
	});

	afterEach(async () => {
		vi.useRealTimers();
		try {
			await toolRegistry.unregisterTool(toolId);
		} catch {
			// ignore
		}
		rmSync(testBudgetDir, { recursive: true, force: true });
		delete process.env.MCP_CAPABILITY_SECRET;
		delete process.env.MCP_BUDGET_FILE;
		delete process.env.MCP_BUDGET_PROFILE;
	});

	function issueToken(ttlSeconds = 300) {
		return capabilityIssuer.issue({
			tenant: TEST_TENANT,
			action: `tool.execute.${toolName}`,
			resourcePrefix: `mcp/tools/${toolId}`,
			budgetProfile: TEST_BUDGET_PROFILE,
			ttlSeconds,
		}).token;
	}

	it('rejects missing capability token', async () => {
		const res = await request(app)
			.post(`/api/v1/mcp/tools/${toolId}/execute`)
			.send({ toolId, params: { input: 'hello' } });

		expect(res.status).toBe(403);
		expect(res.body.error.code).toBe('CAPABILITY_DENIED');
	});

	it('rejects expired capability token', async () => {
		vi.useFakeTimers();
		const base = new Date('2025-01-01T00:00:00Z');
		vi.setSystemTime(base);
		const token = issueToken(1);
		vi.setSystemTime(new Date(base.getTime() + 120_000));

		const res = await request(app)
			.post(`/api/v1/mcp/tools/${toolId}/execute`)
			.set('x-brainwav-tenant', TEST_TENANT)
			.set('x-brainwav-capability', token)
			.set('x-brainwav-budget-profile', TEST_BUDGET_PROFILE)
			.send({ toolId, params: { input: 'hello' } });

		expect(res.status).toBe(403);
		expect(res.body.error.code).toBe('CAPABILITY_DENIED');
	});

	it('rejects requests that exceed budget limits', async () => {
		const token = issueToken();
		const execute = () =>
			request(app)
				.post(`/api/v1/mcp/tools/${toolId}/execute`)
				.set('x-brainwav-tenant', TEST_TENANT)
				.set('x-brainwav-capability', token)
				.set('x-brainwav-budget-profile', TEST_BUDGET_PROFILE)
				.send({ toolId, params: { input: 'hello' } });

		await execute().expect(200);
		const res = await execute();
		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe('BUDGET_EXCEEDED');
	});

	it('allows execution with valid capability token', async () => {
		const res = await request(app)
			.post(`/api/v1/mcp/tools/${toolId}/execute`)
			.set('x-brainwav-tenant', TEST_TENANT)
			.set('x-brainwav-capability', issueToken())
			.set('x-brainwav-budget-profile', TEST_BUDGET_PROFILE)
			.send({ toolId, params: { input: 'hello' } });

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
	});
});
