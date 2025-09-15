import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';

// Consolidated flat config: declare sonarjs plugin once and layer rule sets.
const baseTypeScript = ts.configs.recommended.map((config) => ({
  ...config,
  files: ['**/*.ts', '**/*.tsx'],
}));

const sharedGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  global: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  performance: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  __ENV: 'readonly',
  window: 'readonly',
  document: 'readonly',
};

export default [
  js.configs.recommended,
  ...baseTypeScript,
  // Provide sonarjs plugin & baseline rules once.
  {
    plugins: { sonarjs },
  },
  // Global TypeScript parser settings (must use string path for tsconfigRootDir)
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
        // Removed project array to avoid "file not found in project" errors in large monorepo
      },
    },
  },
  {
    ignores: [
      '**/.venv/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.artifacts/**',
      'static/**',
      'commitlint.config.js',
      'tools/**',
      'vitest.config.ts',
      // NOTE: Previously ignored all `apps/**` which prevented linting production app sources.
      // Narrow this to generated/build artifacts only so we can lint app source code.
      'apps/**/dist/**',
      'apps/**/build/**',
      'apps/**/node_modules/**',
      'apps/**/coverage/**',
      'packages/**/dist/**',
      'packages/**/node_modules/**',
      'packages/**/coverage/**',
      'packages/**/*.min.js',
      'packages/**/*.bundle.js',
      'packages/**/build/**',
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
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: sharedGlobals },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { globals: sharedGlobals },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 25],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 6 }],
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-ignored-exceptions': 'warn',
      'sonarjs/no-hardcoded-ip': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/slow-regex': 'warn',
      'sonarjs/no-nested-functions': 'warn',
    },
  },
  {
    files: ['packages/**/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports only (default exports are discouraged in source).',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...sharedGlobals, module: 'writable', exports: 'writable' },
    },
  },
];
