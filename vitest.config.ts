import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Root Vitest config: only orchestrates projects. Avoid sweeping up non-Vitest
// suites (e.g., apps using Jest) and vendor/external code.
export default defineConfig({
  test: {
    globals: true,
    // Cap worker pools to avoid excessive Node processes during runs
    // Docs: https://vitest.dev/config/#pooloptions
    poolOptions: {
      threads: { maxThreads: 3, minThreads: 1 },
      forks: { maxForks: 3, minForks: 1 },
      vmThreads: { maxThreads: 3, minThreads: 1 },
      vmForks: { maxForks: 3, minForks: 1 },
    },
    // Fallback cap when poolOptions aren’t applied for some pools
    maxWorkers: 3,
    // Ensure built artifacts never get swept into discovery
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', 'tests/**'],
    // Quality gates: enforce coverage thresholds across all projects
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
      include: ['apps/**/src/**', 'packages/**/src/**'],
      exclude: [
        'external/**',
        'vendor/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        perFile: false, // Enforced at app level
      },
      all: true,
      clean: true,
    },
    // Route to explicit project configs for proper isolation; filter to only
    // include configs that actually exist on disk to avoid startup errors
    // when packages are missing or in migration.
    projects: (() => {
      const candidates = [
        // Minimal test suite to ensure vitest runs without external dependencies
        'vitest.basic.config.ts',
      ];

      const resolved = candidates.map((p) => path.resolve(p));
      const existing = resolved.filter((abs) => fs.existsSync(abs));
      const missing = resolved.filter((abs) => !fs.existsSync(abs));
      if (missing.length > 0) {
        // Use console.warn so it's visible during CI/test runs
        // but do not fail the test startup because of missing per-package configs.
        // eslint-disable-next-line no-console
        console.warn(
          '[vitest.config] Missing project configs:',
          missing.map((m) => path.relative(process.cwd(), m)),
        );
      }
      return existing.map((abs) => path.relative(process.cwd(), abs));
    })(),
    setupFiles: ['tests/setup/vitest.setup.ts'],
    // Quality gates enforcement
    passWithNoTests: false,
    outputFile: {
      junit: 'junit.xml',
      json: 'test-results.json',
    },
    env: {
      COVERAGE_THRESHOLD_GLOBAL: '90',
      COVERAGE_THRESHOLD_LINES: '95',
      NODE_ENV: 'test',
    },
  },
});
