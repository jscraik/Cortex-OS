import { isExpired } from "../core/ttl.js";
import type { Memory, MemoryId } from "../domain/types.js";
import type { MemoryStore, TextQuery, VectorQuery } from "../ports/MemoryStore.js";

// Attempt dynamic loading of native modules so the package can be imported even
// when SQLite bindings are unavailable (e.g., in environments without native
// compilation support).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DatabaseImpl: typeof import("better-sqlite3") | undefined;
let loadVec: typeof import("sqlite-vec")["load"] | undefined;
try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        DatabaseImpl = require("better-sqlite3");
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        ({ load: loadVec } = require("sqlite-vec"));
} catch {
        // Modules not available; constructor will throw if used
}

function padVector(vec: number[], dim: number): number[] {
        if (vec.length === dim) return vec;
        if (vec.length > dim) return vec.slice(0, dim);
        return vec.concat(Array(dim - vec.length).fill(0));
}

export class SQLiteStore implements MemoryStore {
        private db: any;
        private readonly dim: number;

        constructor(path: string, dimension?: number) {
                if (!DatabaseImpl || !loadVec) {
                        throw new Error("sqlite:unavailable");
                }
                this.db = new DatabaseImpl(path);
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
                this.db.exec("CREATE INDEX IF NOT EXISTS idx_kind ON memories(kind)");
                this.db.exec(
                        "CREATE INDEX IF NOT EXISTS idx_embeddingModel ON memories(embeddingModel)",
                );
        }

	async upsert(m: Memory): Promise<Memory> {
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
                const row = this.db.prepare("SELECT rowid FROM memories WHERE id = ?").get(m.id);
                if (row) {
                        if (m.vector) {
                                const padded = padVector(m.vector, this.dim);
                                const buffer = Buffer.from(
                                        new Float32Array(padded).buffer,
                                );
                                this.db
                                        .prepare(
                                                "INSERT OR REPLACE INTO memory_embeddings(rowid, embedding) VALUES (?, ?)",
                                        )
                                        .run(BigInt(row.rowid), buffer);
                        } else {
                                this.db.prepare("DELETE FROM memory_embeddings WHERE rowid = ?").run(BigInt(row.rowid));
                        }
                }

                return m;
        }

	async get(id: MemoryId): Promise<Memory | null> {
		const stmt = this.db.prepare("SELECT * FROM memories WHERE id = ?");
		const row = stmt.get(id);

		if (!row) return null;

		return this.rowToMemory(row);
	}

        async delete(id: MemoryId): Promise<void> {
                const row = this.db.prepare("SELECT rowid FROM memories WHERE id = ?").get(id);
                if (row) {
                        this.db.prepare("DELETE FROM memory_embeddings WHERE rowid = ?").run(BigInt(row.rowid));
                }
                this.db.prepare("DELETE FROM memories WHERE id = ?").run(id);
        }

	async searchByText(q: TextQuery): Promise<Memory[]> {
		let sql = "SELECT * FROM memories WHERE text IS NOT NULL";
		const params: any[] = [];

		if (q.text) {
			sql += " AND LOWER(text) LIKE LOWER(?)";
			params.push(`%${q.text}%`);
		}

		if (q.filterTags && q.filterTags.length > 0) {
			// For simplicity, we'll do a basic tag filter
			// A more sophisticated implementation would parse the JSON tags
			sql += " AND (";
			q.filterTags.forEach((tag, i) => {
				if (i > 0) sql += " OR ";
				sql += "tags LIKE ?";
				params.push(`%"${tag}"%`);
			});
			sql += ")";
		}

		// Fetch more candidates to allow reranking in a second stage
		const initialLimit = Math.max(q.topK * 10, q.topK);
		sql += " ORDER BY updatedAt DESC LIMIT ?";
		params.push(initialLimit);

		const stmt = this.db.prepare(sql);
		const rows = stmt.all(...params);
		const candidates = rows.map((row: any) => this.rowToMemory(row));

		// Optional rerank stage using Model Gateway if query text is present
		const rerankEnabled =
			(process.env.MEMORIES_RERANK_ENABLED || "true").toLowerCase() !== "false";
		const queryText = q.text?.trim();

		if (rerankEnabled && queryText && candidates.length > 1) {
			try {
				const top = await this.rerankWithModelGateway(queryText, candidates);
				return top.slice(0, q.topK);
			} catch {
				// Fall back to original ordering on any error
				return candidates.slice(0, q.topK);
			}
		}

		return candidates.slice(0, q.topK);
	}

