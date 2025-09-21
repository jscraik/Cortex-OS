#!/usr/bin/env node

import { Command } from 'commander';
import { InMemoryMetadataStore } from '../adapters/metadata.in-memory.js';
import { createStoreFromEnv } from '../config/store-from-env.js';
import { allMigrations } from '../migrations/predefined-migrations.js';
import { DefaultMigrationManager } from '../service/migration-service.js';

const program = new Command();
const logger = {
	info: (message: string, context?: any) =>
		console.log(`[migration-cli] ${message}`, context || ''),
	error: (message: string, context?: any) =>
		console.error(`[migration-cli] ${message}`, context || ''),
};

program
	.name('memories-migrate')
	.description('Database migration tool for Cortex Memories')
	.version('1.0.0');

program
	.command('status')
	.description('Show current migration status')
	.action(async () => {
		try {
			const store = await createStoreFromEnv();
			const metadataStore = new InMemoryMetadataStore();
			const migrationManager = new DefaultMigrationManager(store, metadataStore);

			// Register all migrations
			for (const migration of allMigrations) {
				migrationManager.registerMigration(migration);
			}

			const currentVersion = await migrationManager.getCurrentVersion();
			const availableMigrations = migrationManager.getAvailableMigrations();
			const pendingMigrations = availableMigrations.filter((m) => m.version > currentVersion);

			console.log('\n📊 Migration Status');
			console.log('==================');
			console.log(`Current Version: ${currentVersion}`);
			console.log(`Available Migrations: ${availableMigrations.length}`);
			console.log(`Pending Migrations: ${pendingMigrations.length}`);

			if (pendingMigrations.length > 0) {
				console.log('\n⏳ Pending Migrations:');
				pendingMigrations.forEach((m) => {
					console.log(`  - ${m.version}: ${m.description}`);
				});
			}

			console.log('\n✨ All systems operational');
		} catch (error) {
			logger.error('Failed to get migration status', { error });
			process.exit(1);
		}
	});

program
	.command('migrate')
	.description('Run pending migrations')
	.argument('[version]', 'Target version (default: latest)')
	.option('-d, --dry-run', 'Show what would be migrated without executing')
	.action(async (version, options) => {
		try {
			const store = await createStoreFromEnv();
			const metadataStore = new InMemoryMetadataStore();
			const migrationManager = new DefaultMigrationManager(store, metadataStore);

			// Register all migrations
			for (const migration of allMigrations) {
				migrationManager.registerMigration(migration);
			}

			const currentVersion = await migrationManager.getCurrentVersion();
			const targetVersion =
				version || migrationManager.getAvailableMigrations().slice(-1)[0]?.version;

			if (!targetVersion) {
				console.error('No migrations available');
				process.exit(1);
			}

			console.log(`\n🚀 Migrating from ${currentVersion} to ${targetVersion}`);

			if (options.dryRun) {
				const pendingMigrations = migrationManager
					.getAvailableMigrations()
					.filter((m) => m.version > currentVersion && m.version <= targetVersion);

				console.log('\n📋 Migrations to apply:');
				pendingMigrations.forEach((m) => {
					console.log(`  - ${m.version}: ${m.description}`);
				});
				console.log('\n💡 Dry run complete - no changes made');
				return;
			}

			const result = await migrationManager.migrate(targetVersion);

			if (result.success) {
				console.log('\n✅ Migration completed successfully');
				console.log(`   Applied ${result.migrationsApplied.length} migrations`);
				console.log(`   Duration: ${result.duration}ms`);
			} else {
				console.error('\n❌ Migration failed');
				console.error('   Errors:', result.errors);
				process.exit(1);
			}
		} catch (error) {
			logger.error('Migration failed', { error });
			process.exit(1);
		}
	});

program
	.command('rollback')
	.description('Rollback to a specific version')
	.argument('<version>', 'Target version to rollback to')
	.action(async (version) => {
		try {
			const store = await createStoreFromEnv();
			const metadataStore = new InMemoryMetadataStore();
			const migrationManager = new DefaultMigrationManager(store, metadataStore);

			// Register all migrations
			for (const migration of allMigrations) {
				migrationManager.registerMigration(migration);
			}

			const currentVersion = await migrationManager.getCurrentVersion();
			console.log(`\n🔄 Rolling back from ${currentVersion} to ${version}`);

			const result = await migrationManager.rollback(version);

			if (result.success) {
				console.log('\n✅ Rollback completed successfully');
				console.log(`   Rolled back ${result.migrationsApplied.length} migrations`);
				console.log(`   Duration: ${result.duration}ms`);
			} else {
				console.error('\n❌ Rollback failed');
				console.error('   Errors:', result.errors);
				process.exit(1);
			}
		} catch (error) {
			logger.error('Rollback failed', { error });
			process.exit(1);
		}
	});

program
	.command('history')
	.description('Show migration history')
	.action(async () => {
		try {
			const store = await createStoreFromEnv();
			const metadataStore = new InMemoryMetadataStore();
			const migrationManager = new DefaultMigrationManager(store, metadataStore);

			const history = await migrationManager.getMigrationHistory();

			console.log('\n📜 Migration History');
			console.log('===================');

			if (history.length === 0) {
				console.log('No migrations have been applied');
				return;
			}

			history.forEach((entry) => {
				const icon = entry.success ? '✅' : '❌';
				const direction = entry.direction === 'up' ? '↑' : '↓';
				console.log(
					`${icon} ${entry.timestamp} ${direction} ${entry.version} - ${entry.description}`,
				);
				if (!entry.success && entry.error) {
					console.log(`   Error: ${entry.error}`);
				}
			});
		} catch (error) {
			logger.error('Failed to get migration history', { error });
			process.exit(1);
		}
	});

program
	.command('validate')
	.description('Validate migration scripts')
	.action(async () => {
		console.log('\n🔍 Validating migrations...');

		const errors: string[] = [];

		for (const migration of allMigrations) {
			try {
				if (migration.validate) {
					const isValid = await migration.validate();
					if (!isValid) {
						errors.push(`Migration ${migration.version} failed validation`);
					}
				}

				// Check version format
				if (!/^\d+\.\d+\.\d+$/.test(migration.version)) {
					errors.push(`Migration ${migration.version} has invalid version format`);
				}

				// Check required functions
				if (typeof migration.up !== 'function') {
					errors.push(`Migration ${migration.version} missing up function`);
				}
				if (typeof migration.down !== 'function') {
					errors.push(`Migration ${migration.version} missing down function`);
				}
			} catch (error) {
				errors.push(`Migration ${migration.version} validation error: ${error}`);
			}
		}

		if (errors.length === 0) {
			console.log('✅ All migrations are valid');
		} else {
			console.error('❌ Migration validation failed:');
			errors.forEach((error) => console.error(`   - ${error}`));
			process.exit(1);
		}
	});

program.parse();
