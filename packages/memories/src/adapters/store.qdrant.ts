import { randomUUID } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ENV, EXTERNAL_ENV } from '../config/constants.js';
import { decayEnabled, decayFactor, getHalfLifeMs } from '../core/decay.js';
import { isExpired } from '../core/ttl.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

type Distance = 'Cosine' | 'Euclid' | 'Dot';

export interface QdrantStoreOptions {
	url?: string;
	apiKey?: string;
	collection?: string;
	vectorSize?: number;
	distance?: Distance;
	onDisk?: boolean;
	hnswM?: number;
	hnswEfConstruct?: number;
}

type QdrantPoint = {
	id: string | number;
	payload?: Record<string, unknown>;
	vector?: number[];
	score?: number;
};

type QueuePoint = {
	readonly id: string;
	readonly payload: Record<string, unknown>;
	readonly vector?: number[];
};

type ScrollResponse = {
	points?: QdrantPoint[];
	next_page_offset?: number | string | null;
};

const DEFAULT_COLLECTION = 'memories';

const namespaceKey = 'namespace';

function resolveNumber(raw: string | undefined, fallback: number): number {
	const num = raw ? Number(raw) : Number.NaN;
	return Number.isFinite(num) && num > 0 ? num : fallback;
}

function resolveBoolean(raw: string | undefined, fallback: boolean): boolean {
	if (!raw) return fallback;
	const normalized = raw.toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return fallback;
}

function resolveDistance(raw: string | undefined, fallback: Distance): Distance {
	if (!raw) return fallback;
	const normalized = raw.toLowerCase();
	if (normalized === 'cosine') return 'Cosine';
	if (normalized === 'dot' || normalized === 'dotproduct') return 'Dot';
	if (normalized === 'euclid' || normalized === 'euclidean') return 'Euclid';
	return fallback;
}

function toQdrantPayload(memory: Memory, namespace?: string): Record<string, unknown> {
	return {
		id: memory.id,
		text: memory.text,
		tags: memory.tags,
		kind: memory.kind,
		ttl: memory.ttl,
		createdAt: memory.createdAt,
		updatedAt: memory.updatedAt,
		provenance: memory.provenance,
		policy: memory.policy,
		embeddingModel: memory.embeddingModel,
		metadata: memory.metadata,
		[namespaceKey]: namespace,
	};
}

function normalizeVector(vec?: number[]): number[] | undefined {
	if (!Array.isArray(vec) || vec.length === 0) return undefined;
	return vec;
}

function toInteger(candidate: unknown): number | undefined {
	const num = typeof candidate === 'number' ? candidate : Number(candidate);
	return Number.isFinite(num) ? Number(num) : undefined;
}

function payloadToMemory(payload: Record<string, unknown> | undefined, vector?: number[]): Memory {
	const base = payload ?? {};
	return {
		id: String(base.id ?? base.memoryId ?? randomUUID()),
		kind: (base.kind as Memory['kind']) ?? 'note',
		text: typeof base.text === 'string' ? base.text : undefined,
		vector,
		tags: Array.isArray(base.tags) ? (base.tags as string[]) : [],
		ttl: typeof base.ttl === 'string' ? base.ttl : undefined,
		createdAt: typeof base.createdAt === 'string' ? base.createdAt : new Date().toISOString(),
		updatedAt: typeof base.updatedAt === 'string' ? base.updatedAt : new Date().toISOString(),
		provenance: (base.provenance as Memory['provenance']) ?? { source: 'system' },
		policy: base.policy as Memory['policy'],
		embeddingModel: typeof base.embeddingModel === 'string' ? base.embeddingModel : undefined,
		metadata: (base.metadata as Record<string, unknown> | undefined) ?? undefined,
	};
}

function buildFilter(id?: string, namespace?: string, tags?: string[]): Record<string, unknown> {
	const must: Array<Record<string, unknown>> = [];
	if (id) must.push({ key: 'id', match: { value: id } });
	if (namespace) must.push({ key: namespaceKey, match: { value: namespace } });
	if (tags?.length) {
		must.push({ key: 'tags', match: { any: tags } });
	}
	return must.length > 0 ? { must } : {};
}

