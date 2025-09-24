import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { ServerInfo } from '@cortex-os/mcp-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAll, remove, upsert } from '../src/fs-store.js';

let baseDir: string;

beforeEach(() => {
	baseDir = mkdtempSync(join(tmpdir(), 'mcp-registry-test-'));
	process.env.CORTEX_HOME = baseDir;
});

afterEach(() => {
	rmSync(baseDir, { recursive: true, force: true });
	delete process.env.CORTEX_HOME;
});

describe('fs-store', () => {
	it('upserts and removes server entries', async () => {
		const si: ServerInfo = { name: 'foo', transport: 'stdio', command: 'foo' };
		await upsert(si);
		let all = await readAll();
		expect(all).toHaveLength(1);
		expect(all[0]).toMatchObject(si);

		const removed = await remove('foo');
		expect(removed).toBe(true);
		all = await readAll();
		expect(all).toHaveLength(0);
	});

	it('logs and returns fallback on invalid json', async () => {
		const file = join(baseDir, 'mcp', 'servers.json');
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, '{ invalid');
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = await readAll();
		expect(result).toEqual([]);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	it('returns false when removing non-existent server', async () => {
		const result = await remove('non-existent');
		expect(result).toBe(false);
	});

	it('updates existing server when upserting with same name', async () => {
		const si1: ServerInfo = {
			name: 'test',
			transport: 'stdio',
			command: 'test1',
		};
		const si2: ServerInfo = {
			name: 'test',
			transport: 'stdio',
			command: 'test2',
		};

		await upsert(si1);
		await upsert(si2);

		const all = await readAll();
		expect(all).toHaveLength(1);
		expect(all[0].command).toBe('test2');
	});

	it('handles different environment variables for config path', async () => {
		delete process.env.CORTEX_HOME;
		process.env.XDG_CONFIG_HOME = baseDir;

		const si: ServerInfo = {
			name: 'xdg-test',
			transport: 'stdio',
			command: 'xdg',
		};
		await upsert(si);
		const all = await readAll();
		expect(all).toHaveLength(1);
		expect(all[0]).toMatchObject(si);

		delete process.env.XDG_CONFIG_HOME;
	});

	it('uses HOME directory fallback when no config env vars set', async () => {
		delete process.env.CORTEX_HOME;
		delete process.env.XDG_CONFIG_HOME;
		process.env.HOME = baseDir;

		const si: ServerInfo = {
			name: 'home-test',
			transport: 'stdio',
			command: 'home',
		};
		await upsert(si);
		const all = await readAll();
		expect(all).toHaveLength(1);
		expect(all[0]).toMatchObject(si);
	});

	it('validates server info schema during upsert', async () => {
		const invalidSi = {
			name: 'invalid',
			transport: 'invalid-transport',
		} as unknown as ServerInfo;
		await expect(upsert(invalidSi)).rejects.toThrow();
	});

	it('handles environment variables correctly', async () => {
		// Test already covered by other tests, so just verify the path logic
		delete process.env.CORTEX_HOME;
		delete process.env.XDG_CONFIG_HOME;
		process.env.HOME = baseDir;

		const si: ServerInfo = {
			name: 'env-test',
			transport: 'stdio',
			command: 'env',
		};
		await upsert(si);
		const all = await readAll();
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe('env-test');
	});
});

describe('types', () => {
	it('exports correct schemas', async () => {
		const types = await import('../src/types');
		expect(types.TransportTypeSchema).toBeDefined();
		expect(types.ServerManifestSchema).toBeDefined();
		expect(types.RegistryIndexSchema).toBeDefined();
	});

	it('validates transport types correctly', async () => {
		const { TransportTypeSchema } = await import('../src/types');
		expect(TransportTypeSchema.parse('stdio')).toBe('stdio');
		expect(TransportTypeSchema.parse('sse')).toBe('sse');
		expect(TransportTypeSchema.parse('streamableHttp')).toBe('streamableHttp');
		expect(() => TransportTypeSchema.parse('invalid')).toThrow();
	});

	it('validates server manifest schema', async () => {
		const { ServerManifestSchema } = await import('../src/types');
		const valid = {
			id: 'test-id',
			name: 'test-server',
			description: 'A test server',
			tags: ['test', 'example'],
			transports: { stdio: { command: 'test' } },
		};
		expect(ServerManifestSchema.parse(valid)).toEqual(valid);

		expect(() => ServerManifestSchema.parse({ name: 'incomplete' })).toThrow();
	});

	it('validates registry index schema', async () => {
		const { RegistryIndexSchema } = await import('../src/types');
		const valid = {
			updatedAt: '2023-09-14T12:00:00Z',
			servers: [],
		};
		expect(RegistryIndexSchema.parse(valid)).toEqual(valid);

		expect(() => RegistryIndexSchema.parse({ servers: [] })).toThrow();
	});
});

describe('index', () => {
	it('exports types', async () => {
		const index = await import('../src/index');
		expect(index.TransportTypeSchema).toBeDefined();
		expect(index.ServerManifestSchema).toBeDefined();
		expect(index.RegistryIndexSchema).toBeDefined();
	});
});
