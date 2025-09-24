import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

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
			// Temporarily ignore parsing error files
			'src/lib/mlx/__tests__/**',
			'tests/auth/auth-flows.spec.ts',
			'tests/mlx.spec.ts',
			'tests/security/vitest.config.ts',
			'tests/setup/types.d.ts',
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
				projectService: false,
				project: false,
				allowDefaultProject: true,
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'no-control-regex': 'off',
			'@typescript-eslint/no-unused-vars': ['error', {
				'argsIgnorePattern': '^_',
				'varsIgnorePattern': '^_',
				'ignoreRestSiblings': true
			}],
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
	// Test files can use Node globals
	{
		files: ['tests/**/*.{js,ts}', '**/*.test.{js,ts}', '**/*.spec.{js,ts}', 'src/**/__tests__/**/*.ts'],
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
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'no-process-env': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
		},
	},
	sonarjs.configs.recommended,
);
