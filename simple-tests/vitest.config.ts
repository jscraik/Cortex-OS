import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['simple-tests/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/*.test.ts'],
	},
	plugins: [tsconfigPaths({ projects: ['tsconfig.json'], ignoreConfigErrors: true })],
});
