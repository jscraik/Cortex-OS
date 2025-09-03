import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	root: ROOT,
	test: {
		include: [
			'**/__tests__/**/*.{test,spec}.{ts,tsx}',
			'**/__tests__/**/*.a11y.test.{ts,tsx}',
		],
		environment: 'jsdom',
		setupFiles: ['./__tests__/setup.ts'],
		globals: true,
		reporters: ['default'],
	},
	resolve: {
		alias: {
			app: resolve(ROOT, 'app'),
			'@': ROOT,
			'@shared': resolve(ROOT, 'shared'),
		},
	},
	// Use automatic JSX runtime for tests without requiring React import
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'react',
	},
});
