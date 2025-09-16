import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
        resolve: {
                alias: {
                        '@cortex-os/agents': resolve(currentDir, '__tests__/stubs/agent-mcp-client.js'),
                },
        },
        test: {
                environment: 'node',
                coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reportsDirectory: './coverage-rag',
			reporter: ['text-summary', 'json-summary'],
		},
	},
});
