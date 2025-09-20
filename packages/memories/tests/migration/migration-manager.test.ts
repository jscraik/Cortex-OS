import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefaultMigrationManager } from '../../src/service/migration-service.js';
import { InMemoryMetadataStore } from '../../src/adapters/metadata.in-memory.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import type { Migration } from '../../src/domain/migration.js';
import { MigrationError } from '../../src/domain/migration.js';

describe('MigrationManager', () => {
	let migrationManager: DefaultMigrationManager;
	let metadataStore: InMemoryMetadataStore;
	let store: InMemoryStore;

	beforeEach(() => {
		store = new InMemoryStore();
		metadataStore = new InMemoryMetadataStore();
		migrationManager = new DefaultMigrationManager(store, metadataStore);
	});

	afterEach(() => {
		metadataStore.clear();
	});

	describe('Version Management', () => {
		it('should return default version when no version is set', async () => {
			const version = await migrationManager.getCurrentVersion();
			expect(version).toBe('1.0.0');
		});

		it('should get available migrations', () => {
			const migrations = migrationManager.getAvailableMigrations();
			expect(Array.isArray(migrations)).toBe(true);
		});
	});

	describe('Migration Execution', () => {
		it('should apply migrations in correct order', async () => {
			const migration1: Migration = {
				version: '1.1.0',
				description: 'Test migration 1',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			const migration2: Migration = {
				version: '1.2.0',
				description: 'Test migration 2',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			migrationManager.registerMigration(migration2);
			migrationManager.registerMigration(migration1);

			const result = await migrationManager.migrate('1.2.0');

			expect(result.success).toBe(true);
			expect(result.fromVersion).toBe('1.0.0');
			expect(result.toVersion).toBe('1.2.0');
			expect(result.migrationsApplied).toEqual(['1.1.0', '1.2.0']);
		});

		it('should skip already applied migrations', async () => {
			const migration: Migration = {
				version: '1.1.0',
				description: 'Test migration',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			migrationManager.registerMigration(migration);

			// Apply migration once
			await migrationManager.migrate('1.1.0');

			// Try to apply again
			const result = await migrationManager.migrate('1.1.0');

			expect(result.success).toBe(true);
			expect(result.migrationsApplied).toHaveLength(0);
		});

		it('should rollback migrations on failure', async () => {
			const migration1: Migration = {
				version: '1.1.0',
				description: 'Test migration 1',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			const migration2: Migration = {
				version: '1.2.0',
				description: 'Test migration 2 (fails)',
				up: async () => { throw new Error('Migration failed'); },
				down: async () => { /* test */ }
			};

			migrationManager.registerMigration(migration1);
			migrationManager.registerMigration(migration2);

			const result = await migrationManager.migrate('1.2.0');

			expect(result.success).toBe(false);
			expect(result.migrationsApplied).toEqual(['1.1.0']);
			expect(result.errors).toHaveLength(2);
			expect(result.errors![0]).toContain('Rollback failed');
			expect(result.errors![1]).toContain('Migration failed');
		});

		it('should validate migrations before applying', async () => {
			const migration: Migration = {
				version: '1.1.0',
				description: 'Test migration',
				up: async () => { /* test */ },
				down: async () => { /* test */ },
				validate: async () => false
			};

			migrationManager.registerMigration(migration);

			const result = await migrationManager.migrate('1.1.0');

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors![0]).toContain('validation failed');
		});
	});

	describe('Rollback', () => {
		it('should rollback migrations successfully', async () => {
			const migration1: Migration = {
				version: '1.1.0',
				description: 'Test migration 1',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			const migration2: Migration = {
				version: '1.2.0',
				description: 'Test migration 2',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			migrationManager.registerMigration(migration1);
			migrationManager.registerMigration(migration2);

			// Apply migrations
			await migrationManager.migrate('1.2.0');

			// Rollback to 1.1.0
			const result = await migrationManager.rollback('1.1.0');

			expect(result.success).toBe(true);
			expect(result.fromVersion).toBe('1.2.0');
			expect(result.toVersion).toBe('1.1.0');
			expect(result.migrationsApplied).toEqual(['1.2.0']);
		});
	});

	describe('Schema Validation', () => {
		it('should validate memory schema', async () => {
			const memory = {
				id: 'test',
				kind: 'document',
				text: 'Test content',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const validation = await migrationManager.validateSchema(memory);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it('should detect invalid embedding format', async () => {
			const memory = {
				id: 'test',
				kind: 'document',
				text: 'Test content',
				embedding: 'invalid' as any, // Should be number[]
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Set version to 2.0.0 to trigger embedding validation
			await metadataStore.set('schema_version', '2.0.0');

			const validation = await migrationManager.validateSchema(memory);

			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('Embedding must be an array of numbers');
		});

		it('should generate warnings for missing embeddings', async () => {
			const memory = {
				id: 'test',
				kind: 'document',
				text: 'Test content',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Set version to 2.0.0
			await metadataStore.set('schema_version', '2.0.0');

			const validation = await migrationManager.validateSchema(memory);

			expect(validation.valid).toBe(true);
			expect(validation.warnings).toContain('Document memories should have embeddings for optimal search performance');
		});
	});

	describe('Migration History', () => {
		it('should track migration history', async () => {
			const migration: Migration = {
				version: '1.1.0',
				description: 'Test migration',
				up: async () => { /* test */ },
				down: async () => { /* test */ }
			};

			migrationManager.registerMigration(migration);

			await migrationManager.migrate('1.1.0');

			const history = await migrationManager.getMigrationHistory();

			expect(history).toHaveLength(1);
			expect(history[0].version).toBe('1.1.0');
			expect(history[0].direction).toBe('up');
			expect(history[0].success).toBe(true);
		});
	});
});