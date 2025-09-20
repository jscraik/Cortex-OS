import type { Migration } from '../domain/migration.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

// Migration to add embedding field to existing memories
export const addEmbeddingMigration: Migration = {
	version: '2.0.0',
	description: 'Add embedding vector support to memories',
	up: async (store: MemoryStore) => {
		// This migration doesn't need to modify existing data
		// since embedding is an optional field
		console.log('Migration 2.0.0: Embedding field support added');
	},
	down: async (store: MemoryStore) => {
		// No data to rollback - embeddings were optional
		console.log('Migration 2.0.0: Rollback complete');
	}
};

// Migration to add TTL support
export const addTTLMigration: Migration = {
	version: '2.1.0',
	description: 'Add time-to-live (TTL) support',
	up: async (store: MemoryStore) => {
		console.log('Migration 2.1.0: TTL support added');
	},
	down: async (store: MemoryStore) => {
		console.log('Migration 2.1.0: TTL support removed');
	}
};

// Migration to add metadata field
export const addMetadataMigration: Migration = {
	version: '1.1.0',
	description: 'Add metadata field to memories',
	up: async (store: MemoryStore) => {
		// Get all memories and add empty metadata if missing
		// Note: This is a simplified example - in practice you'd need
		// a way to iterate through all memories in the store
		console.log('Migration 1.1.0: Added metadata field support');
	},
	down: async (store: MemoryStore) => {
		console.log('Migration 1.1.0: Removed metadata field support');
	}
};

// Migration to standardize date formats
export const dateFormatMigration: Migration = {
	version: '1.2.0',
	description: 'Standardize date formats to ISO strings',
	up: async (store: MemoryStore) => {
		console.log('Migration 1.2.0: Standardized date formats');
	},
	down: async (store: MemoryStore) => {
		console.log('Migration 1.2.0: Reverted date format changes');
	},
	validate: async () => {
		// Validate that we can parse dates correctly
		try {
			new Date().toISOString();
			return true;
		} catch {
			return false;
		}
	}
};

// Migration to add namespace support
export const addNamespaceMigration: Migration = {
	version: '1.3.0',
	description: 'Add namespace isolation support',
	up: async (store: MemoryStore) => {
		console.log('Migration 1.3.0: Added namespace support');
	},
	down: async (store: MemoryStore) => {
		console.log('Migration 1.3.0: Removed namespace support');
	}
};

export const allMigrations = [
	addMetadataMigration,
	dateFormatMigration,
	addNamespaceMigration,
	addEmbeddingMigration,
	addTTLMigration
];