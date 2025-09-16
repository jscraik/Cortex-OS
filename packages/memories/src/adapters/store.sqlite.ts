import { decayEnabled, decayFactor, getHalfLifeMs } from '../core/decay.js';
import { isExpired } from '../core/ttl.js';
import type { Memory, MemoryId } from '../domain/types.js';
import type {
	MemoryStore,
	TextQuery,
	VectorQuery,
} from '../ports/MemoryStore.js';

// Attempt dynamic loading of native modules so the package can be imported even
// when SQLite bindings are unavailable (e.g., in environments without native
// compilation support).

let DatabaseImpl: typeof import('better-sqlite3') | undefined;
let loadVec: ((db: unknown) => unknown) | undefined;
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	DatabaseImpl = require('better-sqlite3');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	({ load: loadVec } = require('sqlite-vec'));
} catch {
	// Modules not available; constructor will throw if used
}

// Local helper to mark variables as used (avoids unused-param lint while keeping signature)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _use = (..._args: unknown[]): void => {};

// Minimal types to avoid depending on native module types
interface StatementLike {
	run: (...args: unknown[]) => unknown;
	get: (...args: unknown[]) => unknown;
	all: (...args: unknown[]) => unknown[];
}

interface DatabaseLike {
	exec: (sql: string) => unknown;
	prepare: (sql: string) => StatementLike;
}

function padVector(vec: number[], dim: number): number[] {
	if (vec.length === dim) return vec;
	if (vec.length > dim) return vec.slice(0, dim);
	return vec.concat(Array(dim - vec.length).fill(0));
}

export class SQLiteStore implements MemoryStore {
	private readonly db: DatabaseLike;
	private readonly dim: number;

