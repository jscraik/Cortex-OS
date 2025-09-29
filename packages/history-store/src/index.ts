import type { HistoryStore, SQLiteConfig, FileConfig, PostgresConfig } from './types.js';
export type {
	HistoryStore,
	HistoryRecord,
	HistoryRange,
	Checkpoint,
	SQLiteConfig,
	FileConfig,
	PostgresConfig,
} from './types.js';
export { createSqliteHistoryStore } from './adapters/sqlite.js';
export { createFileHistoryStore } from './adapters/file.js';
export { PostgresHistoryStore } from './adapters/postgres.js';

export type HistoryStoreConfig =
	| { kind: 'sqlite'; config?: SQLiteConfig }
	| { kind: 'file'; config: FileConfig }
	| { kind: 'postgres'; config: PostgresConfig };

export const createHistoryStore = (config: HistoryStoreConfig): HistoryStore => {
	if (config.kind === 'sqlite') {
		return createSqliteHistoryStore(config.config);
	}
	if (config.kind === 'file') {
		return createFileHistoryStore(config.config);
	}
	return new PostgresHistoryStore(config.config);
};
