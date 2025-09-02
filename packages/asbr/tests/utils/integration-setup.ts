/**
 * Integration test setup
 * Ensures proper test environment for integration and performance tests
 */

import { afterAll, beforeAll, vi } from "vitest";

// Set up test environment
beforeAll(async () => {
	// Set test environment variables
	process.env.NODE_ENV = "test";
	process.env.ASBR_TEST_MODE = "true";

	// Mock external dependencies that shouldn't be called in tests
	vi.mock("fs/promises", async () => {
		const actual = await vi.importActual("fs/promises");
		return {
			...actual,
			writeFile: vi.fn(),
			readFile: vi.fn(),
			mkdir: vi.fn(),
		};
	});

	// Set up console.log suppression for cleaner test output
	const originalConsoleLog = console.log;
	console.log = (...args: any[]) => {
		// Only log errors and warnings during tests
		if (args[0]?.includes?.("ERROR") || args[0]?.includes?.("WARN")) {
			originalConsoleLog(...args);
		}
	};
});

afterAll(() => {
	// Cleanup any test artifacts
	vi.restoreAllMocks();
});
