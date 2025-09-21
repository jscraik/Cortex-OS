import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		setupFiles: ['./tests/setup.ts'],
		// Only run this package's dedicated tests; exclude legacy __tests__
		include: ['tests/**/*.test.ts', 'tests/**/*.test.js'],
		exclude: ['**/__tests__/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.d.ts', '__tests__/**'],
		},
		resolveSnapshotPath: (path, snapExtension) => {
			return path + snapExtension;
		},
		deps: {
			inline: ['better-sqlite3'],
		},
	},
});
