import type {
	Migration,
	MigrationHistory,
	MigrationManager,
	MigrationResult,
	SchemaVersion,
	ValidationResult,
} from '../domain/migration.js';
import { MigrationError } from '../domain/migration.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export class DefaultMigrationManager implements MigrationManager {
	private readonly logger = {
		info: (message: string, context?: any) =>
			console.log(`[MigrationManager] ${message}`, context || ''),
		warn: (message: string, context?: any) =>
			console.warn(`[MigrationManager] ${message}`, context || ''),
		error: (message: string, context?: any) =>
			console.error(`[MigrationManager] ${message}`, context || ''),
	};
	private readonly migrations: Migration[] = [];
	private readonly schemaVersions: SchemaVersion[] = [
		{
			version: '1.0.0',
			description: 'Initial schema',
			releaseDate: '2024-01-01',
			minCompatibleVersion: '1.0.0',
			maxCompatibleVersion: '1.0.0',
			changes: [],
		},
		{
			version: '2.0.0',
			description: 'Added embedding vector support',
			releaseDate: '2024-06-01',
			minCompatibleVersion: '1.0.0',
			maxCompatibleVersion: '2.0.0',
			changes: [
				{
					type: 'add',
					field: 'embedding',
					description: 'Added vector embedding field for semantic search',
					migrationRequired: true,
					breakingChange: false,
				},
			],
		},
	];

	constructor(
		private readonly store: MemoryStore,
		private readonly metadataStore: MetadataStore,
	) {}

	registerMigration(migration: Migration): void {
		this.migrations.push(migration);
		this.migrations.sort((a, b) =>
			a.version.localeCompare(b.version, undefined, { numeric: true, sensitivity: 'base' }),
		);
	}

	async getCurrentVersion(): Promise<string> {
		return this.metadataStore.get('schema_version', '1.0.0');
	}

	getAvailableMigrations(): Migration[] {
		return [...this.migrations];
	}

	async migrate(targetVersion?: string): Promise<MigrationResult> {
		const startTime = Date.now();
		const currentVersion = await this.getCurrentVersion();
		const target = targetVersion || this.getLatestVersion();

		this.logger.info('Starting migration', { from: currentVersion, to: target });

		const migrationsToApply = this.getMigrationsToApply(currentVersion, target);
		const errors: string[] = [];
		const appliedMigrations: string[] = [];

		try {
			for (const migration of migrationsToApply) {
				this.logger.info('Applying migration', { version: migration.version });

				// Validate migration if validation function provided
				if (migration.validate) {
					const isValid = await migration.validate();
					if (!isValid) {
						throw new MigrationError(
							`Migration validation failed for version ${migration.version}`,
							'VALIDATION_FAILED',
							migration.version,
						);
					}
				}

				// Apply migration
				await migration.up(this.store);

				// Record migration
				await this.recordMigration(migration, 'up');
				await this.metadataStore.set('schema_version', migration.version);

				appliedMigrations.push(migration.version);
				this.logger.info('Migration applied successfully', { version: migration.version });
			}

			return {
				success: true,
				fromVersion: currentVersion,
				toVersion: target,
				migrationsApplied: appliedMigrations,
				duration: Date.now() - startTime,
			};
		} catch (error) {
			this.logger.error('Migration failed', {
				error,
				failedVersion: migrationsToApply.find((m) => !appliedMigrations.includes(m.version))
					?.version,
			});

			// Attempt rollback
			try {
				// Get the actual migration objects for rollback
				const migrationObjectsToRollback = migrationsToApply.filter((m) =>
					appliedMigrations.includes(m.version),
				);
				await this.rollbackMigrations(migrationObjectsToRollback);
			} catch (rollbackError) {
				this.logger.error('Rollback failed', { error: rollbackError });
				errors.push(
					`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
				);
			}

			return {
				success: false,
				fromVersion: currentVersion,
				toVersion: target,
				migrationsApplied: appliedMigrations,
				errors: [...errors, error instanceof Error ? error.message : String(error)],
				duration: Date.now() - startTime,
			};
		}
	}

	async rollback(toVersion: string): Promise<MigrationResult> {
		const startTime = Date.now();
		const currentVersion = await this.getCurrentVersion();

		this.logger.info('Starting rollback', { from: currentVersion, to: toVersion });

		const migrationsToRollback = this.getMigrationsToRollback(currentVersion, toVersion);
		const _errors: string[] = [];
		const rolledBackMigrations: string[] = [];

		try {
			for (const migration of migrationsToRollback.reverse()) {
				this.logger.info('Rolling back migration', { version: migration.version });

				await migration.down(this.store);
				await this.recordMigration(migration, 'down');
				await this.metadataStore.set(
					'schema_version',
					migrationsToRollback[migrationsToRollback.indexOf(migration) - 1]?.version || '1.0.0',
				);

				rolledBackMigrations.push(migration.version);
			}

			return {
				success: true,
				fromVersion: currentVersion,
				toVersion: toVersion,
				migrationsApplied: rolledBackMigrations,
				duration: Date.now() - startTime,
			};
		} catch (error) {
			this.logger.error('Rollback failed', { error });
			return {
				success: false,
				fromVersion: currentVersion,
				toVersion: toVersion,
				migrationsApplied: rolledBackMigrations,
				errors: [error instanceof Error ? error.message : String(error)],
				duration: Date.now() - startTime,
			};
		}
	}

	async validateSchema(memory: Memory): Promise<ValidationResult> {
		const currentVersion = await this.getCurrentVersion();
		const schemaVersion = this.schemaVersions.find((v) => v.version === currentVersion);

		if (!schemaVersion) {
			return {
				valid: false,
				errors: [`Unknown schema version: ${currentVersion}`],
				warnings: [],
			};
		}

		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate memory against schema version
		if (currentVersion >= '2.0.0' && memory.embedding && !Array.isArray(memory.embedding)) {
			errors.push('Embedding must be an array of numbers');
		}

		// Check for required fields based on version
		if (currentVersion >= '2.0.0' && memory.kind === 'document' && !memory.embedding) {
			warnings.push('Document memories should have embeddings for optimal search performance');
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	async getMigrationHistory(): Promise<MigrationHistory[]> {
		return this.metadataStore.getMigrationHistory();
	}

	private getLatestVersion(): string {
		return this.schemaVersions[this.schemaVersions.length - 1].version;
	}

	private getMigrationsToApply(fromVersion: string, toVersion: string): Migration[] {
		return this.migrations.filter((m) => m.version > fromVersion && m.version <= toVersion);
	}

	private getMigrationsToRollback(fromVersion: string, toVersion: string): Migration[] {
		return this.migrations.filter((m) => m.version > toVersion && m.version <= fromVersion);
	}

	private async rollbackMigrations(migrations: Migration[]): Promise<void> {
		for (const migration of migrations.reverse()) {
			try {
				await migration.down(this.store);
				this.logger.info('Rollback successful', { version: migration.version });
			} catch (error) {
				this.logger.error('Rollback failed for migration', { version: migration.version, error });
				throw error;
			}
		}
	}

	private async recordMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
		const historyEntry: MigrationHistory = {
			id: `${migration.version}-${Date.now()}`,
			version: migration.version,
			description: migration.description,
			direction,
			timestamp: new Date().toISOString(),
			duration: 0, // TODO: Track actual duration
			success: true,
		};

		await this.metadataStore.addMigrationHistory(historyEntry);
	}
}

export interface MetadataStore {
	get(key: string, defaultValue?: string): Promise<string>;
	set(key: string, value: string): Promise<void>;
	addMigrationHistory(history: MigrationHistory): Promise<void>;
	getMigrationHistory(): Promise<MigrationHistory[]>;
}