	constructor(path: string, dimension?: number) {
		if (!DatabaseImpl || !loadVec) {
			throw new Error('sqlite:unavailable');
		}
		this.db = new DatabaseImpl(path) as unknown as DatabaseLike;
		loadVec(this.db);
		this.dim = dimension || Number(process.env.MEMORIES_VECTOR_DIM) || 1536;

		// Create table if it doesn't exist
		this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          text TEXT,
          vector TEXT, -- JSON array stored as text
          tags TEXT, -- JSON array stored as text
          ttl TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          provenance TEXT, -- JSON object stored as text
          policy TEXT, -- JSON object stored as text
          embeddingModel TEXT
        )
      `);

		this.db.exec(
			`CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(embedding float[${this.dim}])`,
		);

		// Create indexes
		this.db.exec('CREATE INDEX IF NOT EXISTS idx_kind ON memories(kind)');
		this.db.exec(
			'CREATE INDEX IF NOT EXISTS idx_embeddingModel ON memories(embeddingModel)',
		);
	}

	async upsert(m: Memory, _namespace = 'default'): Promise<Memory> {
		_use(_namespace);
		const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories
      (id, kind, text, vector, tags, ttl, createdAt, updatedAt, provenance, policy, embeddingModel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			m.id,
			m.kind,
			m.text || null,
			m.vector ? JSON.stringify(m.vector) : null,
			JSON.stringify(m.tags),
			m.ttl || null,
			m.createdAt,
			m.updatedAt,
			JSON.stringify(m.provenance),
			m.policy ? JSON.stringify(m.policy) : null,
			m.embeddingModel || null,
		);
		const row = this.db
			.prepare('SELECT rowid FROM memories WHERE id = ?')
			.get(m.id);
		const rowidVal = (row as Record<string, unknown> | undefined)?.rowid;
		if (
			rowidVal !== undefined &&
			(typeof rowidVal === 'number' || typeof rowidVal === 'bigint')
		) {
			if (m.vector) {
				const padded = padVector(m.vector, this.dim);
				const buffer = Buffer.from(new Float32Array(padded).buffer);
				this.db
					.prepare(
						'INSERT OR REPLACE INTO memory_embeddings(rowid, embedding) VALUES (?, ?)',
					)
					.run(BigInt(rowidVal), buffer);
			} else {
				this.db
					.prepare('DELETE FROM memory_embeddings WHERE rowid = ?')
					.run(BigInt(rowidVal));
			}
		}

		return m;
	}

	async get(id: MemoryId, _namespace = 'default'): Promise<Memory | null> {
		_use(_namespace);
		const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
		const row = stmt.get(id);

		if (!row) return null;

		return this.rowToMemory(row);
	}

	async delete(id: MemoryId, _namespace = 'default'): Promise<void> {
		_use(_namespace);
		const row = this.db
			.prepare('SELECT rowid FROM memories WHERE id = ?')
			.get(id);
		const rowidVal = (row as Record<string, unknown> | undefined)?.rowid;
		if (
			rowidVal !== undefined &&
			(typeof rowidVal === 'number' || typeof rowidVal === 'bigint')
		) {
			this.db
				.prepare('DELETE FROM memory_embeddings WHERE rowid = ?')
				.run(BigInt(rowidVal));
		}
		this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
	}

	async searchByText(q: TextQuery, _namespace = 'default'): Promise<Memory[]> {
		_use(_namespace);
		let sql = 'SELECT * FROM memories WHERE text IS NOT NULL';
		const params: (string | number)[] = [];

		if (q.text) {
			sql += ' AND LOWER(text) LIKE LOWER(?)';
			params.push(`%${q.text}%`);
		}

		if (q.filterTags && q.filterTags.length > 0) {
			// For simplicity, we'll do a basic tag filter
			// A more sophisticated implementation would parse the JSON tags
			sql += ' AND (';
			q.filterTags.forEach((tag, i) => {
				if (i > 0) sql += ' OR ';
				sql += 'tags LIKE ?';
				params.push(`%"${tag}"%`);
			});
			sql += ')';
		}

		// Fetch more candidates to allow reranking in a second stage
		const initialLimit = Math.max(q.topK * 10, q.topK);
		sql += ' ORDER BY updatedAt DESC LIMIT ?';
		params.push(initialLimit);

		const stmt = this.db.prepare(sql);
		const rows = stmt.all(...params);
		let candidates = rows.map((row) => this.rowToMemory(row));

		// Optional rerank stage using Model Gateway if query text is present
		const rerankEnabled =
			(process.env.MEMORIES_RERANK_ENABLED || 'true').toLowerCase() !== 'false';
		const queryText = q.text?.trim();

		if (rerankEnabled && queryText && candidates.length > 1) {
			try {
				let top = await this.rerankWithModelGateway(queryText, candidates);
				if (decayEnabled()) {
					const half = getHalfLifeMs();
					const now = new Date().toISOString();
					top = top
						.map((m, idx) => ({
							m,
							idx,
							s: decayFactor(m.createdAt, now, half),
						}))
						.sort((a, b) => b.s - a.s || a.idx - b.idx)
						.map((x) => x.m);
				}
				return top.slice(0, q.topK);
			} catch {
				// Fall back to original ordering on any error
				if (decayEnabled()) {
					const half = getHalfLifeMs();
					const now = new Date().toISOString();
					candidates = candidates
						.map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
						.sort((a, b) => b.s - a.s)
						.map((x) => x.m);
				}
				return candidates.slice(0, q.topK);
			}
		}

		if (decayEnabled()) {
			const half = getHalfLifeMs();
			const now = new Date().toISOString();
			candidates = candidates
				.map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
				.sort((a, b) => b.s - a.s)
				.map((x) => x.m);
		}

		return candidates.slice(0, q.topK);
	}

	async searchByVector(
		q: VectorQuery,
		_namespace = 'default',
	): Promise<Memory[]> {
		_use(_namespace);
		const padded = padVector(q.vector, this.dim);
		const initialLimit = Math.max(q.topK * 10, q.topK);
		const knnSubquery =
			'SELECT rowid, distance FROM memory_embeddings WHERE embedding MATCH ? ORDER BY distance LIMIT ?';
		const rows = this.db
			.prepare(
				`SELECT m.*, knn.distance FROM (${knnSubquery}) knn JOIN memories m ON m.rowid = knn.rowid`,
			)
			.all(JSON.stringify(padded), initialLimit);
		let candidates = rows.map((row) => this.rowToMemory(row));

		if (q.filterTags && q.filterTags.length > 0) {
			const tagSet = new Set(q.filterTags);
			candidates = candidates.filter((memory) =>
				memory.tags.some((tag) => tagSet.has(tag)),
			);
		}

		let results = candidates.slice(0, q.topK);
		if (decayEnabled()) {
			const half = getHalfLifeMs();
			const now = new Date().toISOString();
			results = candidates
				.map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
				.sort((a, b) => b.s - a.s)
				.map((x) => x.m)
				.slice(0, q.topK);
		}

		const rerankEnabled =
			(process.env.MEMORIES_RERANK_ENABLED || 'true').toLowerCase() !== 'false';
		if (rerankEnabled && q.queryText && candidates.length > 1) {
			try {
				const start = Date.now();
				const reranked = await this.rerankWithModelGateway(
					q.queryText,
					candidates,
				);
				const latency = Date.now() - start;
				await this.writeOutboxEvent({
					type: 'rerank.completed',
					data: {
						strategy: 'vec0+mlxr',
						totalCandidates: candidates.length,
						returned: q.topK,
						latencyMs: latency,
						timestamp: new Date().toISOString(),
					},
				});
				if (decayEnabled()) {
					const half = getHalfLifeMs();
					const now = new Date().toISOString();
					results = reranked
						.map((m, idx) => ({
							m,
							idx,
							s: decayFactor(m.createdAt, now, half),
						}))
						.sort((a, b) => b.s - a.s || a.idx - b.idx)
						.map((x) => x.m)
						.slice(0, q.topK);
				} else {
					results = reranked.slice(0, q.topK);
				}
			} catch {
				// keep initial results on failure
			}
		}

		return results;
	}

	// Second-stage reranking via Model Gateway (/rerank) with Qwen3 MLX primary
	private async rerankWithModelGateway(
		query: string,
		docs: Memory[],
	): Promise<Memory[]> {
		const gatewayUrl = process.env.MODEL_GATEWAY_URL || 'http://localhost:8081';
		const endpoint = `${gatewayUrl.replace(/\/$/, '')}/rerank`;
		const documents = docs.map((d) => d.text || '');
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query, documents }),
		});
		if (!res.ok) {
			throw new Error(`Rerank request failed: ${res.status}`);
		}
		const body = (await res.json()) as { scores: number[]; model: string };
		const scored = docs.map((m, i) => ({
			mem: m,
			score: body.scores?.[i] ?? 0,
			model: body.model,
		}));
		scored.sort((a, b) => b.score - a.score);
		// Emit outbox event with model id
		await this.writeOutboxEvent({
			type: 'rerank.completed',
			data: {
				model: scored[0]?.model || 'unknown',
				candidates: docs.length,
				timestamp: new Date().toISOString(),
			},
		});
		return scored.map((s) => s.mem);
	}

	private async writeOutboxEvent(
		event: Record<string, unknown>,
	): Promise<void> {
		try {
			const file =
				process.env.MEMORIES_OUTBOX_FILE || 'logs/memories-outbox.jsonl';
			// Lazy import to avoid ESM top-level overhead
			const fs = await import('node:fs/promises');
			await fs.mkdir(file.split('/').slice(0, -1).join('/'), {
				recursive: true,
			});
			await fs.appendFile(file, `${JSON.stringify(event)}\n`, {
				encoding: 'utf8',
			});
		} catch {
			// best-effort only
		}
	}

	async purgeExpired(nowISO: string, _namespace?: string): Promise<number> {
		_use(_namespace);
		let purgedCount = 0;

		const stmt = this.db.prepare(
			'SELECT rowid, * FROM memories WHERE ttl IS NOT NULL',
		);
		const rows = stmt.all();

		const expiredIds: string[] = [];
		const expiredRowids: number[] = [];
		for (const row of rows) {
			const memory = this.rowToMemory(row);
			if (memory.ttl && isExpired(memory.createdAt, memory.ttl, nowISO)) {
				expiredIds.push(memory.id);
				const rowidVal = (row as Record<string, unknown> | undefined)?.rowid;
				if (typeof rowidVal === 'number') expiredRowids.push(rowidVal);
			}
		}

		if (expiredIds.length > 0) {
			const placeholders = expiredIds.map(() => '?').join(',');
			this.db
				.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`)
				.run(...expiredIds);
			const rowPlaceholders = expiredRowids.map(() => '?').join(',');
			this.db
				.prepare(
					`DELETE FROM memory_embeddings WHERE rowid IN (${rowPlaceholders})`,
				)
				.run(...expiredRowids);
			purgedCount = expiredIds.length;
		}

		return purgedCount;
	}

	private rowToMemory(row: unknown): Memory {
		const r = (row ?? {}) as Record<string, unknown>;
		const parseJSON = <T>(v: unknown): T | undefined => {
			if (typeof v !== 'string') return undefined;
			try {
				return JSON.parse(v) as T;
			} catch {
				return undefined;
			}
		};
		const isNumber = (v: unknown): v is number => typeof v === 'number';
		const isString = (v: unknown): v is string => typeof v === 'string';

		const id = typeof r.id === 'string' ? r.id : '';
		const kind = ((): Memory['kind'] => {
			const k = r.kind;
			return k === 'note' ||
				k === 'event' ||
				k === 'artifact' ||
				k === 'embedding'
				? k
				: 'note';
		})();

		const text = typeof r.text === 'string' ? r.text : undefined;
		const vector = (() => {
			const arr = parseJSON<unknown[]>(r.vector);
			return Array.isArray(arr) ? arr.filter(isNumber) : undefined;
		})();
		const tags = (() => {
			const arr = parseJSON<unknown[]>(r.tags);
			return Array.isArray(arr) ? arr.filter(isString) : [];
		})();
		const ttl = typeof r.ttl === 'string' ? r.ttl : undefined;
		const createdAt =
			typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString();
		const updatedAt =
			typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString();
		const provenanceObj =
			parseJSON<Partial<Memory['provenance']>>(r.provenance) ?? {};
		const provenance: Memory['provenance'] = {
			source: provenanceObj.source ?? 'system',
			actor: provenanceObj.actor,
			evidence: provenanceObj.evidence,
			hash: provenanceObj.hash,
		};
		const policy = parseJSON<Memory['policy']>(r.policy);
		const embeddingModel =
			typeof r.embeddingModel === 'string' ? r.embeddingModel : undefined;

		return {
			id,
			kind,
			text,
			vector,
			tags,
			ttl,
			createdAt,
			updatedAt,
			provenance,
			policy,
			embeddingModel,
		};
	}
}
