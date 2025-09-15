import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	js.configs.recommended,
	// Base TS rules
	...tseslint.configs.recommended,
	// Enable type-aware rules (requires parserOptions below)
	...tseslint.configs.recommendedTypeChecked,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
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
	{
		ignores: ['node_modules/**', 'dist/**', 'build/**'],
	},
);
