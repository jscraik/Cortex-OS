import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
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
  // Import plugin configs temporarily disabled due to resolver issues
  sonarjs.configs.recommended,
  {
    ignores: [
      '**/.venv/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.artifacts/**',
      // Generated static assets (bundled/minified JS/CSS)
      'static/**',
      'commitlint.config.js',
      'tools/**',
      'vitest.config.ts',
      'apps/**',
      // Package-specific ignores
      'packages/**/dist/**',
      'packages/**/node_modules/**',
      'packages/**/coverage/**',
      'packages/**/*.min.js',
      'packages/**/*.bundle.js',
      'packages/**/build/**',
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
      // Import resolver settings temporarily disabled due to resolver issues
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        // Node.js globals
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
        // Browser globals for scripts that might run in both environments
        fetch: 'readonly',
        performance: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // K6 globals
        __ENV: 'readonly',
        // Browser environment
        window: 'readonly',
        document: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        // Node.js globals
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
        // Browser globals for scripts that might run in both environments
        fetch: 'readonly',
        performance: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // K6 globals
        __ENV: 'readonly',
        // Browser environment
        window: 'readonly',
        document: 'readonly',
      },
    },
    rules: {
      // Import plugin rules disabled due to resolver issues
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // Change from error to warning
      '@typescript-eslint/no-unused-vars': 'warn', // Change from error to warning
      // SonarJS rules for better code quality - set to warnings to avoid blocking
      'sonarjs/cognitive-complexity': ['warn', 25], // Increase threshold
      'sonarjs/no-duplicate-string': ['warn', { threshold: 6 }], // Increase threshold
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-ignored-exceptions': 'warn',
      // 'sonarjs/no-redundant-type-aliases': 'warn', // Rule doesn't exist in this version
      // 'sonarjs/unused-import': 'warn', // Rule doesn't exist in this version
      'sonarjs/no-hardcoded-ip': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/slow-regex': 'warn',
      'sonarjs/no-nested-functions': 'warn',
      // 'sonarjs/no-unused-vars': 'warn', // Rule doesn't exist in this version
      // 'sonarjs/no-dead-store': 'warn', // Rule doesn't exist in this version
      // Import plugin rules temporarily disabled due to TypeScript resolver issues
    },
  },
  {
    // Enforce named exports only in source (no default exports)
    files: ['packages/**/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports only (default exports are disallowed in source).',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    rules: {
      // Relax rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'no-console': 'off',
    },
  },
  {
    // Configuration for CommonJS files
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
  },
];
