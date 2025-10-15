import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ServerInfo } from '@cortex-os/mcp-core';
import { RegistryMemoryCache } from '../memory-cache.js';

const createServer = (name: string): ServerInfo => ({
	name,
	transport: 'http',
	endpoint: `http://localhost/${name}`,
});

describe('RegistryMemoryCache', () => {
	let workDir: string;
	let registryFile: string;
	const logger = {
		info: vi.fn(),
		warn: vi.fn(),
	};

	beforeEach(async () => {
		workDir = await fs.mkdtemp(join(tmpdir(), 'registry-cache-'));
		registryFile = join(workDir, 'servers.json');
		logger.info.mockReset();
		logger.warn.mockReset();
	});

	afterEach(async () => {
		vi.useRealTimers();
		await fs.rm(workDir, { recursive: true, force: true });
	});

	it('loads existing registry on init', async () => {
		await fs.writeFile(
			registryFile,
			JSON.stringify({ servers: [createServer('alpha'), createServer('beta')] }, null, 2),
		);

		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		expect(cache.getAll().map((s) => s.name)).toEqual(['alpha', 'beta']);

		await cache.close();
	});

	it('upsert adds new server and flush writes to disk', async () => {
		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		cache.upsert(createServer('gamma'));
		expect(cache.getAll().map((s) => s.name)).toEqual(['gamma']);

		await cache.flush();

		const contents = JSON.parse(await fs.readFile(registryFile, 'utf8')) as {
			servers: ServerInfo[];
		};
		expect(contents.servers.map((s) => s.name)).toEqual(['gamma']);

		await cache.close();
	});

	it('remove deletes the stored server and returns true', async () => {
		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		cache.upsert(createServer('delta'));
		const removed = cache.remove('delta');

		expect(removed).toBe(true);
		expect(cache.getAll()).toHaveLength(0);

		await cache.close();
	});

	it('remove returns false for missing entries', async () => {
		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		expect(cache.remove('missing')).toBe(false);

		await cache.close();
	});

	it('periodic flush persists changes', async () => {
		vi.useFakeTimers();
		const cache = new RegistryMemoryCache({
			registryPath: registryFile,
			logger,
			flushIntervalMs: 500,
		});
		await cache.init();

		const flushSpy = vi.spyOn(cache, 'flush');
		cache.upsert(createServer('epsilon'));

		await vi.advanceTimersByTimeAsync(500);
		expect(flushSpy).toHaveBeenCalled();

		const contents = JSON.parse(await fs.readFile(registryFile, 'utf8')) as {
			servers: ServerInfo[];
		};
		expect(contents.servers.map((s) => s.name)).toEqual(['epsilon']);

		await cache.close();
	});

	it('close flushes remaining changes', async () => {
		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		cache.upsert(createServer('zeta'));
		await cache.close();

		const contents = JSON.parse(await fs.readFile(registryFile, 'utf8')) as {
			servers: ServerInfo[];
		};
		expect(contents.servers.map((s) => s.name)).toEqual(['zeta']);
	});

	it('init handles missing registry file', async () => {
		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		expect(cache.getAll()).toEqual([]);
		expect(logger.warn).not.toHaveBeenCalled();

		await cache.close();
	});

	it('flush logs warning when write fails', async () => {
		const cache = new RegistryMemoryCache({ registryPath: registryFile, logger });
		await cache.init();

		cache.upsert(createServer('eta'));

		const writeSpy = vi
			.spyOn(fs, 'writeFile')
			.mockRejectedValueOnce(new Error('disk full'));

		await cache.flush();

		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ brand: 'brAInwav', error: 'disk full' }),
			'Failed to flush MCP registry cache',
		);

		writeSpy.mockRestore();
		await cache.close();
	});
});
