import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { RegistryService } from './registry-service.js';

describe('RegistryService', () => {
	it('creates cache directory asynchronously', async () => {
		const baseDir = mkdtempSync(path.join(os.tmpdir(), 'registry-test-'));
		const cacheDir = path.join(baseDir, 'cache');

		const service = new RegistryService({ registries: {}, cacheDir, cacheTtl: 1000 });
		await delay(10);

		expect(existsSync(cacheDir)).toBe(true);
		expect(service).toBeDefined();

		rmSync(baseDir, { recursive: true, force: true });
	});

	it('aborts fetch when request exceeds timeout', async () => {
		const server = http.createServer(() => {
			// Intentionally never respond
		});
		await new Promise<void>((resolve) => server.listen(0, resolve));
		const port = (server.address() as AddressInfo).port;

		const baseDir = mkdtempSync(path.join(os.tmpdir(), 'registry-timeout-test-'));
		const service = new RegistryService({
			registries: { test: `http://127.0.0.1:${port}/` },
			cacheDir: baseDir,
			cacheTtl: 1000,
			fetchTimeout: 100,
		});

		await expect(service.getRegistry('test')).rejects.toThrow();

		server.close();
		rmSync(baseDir, { recursive: true, force: true });
	});

	it('removes cache file from disk', async () => {
		const baseDir = mkdtempSync(path.join(os.tmpdir(), 'registry-remove-test-'));
		const service = new RegistryService({
			registries: {},
			cacheDir: baseDir,
			cacheTtl: 1000,
		});

		const cachePath = path.join(baseDir, 'registry-test.json');
		writeFileSync(cachePath, JSON.stringify({ data: {}, timestamp: Date.now() }));

		// @ts-expect-error - Testing private method
		await service.removeFromDisk('test');
		expect(existsSync(cachePath)).toBe(false);

		rmSync(baseDir, { recursive: true, force: true });
	});
});
