module.exports = {
  root: true,
  extends: [
    '@cortex-os/eslint-config',
    'plugin:security/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  plugins: ['import', 'security', 'jsx-a11y'],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './packages/!(a2a)/*/**/*',
            from: './packages/!(a2a|mcp)/*/**/*',
            except: ['**/index.ts', '**/index.js'],
            message:
              'Feature packages must communicate via A2A events or service interfaces.',
          },
          {
            target: './**/*',
            from: [
              './**/src/**/*',
              '!./**/src/index.{ts,js,tsx,jsx}',
              './**/dist/**/*',
              './**/node_modules/**/*',
            ],
            message: 'Deep imports forbidden. Use package exports.',
          },
          {
            target: './packages/**/*',
            from: './apps/**/*',
            message: 'Packages cannot depend on apps.',
          },
          {
            target: './packages/**/*',
            from: './services/**/*',
            message: 'Cross-language imports not allowed.',
          },
        ],
      },
    ],
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/aria-role': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
