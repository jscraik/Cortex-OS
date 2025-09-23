// Database adapter for better-auth using memory adapter
// This adapter provides the interface that better-auth expects

import type { MemoryAdapter } from './memory-adapter';

export const createBetterAuthAdapter = async () => {
	// Import from the existing database initialization
	const { ensureDbInitialized } = await import('./index');

	// Ensure database is initialized
	await ensureDbInitialized();

	// Import the database instance
	const { db } = await import('./index');

	if (!db) {
		throw new Error('Database not initialized');
	}

	// Create and return the adapter
	return db as MemoryAdapter;
};

// Export the adapter type for better-auth
export type BetterAuthAdapter = MemoryAdapter;