function lexicalScore(text: string | undefined, query: string): number {
	if (!text) return 0;
	const lower = text.toLowerCase();
	const needle = query.toLowerCase();
	if (!needle.trim()) return 0;
	let hits = 0;
	let from = 0;
	for (;;) {
		const idx = lower.indexOf(needle, from);
		if (idx === -1) break;
		hits += 1;
		from = idx + needle.length;
	}
	return hits / Math.max(1, lower.length / needle.length);
}

export class QdrantMemoryStore implements MemoryStore {
	private readonly client: QdrantClient;
	private readonly collection: string;
	private readonly vectorSize: number;
	private readonly distance: Distance;
	private readonly onDisk: boolean;
	private readonly hnswM: number;
	private readonly hnswEfConstruct: number;
	private initialized = false;

	constructor(options: QdrantStoreOptions = {}) {
		const url = options.url ?? process.env[EXTERNAL_ENV.QDRANT_URL] ?? 'http://localhost:6333';
		this.client = new QdrantClient({
			url,
			apiKey: options.apiKey ?? process.env[EXTERNAL_ENV.QDRANT_API_KEY],
		});
		this.collection =
			options.collection ?? process.env[ENV.QDRANT_COLLECTION] ?? DEFAULT_COLLECTION;
		const dimEnv = process.env[ENV.VECTOR_DIM];
		this.vectorSize = options.vectorSize ?? resolveNumber(dimEnv, 1536);
		const distanceEnv = process.env[ENV.QDRANT_DISTANCE];
		this.distance = options.distance ?? resolveDistance(distanceEnv, 'Cosine');
		const onDiskEnv = process.env[ENV.QDRANT_ON_DISK];
		this.onDisk = options.onDisk ?? resolveBoolean(onDiskEnv, true);
		const hnswMEnv = process.env[ENV.QDRANT_HNSW_M];
		const hnswEfEnv = process.env[ENV.QDRANT_HNSW_EF_CONSTRUCT];
		this.hnswM = options.hnswM ?? resolveNumber(hnswMEnv, 16);
		this.hnswEfConstruct = options.hnswEfConstruct ?? resolveNumber(hnswEfEnv, 200);
	}

	async upsert(memory: Memory, namespace?: string): Promise<Memory> {
		await this.ensureCollection();
		const vector = normalizeVector(memory.vector);
		const point: QueuePoint = {
			id: `${namespace ?? 'default'}:${memory.id}`,
			payload: toQdrantPayload(memory, namespace),
			vector: vector ?? undefined,
		};
		await this.client.upsert(this.collection, { points: [point] });
		return memory;
	}

	async get(id: string, namespace?: string): Promise<Memory | null> {
		await this.ensureCollection();
		const response = (await this.client.scroll(this.collection, {
			filter: buildFilter(id, namespace),
			limit: 1,
			with_payload: true,
			with_vectors: true,
		})) as ScrollResponse;
		const first = response.points?.[0];
		if (!first) return null;
		return payloadToMemory(first.payload, Array.isArray(first.vector) ? first.vector : undefined);
	}

	async delete(id: string, namespace?: string): Promise<void> {
		await this.ensureCollection();
		await this.client.delete(this.collection, { filter: buildFilter(id, namespace) });
	}

	async searchByText(query: TextQuery, namespace?: string): Promise<Memory[]> {
		await this.ensureCollection();
		const batch = Math.max(100, (query.topK ?? 10) * 5);
		const response = (await this.client.scroll(this.collection, {
			limit: batch,
			filter: buildFilter(undefined, namespace, query.filterTags),
			with_payload: true,
		})) as ScrollResponse;
		const items = (response.points ?? []).map((point): Memory => payloadToMemory(point.payload));
		const scored = items
			.map((memory) => ({ memory, score: lexicalScore(memory.text, query.text) }))
			.filter((entry) => entry.score > 0)
			.sort((left, right) => right.score - left.score)
			.slice(0, query.topK ?? 10)
			.map((entry) => entry.memory);
		return scored;
	}

