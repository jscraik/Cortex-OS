import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoriesHealthApp } from '../src/api/health.js';
import { createStoreForKind } from '../src/config/store-from-env.js';
import type { Memory } from '../src/domain/types.js';
import type { SystemHealth } from '../src/monitoring/health.js';
import { createStoreInspector } from '../src/monitoring/store-inspector.js';
import {
	type HarnessResult,
	setupLocalHarness,
	setupPrismaHarness,
} from './test-utils/store-harness.js';

const BASE_MEMORY: Memory = {
	id: 'stats-alpha',
	kind: 'note',
	text: 'Stats baseline memory',
	tags: ['stats'],
	vector: [0.2, 0.8, 0.4, 0.6],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	provenance: { source: 'system' },
};

const healthySubsystem = {
	healthy: true,
	latency: 5,
	timestamp: new Date().toISOString(),
};

const healthMonitorSnapshot: SystemHealth = {
	isHealthy: true,
	mlx: healthySubsystem,
	ollama: healthySubsystem,
	database: healthySubsystem,
	timestamp: new Date().toISOString(),
	uptime: 1000,
};

const loggerStub = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
};

type StatsHarness = {
	label: string;
	expected: string;
	setup: () => Promise<HarnessResult>;
};

const matrix: StatsHarness[] = [
	{
		label: 'SQLite backend',
		expected: 'sqlite',
		setup: async () => setupSqliteHarness(),
	},
	{
		label: 'Prisma backend',
		expected: 'prisma',
		setup: async () => setupPrismaHarness(BASE_MEMORY),
	},
	{
		label: 'Local backend',
		expected: 'local',
		setup: async () => setupLocalHarness(BASE_MEMORY),
	},
];

describe.each(matrix)('memories stats for $label', ({ expected, setup }) => {
	let harness: HarnessResult;
	let server: Server | undefined;

	beforeEach(async () => {
		harness = await setup();
	});

	afterEach(async () => {
		await shutdownServer(server);
		harness.teardown();
		vi.restoreAllMocks();
	});

	it('returns brAInwav-branded backend metadata', async () => {
		const inspector = createStoreInspector({
			brand: 'brAInwav',
			primary: { label: expected, store: harness.store },
		});

		const app = createMemoriesHealthApp({
			healthMonitor: { checkAll: async () => healthMonitorSnapshot },
			inspector,
			logger: loggerStub,
		});

		server = await startServer(app);
		const url = buildUrl(server, '/memories/stats');
		const response = await fetch(url);

		expect(response.status).toBe(200);
		const payload = (await response.json()) as Record<string, any>;

		expect(payload.brand).toBe('brAInwav');
		expect(payload.backend.active).toBe(expected);
		expect(typeof payload.backend.status).toBe('string');
		expect(payload.backend.metrics?.[expected]).toBeDefined();
		expect(payload.health?.overall).toBe('healthy');
		expect(Array.isArray(payload.backend.adapters)).toBe(true);
	});
});

async function setupSqliteHarness(): Promise<HarnessResult> {
	process.env.MEMORIES_EXTERNAL_STORAGE_ENABLED = 'false';
	const store = await createStoreForKind('sqlite');
	return {
		store,
		teardown: () => undefined,
	};
}

async function startServer(app: ReturnType<typeof createMemoriesHealthApp>) {
	return new Promise<Server>((resolve) => {
		const instance = app.listen(0, () => resolve(instance));
	});
}

async function shutdownServer(server?: Server) {
	if (!server) return;
	await new Promise<void>((resolve) => server.close(() => resolve()));
}

function buildUrl(server: Server, path: string) {
	const address = server.address() as AddressInfo;
	return `http://127.0.0.1:${address.port}${path}`;
}
