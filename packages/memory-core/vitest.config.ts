import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
	include: ['tests/**/*.test.ts', '__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
		exclude: ['node_modules', 'dist', '**/*.d.ts'],
		coverage: {
			reporter: ['text', 'json', 'html'],
			thresholds: {
				global: {
					branches: 90,
					functions: 90,
					lines: 90,
					statements: 90,
				},
			},
		},
		globals: true,
	},
        resolve: {
                alias: {
                        '@': resolve(__dirname, './src'),
                        '@cortex-os/utils': resolve(
                                __dirname,
                                '../../libs/typescript/utils/src',
                        ),
                        '@cortex-os/mcp-core': resolve(__dirname, '../mcp-core/src'),
                        '@cortex-os/mcp-core/': resolve(
                                __dirname,
                                '../mcp-core/src/',
                        ),
                        '@cortex-os/mcp-registry': resolve(__dirname, '../mcp-registry/src'),
                        '@cortex-os/mcp-registry/': resolve(
                                __dirname,
                                '../mcp-registry/src/',
                        ),
                        '@tests': resolve(__dirname, './tests'),
                },
        },
});
