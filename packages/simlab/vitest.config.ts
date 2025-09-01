import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [tsconfigPaths({ projects: [path.resolve(__dirname, 'tsconfig.json'), path.resolve(__dirname, '../../tsconfig.base.json')] })],
  test: {
    coverage: {
      enabled: true,
      reporter: ['text', 'json'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
