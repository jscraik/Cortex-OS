import type { AddressInfo } from 'node:net';
import { createServer as createNetServer } from 'node:net';
import {
	initializeMetrics,
	observeHybridSearch,
	recordAuthOutcome,
} from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import {
	type MetricsServerHandle,
	startMetricsServer,
} from '@cortex-os/mcp-bridge/runtime/telemetry/metrics-server';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HOST = '127.0.0.1';

async function getAvailablePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const netServer = createNetServer();
		netServer.listen(0, HOST, () => {
			const address = netServer.address() as AddressInfo;
			netServer.close((closeErr) => {
				if (closeErr) {
					reject(closeErr);
					return;
				}
				resolve(address.port);
			});
		});
		netServer.on('error', reject);
	});
}

describe('brAInwav MCP metrics endpoint', () => {
	let port: number;
	let metricsServer: MetricsServerHandle;

	beforeAll(async () => {
		port = await getAvailablePort();
		initializeMetrics('test-brand');
		const logger = pino({ level: 'silent' });
		metricsServer = startMetricsServer({
			brandPrefix: 'test-brand',
			host: HOST,
			logger,
			port,
		});
	});

	afterAll(async () => {
		await metricsServer.close();
	});

	it('exposes Prometheus-formatted metrics', async () => {
		recordAuthOutcome('success');
		recordAuthOutcome('failure');
		observeHybridSearch(42, 3, 1);

		const response = await fetch(`http://${HOST}:${port}/metrics`, {
			headers: { 'cache-control': 'no-store' },
		});
		expect(response.status).toBe(200);
		const body = await response.text();
		expect(body).toContain('brainwav_mcp_http_auth_attempt_total');
		expect(body).toContain('brainwav_mcp_hybrid_search_results_total');
		expect(body).toContain('branding="test-brand"');
	});

	it('returns 404 for non-metrics paths', async () => {
		const response = await fetch(`http://${HOST}:${port}/unknown`);
		expect(response.status).toBe(404);
	});
});
