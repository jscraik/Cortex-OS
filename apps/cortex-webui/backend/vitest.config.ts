import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: [
			'__tests__/**/*.{test,spec}.ts',
			'test/**/*.{test,spec,contract}.ts',
		],
	},
});
