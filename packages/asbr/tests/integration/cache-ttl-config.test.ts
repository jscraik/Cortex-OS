import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, initializeASBR, saveConfig } from '../../src/index.js';
import { initializeXDG } from '../../src/xdg/index.js';

const tempDir = mkdtempSync(join(tmpdir(), 'asbr-'));
process.env.XDG_CONFIG_HOME = tempDir;

let server: Awaited<ReturnType<typeof initializeASBR>>['server'];

beforeAll(async () => {
	await initializeXDG();
	await saveConfig({ ...DEFAULT_CONFIG, cache_ttl_ms: 1234 });
	const init = await initializeASBR({ port: 0, host: '127.0.0.1' });
	server = init.server;
});

afterAll(async () => {
	await server.stop();
});

describe('cache ttl', () => {
	it('uses ttl from config in cache-control header', async () => {
		const res = await request(server.app).get('/health');
		expect(res.headers['cache-control']).toContain('max-age=1');
	});
});
