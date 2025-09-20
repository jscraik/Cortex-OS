import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/dist/**',
      'coverage/**',
      '**/build/**',
      '**/.turbo/**',
      '**/out/**',
      '**/*.d.ts',
      // Package-specific legacy ignores migrated from package .eslintignore files
      'packages/orchestration/src/contracts/__tests__/**',
      'packages/orchestration/src/lib/supervisor.ts',
    ],
  },
  js.configs.recommended,
  // Base TS rules
  ...tseslint.configs.recommended,
  // Apply type-aware rules ONLY within a TS override so they don't execute on JS
  {
    files: ['**/*.{ts,tsx}'],
    // Spread type-aware recommendations inside the TS-only block
    ...tseslint.configs.recommendedTypeChecked[0],
    languageOptions: {
      parserOptions: {
        projectService: true,
        allowDefaultProject: true,
        tsconfigRootDir: import.meta.dirname,
        // Use package-specific ESLint tsconfig when present (e.g., rag/tsconfig.eslint.json)
        project: [
          './tsconfig.json',
          'packages/*/tsconfig.eslint.json',
          'packages/*/*/tsconfig.eslint.json',
          'apps/*/tsconfig.eslint.json',
          'libs/*/*/tsconfig.eslint.json',
        ],
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-control-regex': 'off',
    },
  },
  // JS overrides - ensure type-aware rules that may leak are disabled
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-array-delete': 'off',
    },
  },
  // Node scripts or mjs files can use Node globals
  {
    files: ['**/scripts/**/*.{js,mjs,ts}', '**/*.mjs', '**/eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // Disable type-aware linting for heavy test suites that are not part of tsconfig projects (RAG)
  {
    files: [
      'packages/rag/__tests__/**/*.ts',
      'packages/rag/test/**/*.ts',
      'packages/rag/tests/**/*.ts',
      'packages/rag/examples/**/*.ts',
      'packages/rag/vitest.config.ts',
      'packages/observability/tests/**/*.ts',
      'packages/observability/vitest.config.ts',
      'packages/orchestration/src/**/__tests__/**/*.ts',
    ],
    // Remove type-checked rules and rely on non-type-aware parsing for these files
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: false,
        allowDefaultProject: true,
      },
      globals: {
        ...globals.node,
      },
    },
  },
);
