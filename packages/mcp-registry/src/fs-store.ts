import { join } from 'node:path';
import { type ServerInfo } from '@cortex-os/mcp-core';
import { RegistryMemoryCache } from './memory-cache.js';

function registryPath(): string {
	const base =
		process.env.CORTEX_HOME ||
		(process.env.XDG_CONFIG_HOME
			? join(process.env.XDG_CONFIG_HOME, 'cortex-os')
			: join(process.env.HOME || '.', '.config', 'cortex-os'));
	return join(base, 'mcp', 'servers.json');
}

let cachePromise: Promise<RegistryMemoryCache> | null = null;

async function getCache(): Promise<RegistryMemoryCache> {
	if (!cachePromise) {
		const cache = new RegistryMemoryCache({ registryPath: registryPath() });
		cachePromise = (async () => {
			await cache.init();
			return cache;
		})();
	}

	return cachePromise;
}

export async function closeRegistryCache(): Promise<void> {
	if (!cachePromise) {
		return;
	}

	const cache = await cachePromise;
	cachePromise = null;
	await cache.close();
}

export async function getRegistryCache(): Promise<RegistryMemoryCache> {
	return getCache();
}

export async function readAll(): Promise<ServerInfo[]> {
	const cache = await getCache();
	return cache.getAll();
}

export async function upsert(si: ServerInfo): Promise<void> {
	const cache = await getCache();
	cache.upsert(si);
}

export async function remove(name: string): Promise<boolean> {
	const cache = await getCache();
	return cache.remove(name);
}
