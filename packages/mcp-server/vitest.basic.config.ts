import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.basic.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			include: ['src/__tests__/**/*.test.ts'],
		},
	}),
);
