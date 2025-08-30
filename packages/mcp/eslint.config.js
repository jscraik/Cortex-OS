import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...ts.configs.recommended.map((c) => ({ ...c, files: ['src/**/*.ts', 'src/**/*.tsx'] })),
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // Disallow default exports without requiring extra plugins
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports only to align with project style.',
        },
      ],
      'max-lines-per-function': ['error', { max: 40, skipComments: true, IIFEs: true }],
    },
  },
];
