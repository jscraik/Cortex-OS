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
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
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
        // Shared packages with vitest configs (top-level)
        'packages/repo-guardrails/vitest.config.ts',
        'packages/evidence-validator/vitest.config.ts',
        'apps/cortex-os/packages/sdk/vitest.config.ts',
        'apps/cortex-os/packages/telemetry/vitest.config.ts',
        'packages/testing/vitest.config.ts',
        'packages/mvp-core/vitest.config.ts',

        // ASBR Feature Packages (mounted by cortex-os app)
        'apps/cortex-os/packages/asbr/vitest.config.ts',
        'apps/cortex-os/packages/agents/vitest.config.ts',
        'apps/cortex-os/packages/mvp/vitest.config.ts',
        'apps/cortex-os/packages/mvp-core/vitest.config.ts',
        'apps/cortex-os/packages/mvp-server/vitest.config.ts',

        // Shared Library Packages
        'packages/a2a/vitest.config.ts',
        'packages/mcp/vitest.config.ts',
        'packages/memories/vitest.config.ts',
        'packages/orchestration/vitest.config.ts',
        'packages/rag/vitest.config.ts',
        'packages/simlab/vitest.config.ts',

        // Brain modules relocated from packages/* → apps/cortex-os/brain/*
        'apps/cortex-os/brain/evidence/validator/vitest.config.ts',

        // App-specific testing
        'apps/cortex-cli/vitest.config.ts',
        'apps/cortex-cli/packages/cli-tools/vitest.config.ts',
        'apps/cortex-ios/vitest.config.ts',
        'apps/cortex-web/vitest.config.ts',
        'apps/cortex-os/vitest.config.ts',
        'apps/cortex-ts/vitest.config.ts',
        'apps/vscode-extension/vitest.config.ts',
        'apps/api/vitest.config.ts',

        // Cerebrum agents package
        'packages/agents/vitest.config.ts',

        // Specialized test suites
        'tests/vitest.config.ts',
        'vitest.launch.config.ts',
        'vitest.integration.config.ts',
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
