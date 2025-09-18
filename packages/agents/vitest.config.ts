import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.d.ts', '__tests__/**'],
		},
	},
});
