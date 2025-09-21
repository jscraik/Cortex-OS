import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMetadataStore } from '../../src/adapters/metadata.in-memory.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { VersionedMemoryStore } from '../../src/adapters/store.versioned.js';
import type { Migration } from '../../src/domain/migration.js';
import { SchemaValidationError } from '../../src/domain/migration.js';
import { DefaultMigrationManager } from '../../src/service/migration-service.js';

describe('VersionedMemoryStore', () => {
	let versionedStore: VersionedMemoryStore;
	let store: InMemoryStore;
	let migrationManager: DefaultMigrationManager;
	let metadataStore: InMemoryMetadataStore;

	beforeEach(() => {
		store = new InMemoryStore();
		metadataStore = new InMemoryMetadataStore();
		migrationManager = new DefaultMigrationManager(store, metadataStore);
		versionedStore = new VersionedMemoryStore(store, migrationManager);
	});

	describe('Initialization', () => {
		it('should initialize without errors', async () => {
			await expect(versionedStore.initialize()).resolves.not.toThrow();
		});

		it('should auto-migrate if version mismatch', async () => {
			// Set an old version
			await metadataStore.set('schema_version', '1.0.0');

			// Register a migration
			const migration: Migration = {
				version: '2.0.0',
				description: 'Test migration',
				up: async () => {
					/* test */
				},
				down: async () => {
					/* test */
				},
			};
			migrationManager.registerMigration(migration);

			await versionedStore.initialize();

			const currentVersion = await migrationManager.getCurrentVersion();
			expect(currentVersion).toBe('2.0.0');
		});
	});

	describe('Memory Operations', () => {
		it('should store memory with version metadata', async () => {
			// Register a migration
			const migration = {
				version: '2.0.0',
				description: 'Test migration',
				up: async () => {
					/* test */
				},
				down: async () => {
					/* test */
				},
			};
			migrationManager.registerMigration(migration);

			const memory = {
				id: 'test',
				kind: 'document' as const,
				text: 'Test content',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const stored = await versionedStore.upsert(memory);

			expect(stored.metadata?.schemaVersion).toBe('2.0.0');
			expect(stored.metadata?.validatedAt).toBeDefined();
		});

		it('should reject invalid schema', async () => {
			const memory = {
				id: 'test',
				kind: 'document' as const,
				text: 'Test content',
				embedding: 'invalid' as any,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			// Set version to require embedding validation
			await metadataStore.set('schema_version', '2.0.0');

			await expect(versionedStore.upsert(memory)).rejects.toThrow(SchemaValidationError);
		});

		it('should pass through other operations', async () => {
			const memory = {
				id: 'test',
				kind: 'document' as const,
				text: 'Test content',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			await versionedStore.upsert(memory);

			// Test get
			const retrieved = await versionedStore.get('test');
			expect(retrieved).toEqual(expect.objectContaining({ id: 'test' }));

			// Test search
			const searchResults = await versionedStore.searchByText({ text: 'test' });
			expect(Array.isArray(searchResults)).toBe(true);

			// Test delete
			await expect(versionedStore.delete('test')).resolves.not.toThrow();
		});
	});
});
