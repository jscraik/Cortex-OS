import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@cortex-os/model-gateway': resolve(__dirname, 'tests/stubs/model-gateway.ts'),
		},
	},
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
