import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import type { Chunk, Store } from '../lib/index.js';

interface QueryResult<Row> {
	rows: Row[];
}
interface ClientLike {
	query<Row>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
	release(): void;
}
interface PoolLike {
	connect(): Promise<ClientLike>;
}

type DBVal = string | number | null;

function coerceSource(x: unknown): string | undefined {
	return typeof x === 'string' ? x : undefined;
}

export interface PgVectorConfig {
	connectionString?: string; // e.g. postgres://user:pass@localhost:5432/rag
	table?: string; // default 'rag_chunks'
	dimension?: number; // default 768; tests may use small dims
	hybrid?: {
		enabled: boolean;
		vectorWeight?: number; // 0..1, default 0.6
		language?: string; // 'english'
	};
}

/**
 * Minimal pgvector-backed store supporting vector-only or hybrid (FTS + vector) queries.
 * Schema (created if missing):
 *   id text primary key, text text, source text, updated_at bigint,
 *   metadata jsonb, search_vector tsvector,
 *   embedding_384 vector(384), embedding_768 vector(768), embedding_1024 vector(1024),
 *   embedding_1536 vector(1536), embedding_3072 vector(3072)
 */
export class PgVectorStore implements Store {
	private pool?: PoolLike;
	private readonly table: string;
	private readonly dim: number;
	private readonly hybrid?: NonNullable<PgVectorConfig['hybrid']>;
	private readonly connString: string;
	private readonly retryMax = 3;
	private readonly retryBaseMs = 100;

	constructor(cfg: PgVectorConfig) {
		const cs = cfg.connectionString ?? process.env.PG_URL ?? process.env.DATABASE_URL;
		if (!cs) throw new Error('PgVectorStore: missing connection string (PG_URL or DATABASE_URL).');
		this.connString = cs;
		this.table = cfg.table ?? 'rag_chunks';
		this.dim = cfg.dimension ?? 768;
		this.hybrid = cfg.hybrid?.enabled
			? {
					enabled: true,
					vectorWeight: cfg.hybrid.vectorWeight ?? 0.6,
					language: cfg.hybrid.language ?? 'english',
				}
			: undefined;
	}

	async init(): Promise<void> {
		if (!this.pool) {
			// Avoid Vite pre-bundling resolution errors when tests don't install optional deps
			const { Pool } = await import(/* @vite-ignore */ 'pg');
			this.pool = new Pool({ connectionString: this.connString }) as unknown as PoolLike;
		}
		const client = await this.pool.connect();
		try {
			await client.query('CREATE EXTENSION IF NOT EXISTS vector');
			await client.query(`CREATE TABLE IF NOT EXISTS ${this.table} (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source TEXT,
        updated_at BIGINT,
        metadata JSONB,
        search_vector tsvector,
        embedding_384 vector(384),
        embedding_768 vector(768),
        embedding_1024 vector(1024),
        embedding_1536 vector(1536),
        embedding_3072 vector(3072)
      )`);
			await client.query(
				`CREATE INDEX IF NOT EXISTS ${this.table}_sv_idx ON ${this.table} USING GIN (search_vector)`,
			);
			await client.query(
				`CREATE INDEX IF NOT EXISTS ${this.table}_emb_${this.dim}_idx ON ${this.table} USING ivfflat (embedding_${this.dim})`,
			);
		} finally {
			client.release();
		}
	}

	private embCol(): string {
		return `embedding_${this.dim}`;
	}

