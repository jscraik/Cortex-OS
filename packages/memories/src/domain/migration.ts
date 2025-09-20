import type { Memory } from '../domain/types.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export interface Migration {
	version: string;
	description: string;
	up: (store: MemoryStore) => Promise<void>;
	down: (store: MemoryStore) => Promise<void>;
	validate?: () => Promise<boolean>;
}

export interface MigrationManager {
	getCurrentVersion(): Promise<string>;
	getAvailableMigrations(): Migration[];
	migrate(targetVersion?: string): Promise<MigrationResult>;
	rollback(toVersion: string): Promise<RollbackResult>;
	validateSchema(memory: Memory): Promise<ValidationResult>;
	getMigrationHistory(): Promise<MigrationHistory[]>;
}

export interface MigrationResult {
	success: boolean;
	fromVersion: string;
	toVersion: string;
	migrationsApplied: string[];
	errors?: string[];
	duration: number;
}

export interface RollbackResult {
	success: boolean;
	fromVersion: string;
	toVersion: string;
	migrationsRolledBack: string[];
	errors?: string[];
	duration: number;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export interface MigrationHistory {
	id: string;
	version: string;
	description: string;
	direction: 'up' | 'down';
	timestamp: string;
	duration: number;
	success: boolean;
	error?: string;
}

export interface SchemaVersion {
	version: string;
	description: string;
	releaseDate: string;
	minCompatibleVersion: string;
	maxCompatibleVersion: string;
	changes: SchemaChange[];
}

export interface SchemaChange {
	type: 'add' | 'remove' | 'modify' | 'rename';
	field: string;
	description: string;
	migrationRequired?: boolean;
	breakingChange?: boolean;
}

export class MigrationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly version?: string,
		public readonly cause?: Error
	) {
		super(message);
		this.name = 'MigrationError';
	}
}

export class SchemaValidationError extends Error {
	constructor(
		public readonly errors: string[],
		public readonly memory?: Memory
	) {
		super(`Schema validation failed: ${errors.join(', ')}`);
		this.name = 'SchemaValidationError';
	}
}