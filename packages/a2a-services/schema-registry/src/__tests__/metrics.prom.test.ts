import { busMetrics } from '@cortex-os/a2a-core/metrics';
import request from 'supertest';
import { createService } from '../../src/service.js';

// Helper to extract a single metric value from Prometheus text exposition
function getMetric(body: string, name: string): number | undefined {
	const line = body.split('\n').find((l) => l.startsWith(`${name} `));
	if (!line) return undefined;
	const parts = line.trim().split(/\s+/);
	const v = Number(parts[1]);
	return Number.isFinite(v) ? v : undefined;
}

describe('prometheus metrics endpoint', () => {
	const OLD_ENV = { ...process.env };
	beforeEach(() => {
		process.env.ENABLE_PROM_METRICS = 'true';
		// Set very low quotas to trigger rejections quickly
		process.env.QUOTA_GLOBAL_LIMIT = '1';
		process.env.QUOTA_WINDOW_MS = '60000';
		process.env.PER_AGENT_GLOBAL_LIMIT = '5';
		process.env.PER_AGENT_LIMIT = '1';
		process.env.PER_AGENT_WINDOW_MS = '60000';
	});
	afterEach(() => {
		Object.keys(process.env).forEach((k) => delete (process.env as any)[k]);
		Object.assign(process.env, OLD_ENV);
	});

	it('exposes counters and they increment after events & quota rejections', async () => {
		const app = createService({
			enableSmoothing: false,
			enableQuota: true,
			enablePerAgentQuota: true,
		});

		// Initial fetch
		let res = await request(app).get('/metrics/prom');
		expect(res.status).toBe(200);

		const initialEvents = getMetric(res.text, 'a2a_bus_events_total') ?? 0;
		const initialDuplicates = getMetric(res.text, 'a2a_bus_duplicates_dropped_total') ?? 0;
		const initialGlobalReject = getMetric(res.text, 'a2a_quota_global_reject_total') ?? 0;
		const initialAgentReject = getMetric(res.text, 'a2a_quota_agent_reject_total') ?? 0;

		// Simulate some bus activity via direct metrics increments (since schema-registry doesn't publish bus events itself here)
		busMetrics().incEvents(2);
		busMetrics().incDuplicates(1);

		// Trigger global quota rejection (first request succeeds, second should 429)
		await request(app).get('/schemas'); // allowed
		await request(app).get('/schemas'); // should be rejected by global quota

		// Trigger per-agent quota rejection by providing agent id header
		await request(app).get('/schemas').set('x-agent-id', 'agent-1'); // allowed (uses per-agent quota)
		await request(app).get('/schemas').set('x-agent-id', 'agent-1'); // rejected per-agent

		res = await request(app).get('/metrics/prom');
		expect(res.status).toBe(200);

		const eventsAfter = getMetric(res.text, 'a2a_bus_events_total')!;
		const duplicatesAfter = getMetric(res.text, 'a2a_bus_duplicates_dropped_total')!;
		const globalRejectAfter = getMetric(res.text, 'a2a_quota_global_reject_total')!;
		const agentRejectAfter = getMetric(res.text, 'a2a_quota_agent_reject_total')!;

		expect(eventsAfter).toBe(initialEvents + 2);
		expect(duplicatesAfter).toBe(initialDuplicates + 1);
		expect(globalRejectAfter).toBe(initialGlobalReject + 1); // one global rejection
		expect(agentRejectAfter).toBe(initialAgentReject + 1); // one per-agent rejection
	});
});
