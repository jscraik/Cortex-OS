import { describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { createEnhancedClient } from '../src/client.js';

describe('WebSocket transport', () => {
	it('performs a tool call over ws', async () => {
		const wss = new WebSocketServer({ port: 0 });
		wss.on('connection', (ws) => {
			ws.on('message', (raw) => {
				try {
					const msg = JSON.parse(raw.toString());
					// echo result
					ws.send(JSON.stringify({ id: msg.id, result: { echoed: msg.name } }));
				} catch {
					// ignore
				}
			});
		});
		const address = wss.address();
		if (typeof address === 'string' || address == null) throw new Error('unexpected address');
		const port = address.port;
		const client = await createEnhancedClient({
			name: 'ws-demo',
			transport: 'ws',
			endpoint: `ws://localhost:${port}`,
		});
		const res = await client.callTool({ name: 'ping' });
		expect(res).toMatchObject({ echoed: 'ping' });
		await client.close();
		wss.close();
	});
});
