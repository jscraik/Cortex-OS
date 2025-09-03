import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Externalize all workspace packages to avoid resolving their dist during CLI bundling
  external: [/^@cortex-os\//],
  esbuildOptions(options) {
    // Keep shebang on output
    options.banner = { js: '#!/usr/bin/env node' };
  },
});
