import type { MigrationManager } from '../domain/migration.js';
import { SchemaValidationError } from '../domain/migration.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export class VersionedMemoryStore implements MemoryStore {
	constructor(
		private readonly store: MemoryStore,
		private readonly migrationManager: MigrationManager,
	) {}

	async initialize(): Promise<void> {
		const currentVersion = await this.migrationManager.getCurrentVersion();
		const latestVersion = this.getLatestVersion();

		if (currentVersion !== latestVersion) {
			console.log(`Migrating from ${currentVersion} to ${latestVersion}`);
			await this.migrationManager.migrate(latestVersion);
		}
	}

	async upsert(memory: Memory, namespace?: string): Promise<Memory> {
		// Validate against current schema
		const validation = await this.migrationManager.validateSchema(memory);
		if (!validation.valid) {
			throw new SchemaValidationError(validation.errors, memory);
		}

		// Add version metadata
		const currentVersion = await this.migrationManager.getCurrentVersion();
		const versionedMemory = {
			...memory,
			metadata: {
				...memory.metadata,
				schemaVersion: currentVersion,
				validatedAt: new Date().toISOString(),
			},
		};

		return this.store.upsert(versionedMemory, namespace);
	}

	async get(id: string, namespace?: string): Promise<Memory | null> {
		return this.store.get(id, namespace);
	}

	async delete(id: string, namespace?: string): Promise<void> {
		return this.store.delete(id, namespace);
	}

	async searchByText(q: TextQuery, namespace?: string): Promise<Memory[]> {
		return this.store.searchByText(q, namespace);
	}

	async searchByVector(
		q: VectorQuery,
		namespace?: string,
	): Promise<(Memory & { score: number })[]> {
		return this.store.searchByVector(q, namespace);
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.store.purgeExpired(nowISO, namespace);
	}

	private getLatestVersion(): string {
		// Get the latest migration version
		return this.migrationManager.getAvailableMigrations().slice(-1)[0]?.version || '2.0.0';
	}
}
