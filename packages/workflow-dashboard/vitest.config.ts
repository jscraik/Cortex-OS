import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/__tests__/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			include: ['src/**/*.ts', 'src/**/*.tsx'],
			exclude: [
				'src/**/__tests__/**',
				'src/**/*.test.ts',
				'src/**/*.test.tsx',
				'src/**/*.d.ts',
				'src/**/index.ts',
			],
			thresholds: {
				lines: 95,
				branches: 95,
				functions: 95,
				statements: 95,
			},
		},
	},
});
