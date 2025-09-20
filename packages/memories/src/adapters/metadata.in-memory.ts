import type { MigrationHistory } from '../domain/migration.js';
import type { MetadataStore } from '../service/migration-service.js';

export class InMemoryMetadataStore implements MetadataStore {
	private readonly data = new Map<string, string>();
	private readonly history: MigrationHistory[] = [];

	async get(key: string, defaultValue?: string): Promise<string> {
		return this.data.get(key) || defaultValue || '';
	}

	async set(key: string, value: string): Promise<void> {
		this.data.set(key, value);
	}

	async addMigrationHistory(history: MigrationHistory): Promise<void> {
		this.history.push(history);
	}

	async getMigrationHistory(): Promise<MigrationHistory[]> {
		return [...this.history].sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
	}

	clear(): void {
		this.data.clear();
		this.history.length = 0;
	}
}
