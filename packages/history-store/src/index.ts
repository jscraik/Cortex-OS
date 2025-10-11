import { createFileHistoryStore } from './adapters/file.js';
import { PostgresHistoryStore } from './adapters/postgres.js';
import { createSqliteHistoryStore } from './adapters/sqlite.js';
import type { FileConfig, HistoryStore, PostgresConfig, SQLiteConfig } from './types.js';

export { createFileHistoryStore } from './adapters/file.js';
export { PostgresHistoryStore } from './adapters/postgres.js';
export { createSqliteHistoryStore } from './adapters/sqlite.js';
export type {
	Checkpoint,
	FileConfig,
	HistoryRange,
	HistoryRecord,
	HistoryStore,
	PostgresConfig,
	SQLiteConfig,
} from './types.js';

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
