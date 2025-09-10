import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ASBRServer, createASBRServer } from '@/api/server.js';
import { getSharedServer } from '../fixtures/shared-server.js';

describe('security headers', () => {
	let server: ASBRServer;

	beforeAll(async () => {
		if (process.env.ASBR_TEST_SHARED_SERVER) {
			const { server: shared } = await getSharedServer();
			server = shared;
		} else {
			server = createASBRServer({ port: 7442 });
			await server.start();
		}
	});

	afterAll(async () => {
		if (!process.env.ASBR_TEST_SHARED_SERVER) {
			await server.stop();
		}
	});

	it('omits HSTS on HTTP', async () => {
		const res = await request(server.app).get('/health');
		expect(res.headers['strict-transport-security']).toBeUndefined();
	});
});
