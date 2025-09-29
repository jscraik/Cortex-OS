import type { Envelope } from '@cortex-os/protocol';

export interface HistoryRecord {
	id: string;
	sessionId: string;
	envelope: Envelope;
	createdAt: string;
}

export interface HistoryRange {
	from?: string;
	to?: string;
	limit?: number;
}

export interface Checkpoint {
	sessionId: string;
	payload: unknown;
	createdAt: string;
}

export interface HistoryStore {
	append(envelope: Envelope): Promise<void>;
	stream(sessionId: string, range?: HistoryRange): AsyncIterable<HistoryRecord>;
	checkpoint(sessionId: string, payload: unknown): Promise<void>;
	getCheckpoint(sessionId: string): Promise<Checkpoint | null>;
	close(): Promise<void>;
}

export interface SQLiteConfig {
	filename?: string;
	pragma?: string[];
	readonly?: boolean;
}

export interface FileConfig {
	root: string;
}

export interface PostgresConfig {
	client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
	schema?: string;
}
