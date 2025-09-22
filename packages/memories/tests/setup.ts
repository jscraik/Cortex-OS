import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MEMORIES_STORE_ADAPTER = 'memory';

// Set up test timers
vi.useFakeTimers();

// Global test utilities
export const testUtils = {
	createTestMemory: (overrides: Partial<any> = {}) => ({
		id: 'test-memory-id',
		kind: 'test',
		text: 'Test memory content',
		tags: ['test'],
		metadata: {},
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		provenance: { source: 'test' },
		...overrides,
	}),

	createTestVector: (dimensions = 384) =>
		Array.from({ length: dimensions }, () => Math.random()),
};

// Cleanup after each test
afterEach(() => {
	vi.clearAllMocks();
});