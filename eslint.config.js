import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
// eslint-disable-next-line import/no-named-as-default-member
import ts from 'typescript-eslint';

export default [
  js.configs.recommended,
  // Apply standard TypeScript rules only to actual TypeScript source files.
  // Using the non-type-checked config avoids requiring type information while
  // still enforcing basic best practices.
  ...ts.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    ignores: [
      '**/dist/**',
      '**/.artifacts/**',
      'commitlint.config.js',
      'tools/**',
      'vitest.config.ts',
      'apps/**',
      'packages/**',
      // Vendored or external sources not governed by root lint
      'external/**',
      'tests/**',
      'scripts/**',
      'libs/**',
      'schemas/**',
      '.cortex/**',
      'examples/**',
      'ecosystem.config.cjs',
      'ecosystem.config.js',
      '.dependency-cruiser.js',
      'eslint.scan.config.cjs',
      'config/**',
      'contracts/**',
      'htmlcov/**',
    ],
  },
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: ['tsconfig.eslint.json'],
        },
        node: {
          extensions: ['.js', '.ts', '.tsx'],
        },
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': ['warn', { allow: ['error'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // ASBR brain logic should not import from MVP packages
            {
              target: './packages/asbr/**/*',
              from: './packages/mvp/**/*',
              message:
                'ASBR brain logic should not import from MVP packages - use A2A events or service interfaces instead',
            },
            {
              target: './packages/asbr/**/*',
              from: './packages/mvp-core/**/*',
              message:
                'ASBR brain logic should not import from MVP core packages - use A2A events or service interfaces instead',
            },
            // Apps should only import from shared packages (a2a, mcp) and their own feature packages
            {
              target: './apps/cortex-os/**/*',
              from: './packages/**/*',
              except: [
                './packages/a2a/**/*',
                './packages/mcp/**/*',
                './packages/asbr/**/*',
                './packages/memories/**/*',
                './packages/orchestration/**/*',
              ],
              message:
                'Apps should only import from shared packages (a2a, mcp) and core services (asbr, memories, orchestration)',
            },
            // Feature packages should not directly import from other feature packages
            {
              target: './packages/mvp/**/*',
              from: './packages/mvp-core/**/*',
              except: ['./packages/mvp-core/src/types/**/*'],
              message:
                'MVP packages should only import types from mvp-core, not implementation - use service interfaces',
            },
            // External packages should not import from internal app logic
            {
              target: './packages/**/*',
              from: './apps/**/*',
              message: 'Packages should not import from apps - maintain clear dependency direction',
            },
            // Libs should be importable by all but not import from packages/apps
            {
              target: './libs/**/*',
              from: './packages/**/*',
              message: 'Libs should not import from packages - libs are foundational utilities',
            },
            {
              target: './libs/**/*',
              from: './apps/**/*',
              message: 'Libs should not import from apps - libs are foundational utilities',
            },
          ],
        },
      ],
    },
  },
];
