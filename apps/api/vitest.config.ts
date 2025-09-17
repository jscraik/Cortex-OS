import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tsconfigPaths({
			projects: ['tsconfig.json', '../../tsconfig.base.json'],
		}),
	],
	test: {
		globals: true,
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			reportsDirectory: 'coverage',
			thresholds: {
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90,
			},
		},
	},
});
