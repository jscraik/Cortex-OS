import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [path.resolve(__dirname, '../../tsconfig.base.json')],
      ignoreConfigErrors: true,
    }),
  ],
  test: { environment: 'node' },
});
