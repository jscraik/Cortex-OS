import type { Database } from 'better-sqlite3';
import type { Memory } from '../domain/types.js';

export interface HybridSearchOptions {
	textQuery?: string;
	vectorQuery?: number[];
	alpha?: number; // Weight for text vs vector (0-1, where 1 is text-only)
	limit?: number;
	namespace?: string;
	kind?: string;
	threshold?: number;
	recencyBoost?: boolean;
	recencyHalfLife?: number; // Half-life in milliseconds
}

export interface SearchResult extends Memory {
	score?: number;
	textScore?: number;
	vectorScore?: number;
}

export class HybridSearch {
	private readonly db: Database;

	constructor(db: Database) {
		this.db = db;

		// Initialize FTS5 table if not exists
		this.initializeFTS();
	}

	private initializeFTS() {
		// Check if FTS table exists
		const tableExists = this.db
			.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='memories_fts'
    `)
			.get() as { name: string } | undefined;

		if (!tableExists) {
			this.db.exec(`
        CREATE VIRTUAL TABLE memories_fts USING fts5(
          id,
          text,
          content='memories',
          content_rowid='rowid'
        );

        -- Triggers to keep FTS in sync
        CREATE TRIGGER memories_fts_insert AFTER INSERT ON memories BEGIN
          INSERT INTO memories_fts (id, text)
          VALUES (new.id, new.text);
        END;

        CREATE TRIGGER memories_fts_delete AFTER DELETE ON memories BEGIN
          DELETE FROM memories_fts WHERE id = old.id;
        END;

        CREATE TRIGGER memories_fts_update AFTER UPDATE ON memories BEGIN
          DELETE FROM memories_fts WHERE id = old.id;
          INSERT INTO memories_fts (id, text)
          VALUES (new.id, new.text);
        END;
      `);
		}
	}

	async search(options: HybridSearchOptions): Promise<SearchResult[]> {
		const {
			textQuery,
			vectorQuery,
			alpha = 0.5,
			limit = 10,
			kind,
			threshold = 0.1,
			recencyBoost = false,
			recencyHalfLife = 24 * 60 * 60 * 1000, // 24 hours
		} = options;

		if (!textQuery && !vectorQuery) {
			throw new Error('Either textQuery or vectorQuery must be provided');
		}

		// Filters (kind) will be applied post-fetch since Memory doesn't include namespace

		// Perform text search if provided
		let textResults: Array<{ id: string; textRank: number }> = [];
		if (textQuery) {
			textResults = this.db
				.prepare(`
        SELECT id, rank as textRank
        FROM memories_fts
        WHERE memories_fts.text MATCH ?
        ORDER BY rank
      `)
				.all(textQuery) as Array<{ id: string; textRank: number }>;
		}

		// Perform vector search if provided
		let vectorResults: Array<{ id: string; score: number }> = [];
		if (vectorQuery) {
			const queryVec = JSON.stringify(vectorQuery);
			const vectorDistances = this.db
				.prepare(`
        SELECT
          m.id,
          vec_distance_l2(e.embedding, ?) as distance
        FROM memories m
        LEFT JOIN memory_embeddings e ON m.id = e.id
        WHERE e.embedding IS NOT NULL
        ORDER BY distance
      `)
				.all(queryVec) as Array<{ id: string; distance: number }>;

			// Convert distance to similarity score (lower distance = higher similarity)
			vectorResults = vectorDistances
				.map((r) => ({ id: r.id, score: Math.max(0, 1 - r.distance) }))
				.filter((r) => r.score >= threshold);
		}

		// Combine results
		const combinedResults = new Map<string, SearchResult>();

		// Add text results
		for (const result of textResults) {
			const memory = this.getMemoryById(result.id);
			if (memory) {
				combinedResults.set(result.id, {
					...memory,
					textScore: 1 / (result.textRank + 1), // Convert rank to score
					score: (1 - alpha) * (1 / (result.textRank + 1)),
				});
			}
		}

		// Add/merge vector results
		for (const result of vectorResults) {
			const existing = combinedResults.get(result.id);
			const memory = existing || this.getMemoryById(result.id);

			if (memory) {
				const finalScore = existing
					? alpha * result.score + (1 - alpha) * (existing.textScore || 0)
					: alpha * result.score;

				combinedResults.set(result.id, {
					...memory,
					vectorScore: result.score,
					textScore: existing?.textScore,
					score: finalScore,
				});
			}
		}

		// Apply filters and ordering
		let results = Array.from(combinedResults.values())
			.filter((r) => (r.score ?? 0) >= threshold)
			.filter((r) => (kind ? r.kind === kind : true));

		// Apply recency boost if enabled
		if (recencyBoost) {
			const now = Date.now();
			results = results.map((r) => {
				const age = now - new Date(r.createdAt).getTime();
				const decay = 0.5 ** (age / recencyHalfLife);
				return {
					...r,
					score: (r.score ?? 0) * (1 + 0.5 * decay), // Boost up to 50% for recent items
				};
			});
		}

		// Sort by score and limit
		const sorted = [...results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
		return sorted.slice(0, limit);
	}

	private getMemoryById(id: string): Memory | null {
		type Row = {
			id: string;
			kind: Memory['kind'];
			text: string | null;
			vector: string | null;
			tags: string | null;
			ttl: string | null;
			createdAt: string;
			updatedAt: string;
			provenance: string | null;
			policy: string | null;
			embeddingModel: string | null;
		};
		const row = this.db
			.prepare(`
      SELECT
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
        embeddingModel
      FROM memories
      WHERE id = ?
    `)
			.get(id) as Row | undefined;

		if (!row) return null;

		return {
			id: row.id,
			kind: row.kind,
			text: row.text || undefined,
			vector: row.vector ? JSON.parse(row.vector) : undefined,
			tags: row.tags ? JSON.parse(row.tags) : [],
			ttl: row.ttl || undefined,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			provenance: row.provenance ? JSON.parse(row.provenance) : undefined,
			policy: row.policy ? JSON.parse(row.policy) : undefined,
			embeddingModel: row.embeddingModel || undefined,
		};
	}

	// Method to update FTS index when memories are added/updated
	updateFTSIndex(): void {
		// This is handled by triggers, but we can add manual sync if needed
	}
}
