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
	// JS overrides - ensure type-aware rules that may leak are disabled
	{
		files: ['**/*.js', '**/*.jsx'],
		rules: {
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/no-array-delete': 'off',
		},
	},
);
