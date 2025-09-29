import Database from 'better-sqlite3';
import { EnvelopeSchema } from '@cortex-os/protocol';
import type { Envelope } from '@cortex-os/protocol';
import type { HistoryRange, HistoryRecord, HistoryStore, SQLiteConfig } from '../types.js';

const CREATE_EVENTS = `
CREATE TABLE IF NOT EXISTS history_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    envelope TEXT NOT NULL
);
`;

const CREATE_CHECKPOINTS = `
CREATE TABLE IF NOT EXISTS history_checkpoints (
    session_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);
`;

const SELECT_RANGE = `
SELECT id, session_id, occurred_at, envelope
FROM history_events
WHERE session_id = ?
  AND occurred_at >= COALESCE(?, occurred_at)
  AND occurred_at <= COALESCE(?, occurred_at)
ORDER BY occurred_at ASC
LIMIT COALESCE(?, -1);
`;

const INSERT_EVENT = `
INSERT INTO history_events (id, session_id, occurred_at, envelope)
VALUES (?, ?, ?, ?);
`;

const UPSERT_CHECKPOINT = `
INSERT INTO history_checkpoints (session_id, payload, created_at)
VALUES (?, ?, ?)
ON CONFLICT(session_id) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at;
`;

const SELECT_CHECKPOINT = `
SELECT session_id, payload, created_at
FROM history_checkpoints
WHERE session_id = ?;
`;

class SqliteHistoryStore implements HistoryStore {
	private readonly db: Database.Database;
	private readonly insertEvent: Database.Statement;
	private readonly readRange: Database.Statement;
	private readonly upsertCheckpoint: Database.Statement;
	private readonly getCheckpointStmt: Database.Statement;

	public constructor(config: SQLiteConfig = {}) {
		this.db = new Database(config.filename ?? ':memory:', { readonly: config.readonly ?? false });
		for (const pragma of config.pragma ?? ['journal_mode = WAL', 'synchronous = NORMAL']) {
			this.db.pragma(pragma);
		}
		this.db.exec(CREATE_EVENTS);
		this.db.exec(CREATE_CHECKPOINTS);
		this.insertEvent = this.db.prepare(INSERT_EVENT);
		this.readRange = this.db.prepare(SELECT_RANGE);
		this.upsertCheckpoint = this.db.prepare(UPSERT_CHECKPOINT);
		this.getCheckpointStmt = this.db.prepare(SELECT_CHECKPOINT);
	}

	public async append(envelope: Envelope): Promise<void> {
		const parsed = EnvelopeSchema.parse(envelope);
		this.insertEvent.run(parsed.id, parsed.sessionId ?? 'unknown', parsed.occurredAt, JSON.stringify(parsed));
	}

	public async *stream(sessionId: string, range?: HistoryRange): AsyncIterable<HistoryRecord> {
		const rows = this.readRange.all(sessionId, range?.from ?? null, range?.to ?? null, range?.limit ?? null);
		for (const row of rows) {
			yield {
				id: String(row.id),
				sessionId: String(row.session_id),
				envelope: JSON.parse(String(row.envelope)) as Envelope,
				createdAt: String(row.occurred_at),
			};
		}
	}

	public async checkpoint(sessionId: string, payload: unknown): Promise<void> {
		this.upsertCheckpoint.run(sessionId, JSON.stringify(payload ?? null), new Date().toISOString());
	}

	public async getCheckpoint(sessionId: string) {
		const row = this.getCheckpointStmt.get(sessionId);
		if (!row) {
			return null;
		}
		return {
			sessionId: String(row.session_id),
			payload: JSON.parse(String(row.payload)),
			createdAt: String(row.created_at),
		};
	}

	public async close(): Promise<void> {
		this.db.close();
	}
}

export const createSqliteHistoryStore = (config?: SQLiteConfig): HistoryStore => new SqliteHistoryStore(config);
