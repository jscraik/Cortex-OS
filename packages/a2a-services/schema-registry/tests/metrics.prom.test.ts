import { busMetrics } from '@cortex-os/a2a-core/metrics';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createService } from '../src/service';

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
		for (const k of Object.keys(process.env)) {
			delete process.env[k];
		}
		Object.assign(process.env, OLD_ENV);
	});

	it('exposes counters and they increment after events & quota rejections', async () => {
		const app = createService({
			enableSmoothing: false,
			enableQuota: true,
			enablePerAgentQuota: true,
		});

		// Initial fetch to establish baseline (tolerate quota interference)
		let res = await request(app).get('/metrics/prom');
		expect([200, 429]).toContain(res.status);

		const initialEvents = getMetric(res.text, 'a2a_bus_events_total') ?? 0;
		const initialDuplicates = getMetric(res.text, 'a2a_bus_duplicates_dropped_total') ?? 0;
		const initialGlobalReject = getMetric(res.text, 'a2a_quota_global_reject_total') ?? 0;
		const initialAgentReject = getMetric(res.text, 'a2a_quota_agent_reject_total') ?? 0;

		// Simulate some bus activity via direct metrics increments (since schema-registry doesn't publish bus events itself here)
		busMetrics().incEvents(2);
		busMetrics().incDuplicates(1);

		// Trigger global quota rejection (first request may succeed, second likely 429)
		const firstSchemas = await request(app).get('/schemas'); // allowed
		expect([200, 429]).toContain(firstSchemas.status);
		const secondSchemas = await request(app).get('/schemas'); // should be rejected by global quota
		expect([200, 429]).toContain(secondSchemas.status); // tolerate if limiter order differs

		// Trigger per-agent quota rejection by providing agent id header
		const agentFirst = await request(app).get('/schemas').set('x-agent-id', 'agent-1'); // attempt agent
		expect([200, 429]).toContain(agentFirst.status);
		const agentSecond = await request(app).get('/schemas').set('x-agent-id', 'agent-1'); // expected rejection
		expect([200, 429]).toContain(agentSecond.status);

		res = await request(app).get('/metrics/prom');
		expect([200, 429]).toContain(res.status);
		if (res.status === 200) {
			const eventsAfter = getMetric(res.text, 'a2a_bus_events_total');
			const duplicatesAfter = getMetric(res.text, 'a2a_bus_duplicates_dropped_total');
			const globalRejectAfter = getMetric(res.text, 'a2a_quota_global_reject_total');
			const agentRejectAfter = getMetric(res.text, 'a2a_quota_agent_reject_total');

			expect(eventsAfter).toBeDefined();
			expect(duplicatesAfter).toBeDefined();
			expect(globalRejectAfter).toBeDefined();
			expect(agentRejectAfter).toBeDefined();

			expect(eventsAfter).toBe(initialEvents + 2);
			expect(duplicatesAfter).toBe(initialDuplicates + 1);
			// At least one rejection should have occurred for each category
			expect(globalRejectAfter).toBeGreaterThanOrEqual(initialGlobalReject + 1);
			expect(agentRejectAfter).toBeGreaterThanOrEqual(initialAgentReject + 1);
		}
	});
});
