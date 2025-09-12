import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	{
		ignores: ['node_modules/**', 'dist/**', 'build/**'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: {
				process: 'readonly',
				console: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
			},
			parserOptions: {
				tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
				project: './tsconfig.json',
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
				},
			],
		},
	},
];
