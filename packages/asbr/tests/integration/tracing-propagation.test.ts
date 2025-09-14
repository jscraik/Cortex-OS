import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createASBRServer } from '../../src/index.js';

function buildValidInput() {
	return {
		title: 'Trace Test',
		brief: 'Ensure traceparent propagates',
		inputs: [{ kind: 'text', value: 'hello' }],
		scopes: ['tasks:create'],
		schema: 'cortex.task.input@1',
	};
}

describe('tracing propagation', () => {
	it('generates a traceparent when none supplied', async () => {
		const srv = createASBRServer();
		await srv.start();
		try {
			const app = srv.app;
			const res = await request(app)
				.post('/v1/tasks')
				.set('authorization', 'Bearer test')
				.send({ input: buildValidInput() })
				.expect(200);
			const tp = res.headers.traceparent;
			expect(tp).toBeDefined();
			const taskId = res.body.task.id;
			const getRes = await request(app)
				.get(`/v1/tasks/${taskId}`)
				.set('authorization', 'Bearer test')
				.expect(200);
			expect(getRes.headers.traceparent).toBe(tp);
		} finally {
			await srv.stop();
		}
	});

	it('preserves provided valid traceparent', async () => {
		const srv = createASBRServer();
		await srv.start();
		try {
			const supplied = `00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`;
			const res = await request(srv.app)
				.post('/v1/tasks')
				.set('authorization', 'Bearer test')
				.set('traceparent', supplied)
				.send({ input: buildValidInput() })
				.expect(200);
			expect(res.headers.traceparent).toBe(supplied);
			const taskId = res.body.task.id;
			const getRes = await request(srv.app)
				.get(`/v1/tasks/${taskId}`)
				.set('authorization', 'Bearer test')
				.expect(200);
			expect(getRes.headers.traceparent).toBe(supplied);
		} finally {
			await srv.stop();
		}
	});
});
