import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		bus: 'src/bus.ts',
		send: 'src/send.ts',
		'schema-registry': 'src/schema-registry.ts',
		'trace-context-manager': 'src/trace-context-manager.ts',
		transport: 'src/transport.ts',
		dlq: 'src/dlq.ts',
		outbox: 'src/outbox.ts',
		router: 'src/router.ts',
		saga: 'src/saga.ts',
		metrics: 'src/metrics.ts',
	},
	dts: true,
	format: ['esm'],
	target: 'es2022',
	sourcemap: true,
	clean: true,
	treeshake: true,
	// Exclude tests and fixtures
	ignoreWatch: [
		'**/*.test.ts',
		'tests/**/*',
		'test/**/*',
		'src/**/__tests__/**',
	],
});
