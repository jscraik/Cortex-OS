import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: [
			'src/capabilities/**/*.test.ts',
			'src/budget/**/*.test.ts',
		],
		globals: true,
	},
});
