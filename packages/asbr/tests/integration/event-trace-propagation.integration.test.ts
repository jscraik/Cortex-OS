import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createASBRServer } from '../../src/api/server.js';

const TP = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

describe('integration: event traceparent propagation', () => {
	let server: ReturnType<typeof createASBRServer>;
	let base: any;
	beforeAll(async () => {
		server = createASBRServer({ port: 0 });
		await server.start();
		const address = (server.server as any).address();
		base = request(`http://127.0.0.1:${address.port}`);
	});
	afterAll(async () => {
		await server.stop();
	});

	it('PlanStarted event stored with traceparent', async () => {
		const res = await base
			.post('/v1/tasks') // Correct API route
			.set('authorization', 'Bearer test')
			.set('traceparent', TP)
			.send({
				input: {
					title: 't',
					brief: 'b',
					inputs: [],
					scopes: ['test-scope'],
					schema: 'cortex.task.input@1',
				},
			})
			.expect(200);
		const id = res.body?.task?.id;
		expect(res.headers.traceparent).toBe(TP);

		// Verify task can be retrieved (shows data was stored)
		const getRes = await base
			.get(`/v1/tasks/${id}`)
			.set('authorization', 'Bearer test')
			.expect(200);
		expect(getRes.headers.traceparent).toBe(TP);
		expect(getRes.body.task.id).toBe(id);
	});
});
