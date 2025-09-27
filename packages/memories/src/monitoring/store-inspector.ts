import type { Memory } from '../domain/types.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export type StoreDescriptor = {
	label: string;
	store: MemoryStore;
	namespace?: string;
};

export type StoreInspectorConfig = {
	brand: string;
	primary: StoreDescriptor;
	fallback?: StoreDescriptor;
};

export type AdapterMetrics = {
	sampleSize: number;
	vectorEmbeddingsPresent: boolean;
	latencyMs: number;
	adapterStats?: Record<string, unknown>;
};

export type AdapterEntry = {
	id: string;
	healthy: boolean;
	status: 'healthy' | 'unhealthy';
	error?: string;
	latencyMs: number;
};

export type StoreInspectionReport = {
	brand: string;
	timestamp: string;
	backend: {
		active: string;
		status: 'healthy' | 'degraded' | 'unhealthy';
		adapters: AdapterEntry[];
		metrics: Record<string, AdapterMetrics>;
	};
};

export type StoreInspector = {
	collect: () => Promise<StoreInspectionReport>;
};

export function createStoreInspector(config: StoreInspectorConfig): StoreInspector {
	return {
		collect: async () => collectInspection(config),
	};
}

async function collectInspection(config: StoreInspectorConfig): Promise<StoreInspectionReport> {
	const timestamp = new Date().toISOString();
	const adapters: AdapterEntry[] = [];
	const metrics: Record<string, AdapterMetrics> = {};

	const primary = await inspectDescriptor(config.primary);
	adapters.push(primary.adapter);
	metrics[config.primary.label] = primary.metrics;

	let active = config.primary.label;
	let status: 'healthy' | 'degraded' | 'unhealthy' = primary.adapter.status;

	if (config.fallback) {
		const fallback = await inspectDescriptor(config.fallback);
		adapters.push(fallback.adapter);
		metrics[config.fallback.label] = fallback.metrics;
		status = resolveStatus(primary.adapter.status, fallback.adapter.status);
		if (primary.adapter.status === 'unhealthy' && fallback.adapter.status === 'healthy') {
			active = config.fallback.label;
		}
	}

	if (!config.fallback && status === 'unhealthy') status = 'unhealthy';
	if (!config.fallback && status === 'healthy') status = 'healthy';

	if (config.fallback && status === 'healthy') active = config.primary.label;

	return {
		brand: config.brand,
		timestamp,
		backend: {
			active,
			status,
			adapters,
			metrics,
		},
	};
}

function resolveStatus(
	primaryStatus: 'healthy' | 'unhealthy',
	fallbackStatus: 'healthy' | 'unhealthy',
): 'healthy' | 'degraded' | 'unhealthy' {
	if (primaryStatus === 'healthy' && fallbackStatus === 'healthy') return 'healthy';
	if (primaryStatus === 'healthy' && fallbackStatus === 'unhealthy') return 'healthy';
	if (primaryStatus === 'unhealthy' && fallbackStatus === 'healthy') return 'degraded';
	return 'unhealthy';
}

async function inspectDescriptor(descriptor: StoreDescriptor) {
	const start = Date.now();
	let sample: Memory[] = [];
	let status: 'healthy' | 'unhealthy' = 'healthy';
	let error: string | undefined;

	try {
		sample = await descriptor.store.searchByText({ text: '', topK: 32 }, descriptor.namespace);
	} catch (err) {
		status = 'unhealthy';
		error = err instanceof Error ? err.message : 'unknown adapter error';
	}

	const latencyMs = Date.now() - start;
	const metrics: AdapterMetrics = {
		sampleSize: sample.length,
		vectorEmbeddingsPresent: hasVectorEmbeddings(sample),
		latencyMs,
		adapterStats: await resolveAdapterStats(descriptor.store),
	};

	return {
		adapter: {
			id: descriptor.label,
			healthy: status === 'healthy',
			status,
			error,
			latencyMs,
		},
		metrics,
	};
}

function hasVectorEmbeddings(items: Memory[]): boolean {
	return items.some((item) => Array.isArray(item.vector) && item.vector.length > 0);
}

async function resolveAdapterStats(store: MemoryStore) {
	const candidate = (store as unknown as { stats?: () => Promise<Record<string, unknown>> }).stats;
	if (typeof candidate !== 'function') return undefined;
	try {
		return await candidate.call(store);
	} catch (error) {
		console.warn('brAInwav store inspector stats lookup failed', error);
		return undefined;
	}
}
