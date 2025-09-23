import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		types: 'src/types.ts',
	},
	dts: false,
	format: ['esm'],
	target: 'es2022',
	sourcemap: true,
	clean: true,
	treeshake: true,
});
