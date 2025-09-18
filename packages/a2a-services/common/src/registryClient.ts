// Local minimal Schema shape to avoid reaching into another package's src/ internals.
// If a published contract package emerges, replace with that import.
export interface Schema {
	id: string;
	name: string;
	version: string;
	schema: Record<string, unknown>;
}

import { createSchemaCache, type SchemaCache } from './cache/schemaCache';

export interface SchemaRegistryClientOptions {
	baseUrl: string; // e.g. http://localhost:3000
	cache?: SchemaCache<Schema>; // optional external cache
	ttlMs?: number; // used if cache not supplied
	maxEntries?: number; // used if cache not supplied
	fetchImpl?: typeof fetch; // injectable fetch for tests
}

export interface SchemaRegistryClientMetrics {
	cache?: ReturnType<SchemaCache['metrics']>;
	networkRequests: number; // number of actual fetch calls
}

export interface SchemaRegistryClient {
	getSchema(name: string, version?: string): Promise<Schema>;
	getLatest(name: string): Promise<Schema>;
	metrics(): SchemaRegistryClientMetrics;
}

export function createSchemaRegistryClient(
	opts: SchemaRegistryClientOptions,
): SchemaRegistryClient {
	const { baseUrl, ttlMs = 60_000, maxEntries = 500, fetchImpl = fetch } = opts;
	const cache = opts.cache ?? createSchemaCache<Schema>({ ttlMs, maxEntries });
	let networkRequests = 0;

	async function load(name: string, version: string): Promise<Schema> {
		const url = `${baseUrl}/schemas/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
		networkRequests += 1;
		const res = await fetchImpl(url);
		if (!res.ok) {
			throw new Error(`Failed to fetch schema ${name}@${version}: ${res.status} ${res.statusText}`);
		}
		return (await res.json()) as Schema;
	}

	async function loadLatest(name: string): Promise<Schema> {
		const url = `${baseUrl}/schemas/${encodeURIComponent(name)}/latest`;
		networkRequests += 1;
		const res = await fetchImpl(url);
		if (!res.ok) {
			throw new Error(`Failed to fetch latest schema for ${name}: ${res.status} ${res.statusText}`);
		}
		return (await res.json()) as Schema;
	}

	async function getSchema(name: string, version = 'latest'): Promise<Schema> {
		const key = `${name}@${version}`;
		return cache.get(key, () => (version === 'latest' ? loadLatest(name) : load(name, version)));
	}

	async function getLatest(name: string): Promise<Schema> {
		return getSchema(name, 'latest');
	}

	function metrics(): SchemaRegistryClientMetrics {
		return { cache: cache.metrics(), networkRequests };
	}

	return { getSchema, getLatest, metrics };
}
