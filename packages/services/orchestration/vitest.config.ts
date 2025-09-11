import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        // Keep this package isolated from the root workspace issues
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        pool: 'forks',
        poolOptions: { forks: { singleFork: true, maxForks: 1, minForks: 1 } },
    },
});
