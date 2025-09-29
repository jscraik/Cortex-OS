import { EnvelopeSchema } from '@cortex-os/protocol';
import type { Envelope } from '@cortex-os/protocol';
import type { HistoryRange, HistoryRecord, HistoryStore, PostgresConfig } from '../types.js';

const DEFAULT_SCHEMA = 'public';

const table = (schema: string, name: string): string => `${schema}.${name}`;

export class PostgresHistoryStore implements HistoryStore {
	private readonly schema: string;

	public constructor(private readonly config: PostgresConfig) {
		this.schema = config.schema ?? DEFAULT_SCHEMA;
	}

	public async append(envelope: Envelope): Promise<void> {
		const parsed = EnvelopeSchema.parse(envelope);
		await this.config.client.query(
			`INSERT INTO ${table(this.schema, 'history_events')} (id, session_id, occurred_at, envelope)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (id) DO NOTHING`,
			[parsed.id, parsed.sessionId ?? 'unknown', parsed.occurredAt, JSON.stringify(parsed)],
		);
	}

	public async *stream(sessionId: string, range?: HistoryRange): AsyncIterable<HistoryRecord> {
		const result = await this.config.client.query(
			`SELECT id, session_id, occurred_at, envelope
			 FROM ${table(this.schema, 'history_events')}
			 WHERE session_id = $1
			   AND occurred_at >= COALESCE($2, occurred_at)
			   AND occurred_at <= COALESCE($3, occurred_at)
			 ORDER BY occurred_at ASC
			 LIMIT COALESCE($4, NULL)`,
			[sessionId, range?.from ?? null, range?.to ?? null, range?.limit ?? null],
		);
		for (const row of result.rows) {
			yield {
				id: String((row as Record<string, unknown>).id),
				sessionId: String((row as Record<string, unknown>).session_id),
				envelope: JSON.parse(String((row as Record<string, unknown>).envelope)) as Envelope,
				createdAt: String((row as Record<string, unknown>).occurred_at),
			};
		}
	}

	public async checkpoint(sessionId: string, payload: unknown): Promise<void> {
		await this.config.client.query(
			`INSERT INTO ${table(this.schema, 'history_checkpoints')} (session_id, payload, created_at)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (session_id) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at`,
			[sessionId, JSON.stringify(payload ?? null), new Date().toISOString()],
		);
	}

	public async getCheckpoint(sessionId: string) {
		const result = await this.config.client.query(
			`SELECT session_id, payload, created_at
			 FROM ${table(this.schema, 'history_checkpoints')}
			 WHERE session_id = $1`,
			[sessionId],
		);
		const row = result.rows[0] as Record<string, unknown> | undefined;
		if (!row) {
			return null;
		}
		return {
			sessionId: String(row.session_id),
			payload: JSON.parse(String(row.payload)),
			createdAt: String(row.created_at),
		};
	}

	public async close(): Promise<void> {}
}
