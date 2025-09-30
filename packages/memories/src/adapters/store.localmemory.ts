import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

type LocalMemoryOptions = {
	baseUrl?: string; // e.g., http://localhost:3028/api/v1
	apiKey?: string; // if configured
	defaultNamespace?: string;
	timeoutMs?: number;
};

type LocalDocData = {
	id?: string;
	memoryId?: string;
	kind?: Memory['kind'];
	text?: string;
	vector?: number[];
	tags?: string[];
	ttl?: string;
	createdAt?: string;
	updatedAt?: string;
	provenance?: Memory['provenance'];
	embeddingModel?: string;
	namespace?: string;
};
type LocalDocEnvelope = {
	data?: LocalDocData | LocalDocData[];
	items?: LocalDocData[];
} & LocalDocData;

function toHeaders(apiKey?: string) {
	const h: Record<string, string> = {
		'content-type': 'application/json',
	};
	if (apiKey) h.authorization = `Bearer ${apiKey}`;
	return h;
}

function toLocalDoc(m: Memory, namespace?: string) {
	// Map our Memory shape to a generic Local Memory document.
	// Since Local Memory’s exact schema isn’t public in detail, we pass through
	// well-named fields and tags; Local Memory indexes text and tags.
	return {
		id: m.id,
		kind: m.kind,
		text: m.text,
		vector: m.vector,
		tags: m.tags,
		ttl: m.ttl,
		createdAt: m.createdAt,
		updatedAt: m.updatedAt,
		provenance: m.provenance,
		embeddingModel: m.embeddingModel,
		namespace: namespace,
	} as const;
}

function fromLocalDoc(doc: LocalDocEnvelope | unknown): Memory | null {
	if (!doc || typeof doc !== 'object') return null;
	const d = doc as LocalDocEnvelope;
	// Best-effort mapping; tolerate extra fields
	return {
		id: String(d.id ?? d.memoryId ?? ''),
		kind: (d.kind ?? 'note') as Memory['kind'],
		text: d.text ?? undefined,
		vector: Array.isArray(d.vector) ? d.vector : undefined,
		tags: Array.isArray(d.tags) ? d.tags : [],
		ttl: d.ttl ?? undefined,
		createdAt: String(d.createdAt ?? new Date().toISOString()),
		updatedAt: String(d.updatedAt ?? new Date().toISOString()),
		provenance: d.provenance ?? { source: 'system' },
		embeddingModel: d.embeddingModel ?? undefined,
	};
}

export class LocalMemoryStore implements MemoryStore {
	private baseUrl: string;
	private apiKey?: string;
	private defaultNs?: string;
	private timeoutMs: number;

	constructor(opts: LocalMemoryOptions = {}) {
		this.baseUrl = (
			opts.baseUrl ??
			process.env.LOCAL_MEMORY_BASE_URL ??
			'http://localhost:3028/api/v1'
		).replace(/\/$/, '');
		this.apiKey = opts.apiKey ?? process.env.LOCAL_MEMORY_API_KEY;
		this.defaultNs = opts.defaultNamespace ?? process.env.LOCAL_MEMORY_NAMESPACE ?? undefined;
		this.timeoutMs = opts.timeoutMs ?? 10_000;
	}

	async upsert(m: Memory, namespace?: string): Promise<Memory> {
		const ns = namespace ?? this.defaultNs;
		const doc = toLocalDoc(m, ns);
		const ctrl = new AbortController();
		const to = setTimeout(() => ctrl.abort(), this.timeoutMs);
		try {
			// Use PUT to upsert by id when available
			const res = await fetch(`${this.baseUrl}/memories/${encodeURIComponent(m.id)}`, {
				method: 'PUT',
				headers: toHeaders(this.apiKey),
				body: JSON.stringify(doc),
				signal: ctrl.signal,
			});
			if (!res.ok) throw new Error(`local-memory: upsert failed: ${res.status}`);
			const raw: unknown = await res.json().catch(() => ({}));
			const parsed = (raw ?? {}) as LocalDocEnvelope;
			return fromLocalDoc(parsed.data ?? parsed) ?? m;
		} finally {
			clearTimeout(to);
		}
	}

