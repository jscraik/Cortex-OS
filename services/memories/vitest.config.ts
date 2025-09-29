import { defineConfig } from 'vitest/config';

export default defineConfig({
        test: {
                environment: 'node',
                include: ['services/memories/tests/**/*.spec.ts'],
                exclude: ['**/dist/**', '**/node_modules/**'],
        },
});
