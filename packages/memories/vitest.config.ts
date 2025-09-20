import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text'],
			exclude: [
				'src/index.ts',
				'src/errors.ts',
				'src/ports/**',
				'src/domain/types.ts',
				'src/domain/policies.ts',
				'src/tools/**',
				'src/adapters/embedder.ollama.ts',
				'src/adapters/embedder.mlx.ts',
				'src/adapters/store.prisma/**',
				'vitest.config.ts',
				'tests/**',
			],
			thresholds: {
				statements: 95,
				branches: 95,
				functions: 95,
				lines: 95,
			},
		},
	},
});