	async get(id: string, namespace?: string): Promise<Memory | null> {
		const ctrl = new AbortController();
		const to = setTimeout(() => ctrl.abort(), this.timeoutMs);
		try {
			const url = new URL(`${this.baseUrl}/memories/${encodeURIComponent(id)}`);
			if (namespace ?? this.defaultNs)
				url.searchParams.set('namespace', String(namespace ?? this.defaultNs));
			const res = await fetch(url, {
				headers: toHeaders(this.apiKey),
				signal: ctrl.signal,
			});
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`local-memory: get failed: ${res.status}`);
			const raw: unknown = await res.json().catch(() => ({}));
			const parsed = (raw ?? {}) as LocalDocEnvelope;
			return fromLocalDoc(parsed.data ?? parsed);
		} finally {
			clearTimeout(to);
		}
	}

	async delete(id: string, namespace?: string): Promise<void> {
		const ctrl = new AbortController();
		const to = setTimeout(() => ctrl.abort(), this.timeoutMs);
		try {
			const url = new URL(`${this.baseUrl}/memories/${encodeURIComponent(id)}`);
			if (namespace ?? this.defaultNs)
				url.searchParams.set('namespace', String(namespace ?? this.defaultNs));
			const res = await fetch(url, {
				method: 'DELETE',
				headers: toHeaders(this.apiKey),
				signal: ctrl.signal,
			});
			if (!res.ok && res.status !== 404)
				throw new Error(`local-memory: delete failed: ${res.status}`);
		} finally {
			clearTimeout(to);
		}
	}

	async searchByText(q: TextQuery, namespace?: string): Promise<Memory[]> {
		const ctrl = new AbortController();
		const to = setTimeout(() => ctrl.abort(), this.timeoutMs);
		try {
			const url = new URL(`${this.baseUrl}/memories/search`);
			url.searchParams.set('text', q.text);
			url.searchParams.set('topK', String(q.topK));
			if (q.filterTags?.length) url.searchParams.set('tags', q.filterTags.join(','));
			if (namespace ?? this.defaultNs)
				url.searchParams.set('namespace', String(namespace ?? this.defaultNs));
			const res = await fetch(url, {
				headers: toHeaders(this.apiKey),
				signal: ctrl.signal,
			});
			if (!res.ok) throw new Error(`local-memory: searchByText failed: ${res.status}`);
			const raw: unknown = await res.json().catch(() => ({}));
			const parsed = (raw ?? {}) as LocalDocEnvelope | LocalDocEnvelope[];
			let list: LocalDocEnvelope[] = [];
			if (Array.isArray(parsed)) {
				list = parsed;
			} else if (Array.isArray(parsed.items)) {
				list = parsed.items;
			} else if (Array.isArray(parsed.data)) {
				list = parsed.data;
			} else if (parsed) {
				list = [parsed];
			}
			return list.map(fromLocalDoc).filter(Boolean) as Memory[];
		} finally {
			clearTimeout(to);
		}
	}

	async searchByVector(
		q: VectorQuery,
		namespace?: string,
	): Promise<(Memory & { score: number })[]> {
		// Local Memory’s REST API primarily exposes semantic search by text; when vector
		// search is unavailable, fall back to a text rerank if queryText provided.
		if (q.queryText) {
			const memories = await this.searchByText(
				{ text: q.queryText, topK: q.topK, filterTags: q.filterTags },
				namespace,
			);
			return memories.map((m) => ({ ...m, score: 1.0 }));
		}
		return [];
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		// Reference params to appease unused-var rules without disabling lint
		if (nowISO && namespace) {
			// no-op: Local Memory manages retention internally
		}
		// Local Memory manages retention internally; no-op here.
		return 0;
	}

	async list(namespace?: string, limit?: number, offset?: number): Promise<Memory[]> {
		const ctrl = new AbortController();
		const to = setTimeout(() => ctrl.abort(), this.timeoutMs);
		try {
			const url = new URL(`${this.baseUrl}/memories`);
			if (namespace ?? this.defaultNs)
				url.searchParams.set('namespace', String(namespace ?? this.defaultNs));
			if (typeof limit === 'number') url.searchParams.set('limit', String(limit));
			if (typeof offset === 'number') url.searchParams.set('offset', String(offset));
			const res = await fetch(url, { headers: toHeaders(this.apiKey), signal: ctrl.signal });
			if (!res.ok) throw new Error(`local-memory: list failed: ${res.status}`);
			const raw: unknown = await res.json().catch(() => ({}));
			const parsed = (raw ?? {}) as LocalDocEnvelope | LocalDocEnvelope[];
			let list: LocalDocEnvelope[] = [];
			if (Array.isArray(parsed)) list = parsed;
			else if (Array.isArray(parsed.items)) list = parsed.items;
			else if (Array.isArray(parsed.data)) list = parsed.data;
			else if (parsed) list = [parsed];
			return list.map(fromLocalDoc).filter(Boolean) as Memory[];
		} finally {
			clearTimeout(to);
		}
	}
}
