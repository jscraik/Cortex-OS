import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

// Global test configuration
beforeAll(async () => {
	// Set up test environment variables
	process.env.NODE_ENV = 'test';
	process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

	// Create temporary directories for test data
	const testTempDir = join(tmpdir(), `cortex-test-${Date.now()}`);
	mkdirSync(testTempDir, { recursive: true });
	process.env.TEST_TEMP_DIR = testTempDir;
});

afterAll(async () => {
	// Clean up test directories
	const testTempDir = process.env.TEST_TEMP_DIR;
	if (testTempDir) {
		rmSync(testTempDir, { recursive: true, force: true });
	}
});

beforeEach(async () => {
	// Reset any test-specific state before each test
});

afterEach(async () => {
	// Clean up after each test
});

// Export test utilities
export const createTestDatabase = (): string => {
	const testDir = process.env.TEST_TEMP_DIR || tmpdir();
	return join(testDir, `test-db-${Date.now()}-${Math.random()}.db`);
};

export const createTestConfig = (overrides: Record<string, any> = {}) => ({
	databasePath: createTestDatabase(),
	qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
	qdrantCollection: `test-collection-${Date.now()}`,
	embedDim: 384,
	similarity: 'Cosine' as const,
	enableCircuitBreaker: true,
	circuitBreakerThreshold: 3,
	queueConcurrency: 5,
	...overrides,
});

export const sleep = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retry = async <T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	delay: number = 1000,
): Promise<T> => {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (attempt === maxAttempts) {
				throw lastError;
			}
			await sleep(delay * attempt);
		}
	}

	throw lastError!;
};
