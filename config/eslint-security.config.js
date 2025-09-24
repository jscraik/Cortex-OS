import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import ts from 'typescript-eslint';

// Security-focused overlay config with enhanced vulnerability detection
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	{
		// Limit to primary source directories to avoid loading every test/build artifact into the TS program (reduces memory footprint).
		files: [
			'src/**/*.{ts,tsx,js,jsx}',
			'tests/**/*.{ts,tsx,js,jsx}',
			'scripts/**/*.{ts,js}',
		],
		// Register sonarjs plugin exactly once in this file so rules resolve.
		plugins: { '@typescript-eslint': ts.plugin, sonarjs },
		languageOptions: {
			globals: {
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
				fetch: 'readonly',
				performance: 'readonly',
				window: 'readonly',
				document: 'readonly',
			},
			parser: ts.parser,
			parserOptions: {
				// Disable project service to avoid parsing errors
				projectService: false,
				project: false,
				allowDefaultProject: true,
				tsconfigRootDir: process.cwd(),
				ecmaVersion: 2020,
				sourceType: 'module',
				ecmaFeatures: { jsx: true },
			},
		},
		rules: {
			// Elevate sonarjs rules to error (plugin is provided by base config)
			'sonarjs/cognitive-complexity': ['error', 15],
			'sonarjs/no-duplicate-string': ['error', { threshold: 5 }],
			'sonarjs/no-duplicated-branches': 'error',
			'sonarjs/no-identical-functions': 'error',
			'sonarjs/no-redundant-boolean': 'error',
			'sonarjs/no-unused-collection': 'error',
			'sonarjs/no-useless-catch': 'error',
			'sonarjs/prefer-immediate-return': 'error',
			'sonarjs/prefer-object-literal': 'error',
			'sonarjs/prefer-single-boolean-return': 'error',

			// TypeScript security rules
			'@typescript-eslint/no-explicit-any': 'error',
			// Unsafe rules disabled due to project service being disabled
			// '@typescript-eslint/no-unsafe-assignment': 'warn',
			// '@typescript-eslint/no-unsafe-call': 'warn',
			// '@typescript-eslint/no-unsafe-member-access': 'warn',
			// '@typescript-eslint/no-unsafe-return': 'warn',
			// '@typescript-eslint/restrict-template-expressions': [
			// 	'warn',
			// 	{ allowNumber: true, allowBoolean: true, allowNullish: true },
			// ],

			// Enhanced security rules
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-new-func': 'error',
			'no-script-url': 'error',
			'no-console': ['warn', { allow: ['error', 'warn'] }],

			// Command injection prevention
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"CallExpression[callee.object.name='child_process'][callee.property.name='exec']",
					message:
						'Use child_process.execFile or spawn instead of exec to prevent command injection',
				},
				{
					selector: "CallExpression[callee.name='eval']",
					message: 'eval() is dangerous and should not be used',
				},
				{
					selector: "NewExpression[callee.name='Function']",
					message: 'Function constructor is equivalent to eval() and should not be used',
				},
			],

			// SSRF and injection prevention
			'no-restricted-modules': ['error', 'child_process'],

			// Prototype pollution prevention
			'no-proto': 'error',
			'no-extend-native': 'error',

			// Input validation
			'no-empty': 'error',
			'no-fallthrough': 'error',
			'no-regex-spaces': 'error',

			// Environment and secrets
			'no-process-env': 'warn',
			'no-process-exit': 'warn',

			// Network security
			'prefer-const': 'error',
			'no-var': 'error',

			// Additional TypeScript security (disabled due to project service being disabled)
			// '@typescript-eslint/no-non-null-assertion': 'warn',
			// '@typescript-eslint/prefer-nullish-coalescing': 'warn',
			// '@typescript-eslint/prefer-optional-chain': 'warn',
		},
	},
	{
		// Test files - relax some security rules that are acceptable in tests
		files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
		rules: {
			'no-process-env': 'off',
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	{
		// Config files - allow necessary patterns
		files: ['**/*.config.js', '**/*.config.ts', '**/vite.config.*', '**/vitest.config.*'],
		rules: {
			'no-process-env': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		// Scripts directory - allow subprocess usage but warn
		files: ['scripts/**/*'],
		rules: {
			'no-process-env': 'off',
			'no-process-exit': 'off',
			'no-console': 'off',
			'no-restricted-modules': 'warn',
		},
	},
	{
		ignores: [
			'**/.venv/**',
			'**/dist/**',
			'**/node_modules/**',
			'**/.artifacts/**',
			'**/coverage/**',
			'**/*.min.js',
			'**/*.bundle.js',
			'**/build/**',
			'external/**',
			'htmlcov/**',
		],
	},
];
