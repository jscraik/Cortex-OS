import { beforeEach, vi } from 'vitest';

// Global test setup
beforeEach(() => {
	// Clear all mocks before each test
	vi.clearAllMocks();

	// Reset environment variables
	process.env.NODE_ENV = 'test';
});

// Mock console methods to keep test output clean
global.console = {
	...console,
	log: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};
