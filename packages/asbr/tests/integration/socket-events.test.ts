// @vitest-environment node
import { io as Client } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ASBRServer, createASBRServer } from '../../src/api/server.js';
import { getEventManager } from '../../src/core/events.js';
import type { Event } from '../../src/types/index.js';
import { initializeXDG } from '../../src/xdg/index.js';
import { getSharedServer } from '../fixtures/shared-server.js';

describe('Socket.io event transport', () => {
	let server: ASBRServer;
	let client: ReturnType<typeof Client>;
	let port: number;

	beforeAll(async () => {
		if (process.env.ASBR_TEST_SHARED_SERVER) {
			const { server: shared } = await getSharedServer();
			server = shared;
			// Shared server fixture chooses its own port; assume default 7450
			port = 7450;
			client = Client(`http://127.0.0.1:${port}`, {
				transports: ['websocket'],
			});
		} else {
			await initializeXDG();
			port = 7443;
			server = createASBRServer({ port, host: '127.0.0.1' });
			await server.start();
			client = Client(`http://127.0.0.1:${port}`, {
				transports: ['websocket'],
			});
		}
	});

	afterAll(async () => {
		client.close();
		if (!process.env.ASBR_TEST_SHARED_SERVER) {
			await server.stop();
		}
	});

	it('broadcasts task events to subscribed clients', async () => {
		const taskId = uuidv4();
		function setupSubscription(resolve: () => void) {
			client.emit('subscribe', { taskId }, () => resolve());
		}
		const subscribed = new Promise<void>((resolve) => {
			client.once('connect', () => setupSubscription(resolve));
		});

		const eventPromise = new Promise<Event>((resolve) => {
			client.on('PlanStarted', (event: Event) => resolve(event));
		});

		await subscribed;
		const manager = await getEventManager();
		await manager.emitEvent({
			id: uuidv4(),
			type: 'PlanStarted',
			taskId,
			timestamp: new Date().toISOString(),
		});

		const event = await eventPromise;
		expect(event.taskId).toBe(taskId);
	});
});
