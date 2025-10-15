import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ServerInfo } from '@cortex-os/mcp-core';
import { readAll, remove, upsert, closeRegistryCache } from '../fs-store.js';

const createServer = (name: string): ServerInfo => ({
	name,
	transport: 'http',
	endpoint: `http://localhost/${name}`,
});

const resolveRegistryPath = (root: string) => join(root, 'mcp', 'servers.json');

describe('fs-store with memory cache', () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = await fs.mkdtemp(join(tmpdir(), 'fs-store-'));
		process.env.CORTEX_HOME = workDir;
	});

	afterEach(async () => {
		await closeRegistryCache();
		delete process.env.CORTEX_HOME;
		await fs.rm(workDir, { recursive: true, force: true });
	});

	it('reads existing registry entries through the cache', async () => {
		const registry = resolveRegistryPath(workDir);
		await fs.mkdir(join(workDir, 'mcp'), { recursive: true });
		await fs.writeFile(
			registry,
			JSON.stringify({ servers: [createServer('seed')] }, null, 2),
			'utf8',
		);

		const servers = await readAll();
		expect(servers.map((s) => s.name)).toEqual(['seed']);
	});

	it('persists upserted servers on close', async () => {
		await upsert(createServer('write-test'));

		const registry = resolveRegistryPath(workDir);
		await closeRegistryCache();

		const contents = JSON.parse(await fs.readFile(registry, 'utf8')) as {
			servers: ServerInfo[];
		};
		expect(contents.servers.map((s) => s.name)).toEqual(['write-test']);
	});

	it('removes servers and persists the update', async () => {
		await upsert(createServer('to-remove'));
		const removed = await remove('to-remove');
		expect(removed).toBe(true);

		const registry = resolveRegistryPath(workDir);
		await closeRegistryCache();

		const contents = JSON.parse(await fs.readFile(registry, 'utf8')) as {
			servers: ServerInfo[];
		};
		expect(contents.servers).toEqual([]);
	});
});