	async searchByVector(
		query: VectorQuery,
		namespace?: string,
	): Promise<(Memory & { score: number })[]> {
		await this.ensureCollection();
		const vector = normalizeVector(query.vector);
		if (!vector) return [];
		const limit = query.topK ?? 10;
		const response = (await this.client.search(this.collection, {
			vector,
			filter: buildFilter(undefined, namespace, query.filterTags),
			limit: Math.max(limit, 10),
			with_payload: true,
		})) as QdrantPoint[];
		const decay = decayEnabled();
		const halfLife = decay ? getHalfLifeMs() : undefined;
		const nowIso = new Date().toISOString();
		const items = (response ?? []).map((point) => {
			const memory = payloadToMemory(
				point.payload,
				Array.isArray(point.vector) ? point.vector : undefined,
			);
			let score = typeof point.score === 'number' ? point.score : 0;
			if (decay && halfLife) score *= decayFactor(memory.createdAt, nowIso, halfLife);
			return { ...memory, score };
		});
		return items.slice(0, limit);
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		await this.ensureCollection();
		const response = (await this.client.scroll(this.collection, {
			filter: buildFilter(undefined, namespace),
			with_payload: true,
			limit: 500,
		})) as ScrollResponse;
		const expired = (response.points ?? []).filter((point) => {
			const payload = point.payload ?? {};
			const createdAt = typeof payload.createdAt === 'string' ? payload.createdAt : undefined;
			const ttl = typeof payload.ttl === 'string' ? payload.ttl : undefined;
			if (!createdAt || !ttl) return false;
			return isExpired(createdAt, ttl, nowISO);
		});
		if (expired.length === 0) return 0;
		await this.client.delete(this.collection, {
			points: expired.map((point) => String(point.id)),
		});
		return expired.length;
	}

	async list(namespace = 'default', limit = 50, offset = 0): Promise<Memory[]> {
		await this.ensureCollection();
		const response = (await this.client.scroll(this.collection, {
			filter: buildFilter(undefined, namespace),
			offset,
			limit,
			with_payload: true,
		})) as ScrollResponse;
		return (response.points ?? []).map((point) =>
			payloadToMemory(point.payload, Array.isArray(point.vector) ? point.vector : undefined),
		);
	}

	async healthCheck(): Promise<boolean> {
		try {
			await this.client.getCollections();
			return true;
		} catch (error) {
			console.error('brAInwav Qdrant health check failed', error);
			return false;
		}
	}

	async stats(): Promise<Record<string, unknown>> {
		await this.ensureCollection();
		try {
			const info = (await this.client.getCollection(this.collection)) as Record<string, unknown>;
			const result = (info?.result ?? {}) as Record<string, unknown>;
			const points = toInteger(result.points_count ?? result.vectors_count);
			const status = typeof result.status === 'string' ? result.status : 'unknown';
			const config = (result.config ?? {}) as Record<string, unknown>;
			const params = (config.params ?? {}) as Record<string, unknown>;
			const onDisk = typeof params.on_disk === 'boolean' ? params.on_disk : this.onDisk;
			return {
				collection: this.collection,
				distance: this.distance,
				vectorSize: this.vectorSize,
				pointsCount: points ?? 0,
				onDisk,
				status,
			};
		} catch (error) {
			console.warn('brAInwav Qdrant stats lookup failed', error);
			return {
				collection: this.collection,
				distance: this.distance,
				vectorSize: this.vectorSize,
				pointsCount: 0,
				onDisk: this.onDisk,
				status: 'unknown',
			};
		}
	}

	private async ensureCollection(): Promise<void> {
		if (this.initialized) return;
		try {
			await this.client.getCollection(this.collection);
			this.initialized = true;
			return;
		} catch {
			// fall through to create
		}
		await this.client.createCollection(this.collection, {
			vectors: {
				size: this.vectorSize,
				distance: this.distance,
				on_disk: this.onDisk,
			},
			hnsw_config: {
				m: this.hnswM,
				ef_construct: this.hnswEfConstruct,
			},
		});
		this.initialized = true;
	}
}
