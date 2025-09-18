import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import {
	CircuitClosedEventSchema,
	CircuitHalfOpenEventSchema,
	CircuitOpenedEventSchema,
	StdioHttpBridge,
} from '../src/stdio-http.js';

describe('Circuit breaker observability events', () => {
	it('emits opened -> half_open -> closed sequence', async () => {
		// Failing twice, succeed third (after reset period) to traverse states
		let calls = 0;
		const server = http.createServer((_req, res) => {
			calls++;
			if (calls <= 2) {
				res.statusCode = 500;
				res.end('fail');
			} else {
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ id: 'x', result: 'ok' }));
			}
		});
		await new Promise<void>((resolve) => server.listen(0, resolve));
		const port = (server.address() as AddressInfo).port;

		const bridge = new StdioHttpBridge({
			httpEndpoint: `http://localhost:${port}`,
			enableRateLimiting: false,
			circuitBreakerOptions: { failureThreshold: 2, resetTimeout: 50 },
		});

		type OpenEvt = typeof CircuitOpenedEventSchema._type;
		type HalfEvt = typeof CircuitHalfOpenEventSchema._type;
		type ClosedEvt = typeof CircuitClosedEventSchema._type;
		const opened: OpenEvt[] = [];
		const half: HalfEvt[] = [];
		const closed: ClosedEvt[] = [];
		bridge.on('circuit.opened', (e) => opened.push(e));
		bridge.on('circuit.half_open', (e) => half.push(e));
		bridge.on('circuit.closed', (e) => closed.push(e));

		// Cause two failures -> open
		await expect(bridge.forward({ id: '1', method: 'm', params: {} })).rejects.toThrow();
		await expect(bridge.forward({ id: '2', method: 'm', params: {} })).rejects.toThrow();
		expect(opened).toHaveLength(1);
		CircuitOpenedEventSchema.parse(opened[0]);

		// Wait for half-open transition window
		await new Promise((r) => setTimeout(r, 60));

		// First call after timeout succeeds (server returns success on 3rd call) -> half_open then closed
		const res = await bridge.forward({ id: '3', method: 'm', params: {} });
		expect(res).toMatchObject({ result: 'ok' });
		expect(half).toHaveLength(1);
		CircuitHalfOpenEventSchema.parse(half[0]);
		expect(closed).toHaveLength(1);
		CircuitClosedEventSchema.parse(closed[0]);

		await bridge.close();
		server.close();
	});
});