        async searchByVector(q: VectorQuery): Promise<Memory[]> {
                const padded = padVector(q.vector, this.dim);
                let sql =
                        "SELECT m.*, v.distance FROM memory_embeddings v JOIN memories m ON m.rowid = v.rowid WHERE v.embedding MATCH ? AND k = ?";
                const initialLimit = Math.max(q.topK * 10, q.topK);
                const params: any[] = [JSON.stringify(padded), initialLimit];

                if (q.filterTags && q.filterTags.length > 0) {
                        sql += " AND (";
                        q.filterTags.forEach((tag, i) => {
                                if (i > 0) sql += " OR ";
                                sql += "m.tags LIKE ?";
                                params.push(`%"${tag}"%`);
                        });
                        sql += ")";
                }

                sql += " ORDER BY v.distance";

                const rows = this.db.prepare(sql).all(...params);
                const candidates = rows.map((row: any) => this.rowToMemory(row));

                let results = candidates.slice(0, q.topK);

                const rerankEnabled =
                        (process.env.MEMORIES_RERANK_ENABLED || "true").toLowerCase() !== "false";
                if (rerankEnabled && q.queryText && candidates.length > 1) {
                        try {
                                const start = Date.now();
                                const reranked = await this.rerankWithModelGateway(
                                        q.queryText,
                                        candidates,
                                );
                                const latency = Date.now() - start;
                                await this.writeOutboxEvent({
                                        type: "rerank.completed",
                                        data: {
                                                strategy: "vec0+mlxr",
                                                totalCandidates: candidates.length,
                                                returned: q.topK,
                                                latencyMs: latency,
                                                timestamp: new Date().toISOString(),
                                        },
                                });
                                results = reranked.slice(0, q.topK);
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
		const gatewayUrl = process.env.MODEL_GATEWAY_URL || "http://localhost:8081";
		const endpoint = `${gatewayUrl.replace(/\/$/, "")}/rerank`;
		const documents = docs.map((d) => d.text || "");
		const res = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
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
			type: "rerank.completed",
			data: {
				model: scored[0]?.model || "unknown",
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
				process.env.MEMORIES_OUTBOX_FILE || "logs/memories-outbox.jsonl";
			// Lazy import to avoid ESM top-level overhead
			const fs = await import("node:fs/promises");
			await fs.mkdir(file.split("/").slice(0, -1).join("/"), {
				recursive: true,
			});
			await fs.appendFile(file, `${JSON.stringify(event)}\n`, {
				encoding: "utf8",
			});
		} catch {
			// best-effort only
		}
	}

        async purgeExpired(nowISO: string): Promise<number> {
                let purgedCount = 0;

                const stmt = this.db.prepare("SELECT rowid, * FROM memories WHERE ttl IS NOT NULL");
                const rows = stmt.all();

                const expiredIds: string[] = [];
                const expiredRowids: number[] = [];
                for (const row of rows) {
                        const memory = this.rowToMemory(row);
                        if (memory.ttl && isExpired(memory.createdAt, memory.ttl, nowISO)) {
                                expiredIds.push(memory.id);
                                expiredRowids.push(row.rowid as number);
                        }
                }

                if (expiredIds.length > 0) {
                        const placeholders = expiredIds.map(() => "?").join(",");
                        this.db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`).run(...expiredIds);
                        const rowPlaceholders = expiredRowids.map(() => "?").join(",");
                        this.db
                                .prepare(`DELETE FROM memory_embeddings WHERE rowid IN (${rowPlaceholders})`)
                                .run(...expiredRowids);
                        purgedCount = expiredIds.length;
                }

                return purgedCount;
        }

        private rowToMemory(row: any): Memory {
                return {
                        id: row.id,
                        kind: row.kind,
                        text: row.text ?? undefined,
                        vector: row.vector ? JSON.parse(row.vector) : undefined,
                        tags: row.tags ? JSON.parse(row.tags) : [],
                        ttl: row.ttl ?? undefined,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        provenance: row.provenance
                                ? JSON.parse(row.provenance)
                                : { source: "unknown" },
                        policy: row.policy ? JSON.parse(row.policy) : undefined,
                        embeddingModel: row.embeddingModel ?? undefined,
                };
        }
}