	private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
		let attempt = 0;
		let lastErr: unknown;
		const runId = generateRunId();
		while (attempt < this.retryMax) {
			try {
				const start = Date.now();
				const out = await fn();
				// metrics: latency + success
				const ms = Date.now() - start;
				recordLatency(label, ms, { component: 'rag', store: 'pgvector' });
				recordOperation(label, true, runId, { component: 'rag', store: 'pgvector' });
				return out;
			} catch (err) {
				lastErr = err;
				const delay = this.retryBaseMs * 2 ** attempt;
				// record failed attempt
				recordOperation(label, false, runId, {
					component: 'rag',
					store: 'pgvector',
					attempt: String(attempt + 1),
				});
				await new Promise((r) => setTimeout(r, delay));
				attempt++;
			}
		}
		throw lastErr;
	}

	// Deprecated: metrics shim removed in favor of @cortex-os/observability
	// private async recordTiming(_name: string, _ms: number): Promise<void> {}

	async health(): Promise<{ ok: boolean }> {
		if (!this.pool) return { ok: false };
		try {
			const client = await this.pool.connect();
			try {
				await client.query('SELECT 1');
				return { ok: true };
			} finally {
				client.release();
			}
		} catch {
			return { ok: false };
		}
	}

	async upsert(chunks: Chunk[]): Promise<void> {
		if (!this.pool) throw new Error('PgVectorStore not initialized. Call init() first.');
		await this.withRetry(async () => {
			const pool = this.pool;
			if (!pool) throw new Error('pool unavailable');
			const client = await pool.connect();
			try {
				const col = this.embCol();
				const lang = this.hybrid?.language ?? 'english';
				for (const c of chunks) {
					const emb = c.embedding ?? [];
					const text = c.text ?? '';
					const sv = `to_tsvector('${lang}', $3)`;
					const sql = `INSERT INTO ${this.table} (id, text, source, updated_at, metadata, search_vector, ${col})
                            VALUES ($1, $2, $4, $5, $6, ${sv}, $7)
                            ON CONFLICT (id) DO UPDATE SET text=EXCLUDED.text, source=EXCLUDED.source, updated_at=EXCLUDED.updated_at, metadata=EXCLUDED.metadata, search_vector=EXCLUDED.search_vector, ${col}=EXCLUDED.${col}`;
					await client.query(sql, [
						c.id,
						text,
						text,
						c.source ?? null,
						c.updatedAt ?? Date.now(),
						c.metadata ?? {},
						emb,
					]);
				}
			} finally {
				client.release();
			}
		}, 'pgvector.upsert');
	}

	async query(embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		if (this.hybrid?.enabled) return this.hybridQuery(embedding, k, undefined);
		if (!this.pool) throw new Error('PgVectorStore not initialized. Call init() first.');
		return this.withRetry(async () => {
			const pool = this.pool;
			if (!pool) throw new Error('pool unavailable');
			const client = await pool.connect();
			try {
				const col = this.embCol();
				const sql = `SELECT id, text, source, updated_at, metadata, 1 - ( ${col} <#> $1::vector ) AS score
                                             FROM ${this.table}
                                             WHERE ${col} IS NOT NULL
                                             ORDER BY ${col} <-> $1::vector ASC
                                             LIMIT $2`;
				interface RowV {
					id: string;
					text: string;
					source: unknown;
					updated_at: DBVal;
					metadata: unknown;
					score: number;
				}
				const res = await client.query<RowV>(sql, [embedding, k]);
				return res.rows.map((r) => {
					const src = coerceSource(r.source);
					const base: Chunk = {
						id: r.id,
						text: r.text,
						source: src,
						updatedAt: r.updated_at != null ? Number(r.updated_at) : undefined,
						metadata: (r.metadata as Record<string, unknown>) ?? {},
					};
					return { ...base, score: Number(r.score) || 0 } as Chunk & { score?: number };
				}) as Array<Chunk & { score?: number }>;
			} finally {
				client.release();
			}
		}, 'pgvector.query');
	}

	async queryWithText(
		embedding: number[],
		queryText: string,
		k = 5,
	): Promise<Array<Chunk & { score?: number }>> {
		if (!this.hybrid?.enabled) return this.query(embedding, k);
		return this.hybridQuery(embedding, k, queryText);
	}

	private async hybridQuery(
		embedding: number[],
		k: number,
		keyword: string | undefined,
	): Promise<Array<Chunk & { score?: number; matchType?: 'vector' | 'keyword' | 'hybrid' }>> {
		if (!this.pool) throw new Error('PgVectorStore not initialized. Call init() first.');
		const client = await this.pool.connect();
		try {
			const col = this.embCol();
			const weight = this.hybrid?.vectorWeight ?? 0.6;
			const sqlVector = `SELECT id, text, source, updated_at, metadata, 1 - ( ${col} <#> $1::vector ) AS vscore FROM ${this.table} WHERE ${col} IS NOT NULL ORDER BY ${col} <-> $1::vector ASC LIMIT $2`;
			const sqlKeyword = `SELECT id, text, source, updated_at, metadata, ts_rank(search_vector, plainto_tsquery($3)) AS kscore FROM ${this.table} WHERE search_vector @@ plainto_tsquery($3) ORDER BY kscore DESC LIMIT $2`;
			// Vector part
			interface RowVec {
				id: string;
				text: string;
				source: unknown;
				updated_at: DBVal;
				metadata: unknown;
				vscore: number;
			}
			const vres = await client.query<RowVec>(sqlVector, [embedding, k]);
			const vectorRows = vres.rows.map((r, i: number) => ({
				id: r.id,
				text: r.text,
				source: coerceSource(r.source),
				updatedAt: r.updated_at != null ? Number(r.updated_at) : undefined,
				metadata: (r.metadata as Record<string, unknown>) ?? {},
				vscore: Number(r.vscore) || 0,
				rank: i + 1,
			}));
			// Keyword part uses queryText if provided, else blank to avoid failure
			const kw = keyword ?? '';
			interface RowKey {
				id: string;
				text: string;
				source: unknown;
				updated_at: DBVal;
				metadata: unknown;
				kscore: number;
			}
			const kres = await client.query<RowKey>(sqlKeyword, [undefined, k, kw]);
			const keywordRows = kres.rows.map((r, i: number) => ({
				id: r.id,
				text: r.text,
				source: coerceSource(r.source),
				updatedAt: r.updated_at != null ? Number(r.updated_at) : undefined,
				metadata: (r.metadata as Record<string, unknown>) ?? {},
				kscore: Number(r.kscore) || 0,
				rank: i + 1,
			}));

			const byId = new Map<string, ReturnType<typeof Object>>();
			for (const v of vectorRows) {
				byId.set(v.id, { ...v, matchType: 'vector' as const });
			}
			for (const krow of keywordRows) {
				const existing = byId.get(krow.id);
				if (existing) {
					existing.kscore = krow.kscore;
					existing.matchType = 'hybrid';
				} else {
					byId.set(krow.id, { ...krow, matchType: 'keyword' as const });
				}
			}
			// Weighted fusion (fallback simple RRF-like)
			const fused = Array.from(byId.values()).map((r) => {
				const v = 1 / (60 + (r.rank ?? 1000));
				const ksc = 1 / (60 + (r.rank ?? 1000));
				const score = weight * (r.vscore ?? v) + (1 - weight) * (r.kscore ?? ksc);
				return {
					id: r.id,
					text: r.text,
					source: r.source,
					updatedAt: r.updatedAt,
					metadata: r.metadata,
					score,
					matchType: r.matchType,
				};
			});
			fused.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
			return fused.slice(0, k);
		} finally {
			client.release();
		}
	}
}
