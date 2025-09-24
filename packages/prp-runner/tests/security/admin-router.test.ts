import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdminRouter } from '../../src/lib/server/admin-router.js';

describe('Admin Router', () => {
	it('rejects non-admin access', async () => {
		const app = express();
		app.use(express.json());
		app.use('/admin', createAdminRouter());
		const res = await request(app).get('/admin/keys').set('X-API-Key', 'any');
		expect(res.status).toBe(403);
	});

	it('allows admin to create and list keys', async () => {
		const app = express();
		app.use(express.json());
		app.use('/admin', createAdminRouter());
		const create = await request(app)
			.post('/admin/keys')
			.set('X-Role', 'admin')
			.set('X-API-Key', 'any')
			.send({ role: 'user', label: 'test' });
		expect(create.status).toBe(201);
		expect(create.body.key).toBeDefined();

		const list = await request(app)
			.get('/admin/keys')
			.set('X-Role', 'admin')
			.set('X-API-Key', 'any');
		expect(list.status).toBe(200);
		expect(Array.isArray(list.body.keys)).toBe(true);
		type KeyRec = {
			key: string;
			role: string;
			label?: string;
			createdAt: string;
			revoked?: boolean;
		};
		const keys = list.body.keys as KeyRec[];
		const found = keys.find((k) => k.key === create.body.key);
		expect(Boolean(found)).toBe(true);

		const revoke = await request(app)
			.delete(`/admin/keys/${create.body.key}`)
			.set('X-Role', 'admin')
			.set('X-API-Key', 'any');
		expect(revoke.status).toBe(200);
		expect(revoke.body.revoked).toBe(true);
	});
});
