import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
	// Global ignores (flat config replacement for .eslintignore)
	{
		ignores: [
			'dist/**',
			'examples/**',
			// Exclude outbox internals and tests (not part of public surface)
			'src/lib/outbox/**',
			'tests/**',
			'__tests__/**',
		],
	},

	// Base recommended configs
	...tseslint.configs.recommended,

	// Project-aware TypeScript settings and rules for the remaining sources
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: __dirname,
				project: ['./tsconfig.json'],
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
];
