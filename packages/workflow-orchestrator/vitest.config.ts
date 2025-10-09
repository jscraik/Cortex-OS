import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.d.ts', 'src/**/index.ts'],
			thresholds: {
				lines: 95,
				branches: 95,
				functions: 95,
				statements: 95,
			},
		},
	},
});
