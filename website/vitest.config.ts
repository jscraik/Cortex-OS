import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'website-docs',
        include: ['__tests__/**/*.{test,spec}.ts'],
        environment: 'node',
        globals: true,
        fileParallelism: false,
        maxWorkers: 1,
        isolate: true,
        pool: 'forks',
        poolOptions: {
            forks: { singleFork: true, maxForks: 1, minForks: 1 }
        },
        passWithNoTests: false
    }
});
