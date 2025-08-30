import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '**/*.d.ts',
      'tools/**',
      'mcp-*/**',
      'cortexmcp/**',
      '**/*.js',
      '**/*.mjs',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended.map((c) => ({
    ...c,
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts'],
  })),
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        module: 'readonly',
      },
    },
    rules: {
      // Industrial Standards for August 2025
      'no-restricted-syntax': 'off', // Allow both default and named exports for flexibility
      'max-lines-per-function': ['warn', { max: 80, skipComments: true, IIFEs: true }], // Relaxed for complex handlers
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Warn but allow for gradual migration
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-undef': 'off', // TypeScript handles this better
      // Core quality rules
      'no-console': 'off', // Allow console for server applications
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
    },
  },
];
