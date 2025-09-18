import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { z } from 'zod';
import { createTestServer, getWsUrl, type TestServer } from './testServer';

// Contract schemas for WebSocket message types
const welcomeMsgSchema = z.object({
	type: z.literal('welcome'),
	payload: z.string().min(1),
});

const echoMsgSchema = z.object({
	type: z.literal('echo'),
	payload: z.string(),
});

const wsMessageSchema = z.discriminatedUnion('type', [welcomeMsgSchema, echoMsgSchema]);

type WsMessage = z.infer<typeof wsMessageSchema>;

describe('contract: WebSocket welcome + echo', () => {
	let testServer: TestServer;

	beforeAll(async () => {
		testServer = await createTestServer();
	});

	afterAll(async () => {
		await testServer.stop();
	});

	it('receives welcome then echoes messages', async () => {
		const ws = new WebSocket(getWsUrl(testServer));

		const events: WsMessage[] = [];
		const received = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout waiting for echo')), 4000);

			ws.on('message', (raw) => {
				try {
					const data = JSON.parse(raw.toString());
					// Validate against contract schema
					const parsed = wsMessageSchema.parse(data);
					events.push(parsed);

					if (parsed.type === 'echo') {
						clearTimeout(timeout);
						resolve();
					} else if (parsed.type === 'welcome') {
						// After welcome, send echo test
						ws.send('ping-test');
					}
				} catch (e) {
					reject(e instanceof Error ? e : new Error(String(e)));
				}
			});

			ws.on('error', (err) => reject(err));
		});

		await received;
		ws.close();

		const welcome = events.find((e) => e.type === 'welcome');
		const echo = events.find((e) => e.type === 'echo');

		expect(welcome).toBeDefined();
		expect(welcome?.payload).toContain('Connected');
		expect(echo).toBeDefined();
		expect(echo?.payload).toContain('ping-test');
	});

	it('handles connection lifecycle correctly', async () => {
		const ws = new WebSocket(getWsUrl(testServer));

		const connectionPromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Connection timeout')), 2000);
			ws.on('open', () => {
				clearTimeout(timeout);
				resolve();
			});
			ws.on('error', reject);
		});

		await connectionPromise;

		// Test clean close
		const closePromise = new Promise<void>((resolve) => {
			ws.on('close', () => resolve());
		});

		ws.close();
		await closePromise;
	});
});
