/* eslint-env node */
module.exports = {
	root: true,
	env: { es2022: true, node: true },
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
		project: false,
		ecmaVersion: 'latest',
	},
	plugins: ['@typescript-eslint', 'import', 'boundaries', 'sonarjs'],
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	settings: {
		'import/resolver': {
			typescript: {
				alwaysTryTypes: true,
				project: ['./tsconfig.base.json'],
			},
		},
		boundaries: [
			{
				type: 'lib',
				pattern: 'src/lib/**',
			},
			{ type: 'contracts', pattern: 'packages/contracts/**' },
			{ type: 'mcp', pattern: 'packages/mcp/**' },
			{ type: 'a2a', pattern: 'packages/a2a/**' },
			{ type: 'rag', pattern: 'packages/rag/**' },
			{ type: 'simlab', pattern: 'packages/simlab/**' },
			{ type: 'gateway', pattern: 'packages/gateway/**' },
		],
	},
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'off', // TODO: Legacy A2A/MCP fixtures still rely on any. Re-enable once cleanup completes.
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'variable',
				format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
				leadingUnderscore: 'allow',
			},
			{
				selector: 'function',
				format: ['camelCase', 'PascalCase'],
				leadingUnderscore: 'allow',
			},
			{ selector: 'typeLike', format: ['PascalCase'] },
		],
		'import/no-restricted-paths': [
			'off',
			{
				zones: [
					{ target: './packages/mcp', from: './packages/a2a' },
					{ target: './packages/mcp', from: './packages/rag' },
					{ target: './packages/mcp', from: './packages/simlab' },
					{ target: './packages/a2a', from: './packages/mcp' },
					{ target: './packages/a2a', from: './packages/rag' },
					{ target: './packages/a2a', from: './packages/simlab' },
					{ target: './packages/rag', from: './packages/mcp' },
					{ target: './packages/rag', from: './packages/a2a' },
					{ target: './packages/rag', from: './packages/simlab' },
					{ target: './packages/simlab', from: './packages/mcp' },
					{ target: './packages/simlab', from: './packages/a2a' },
					{ target: './packages/simlab', from: './packages/rag' },
				],
			},
		],
		'boundaries/element-types': [
			'error',
			{
				default: 'disallow',
				message: 'Cross-domain imports are forbidden. Use @cortex-os/contracts or @cortex-os/lib.',
				rules: [
					{ from: ['mcp'], allow: ['lib', 'contracts'] },
					{ from: ['a2a'], allow: ['lib', 'contracts'] },
					{ from: ['rag'], allow: ['lib', 'contracts'] },
					{ from: ['simlab'], allow: ['lib', 'contracts'] },
					{ from: ['contracts'], allow: ['lib'] },
					{
						from: ['gateway'],
						allow: ['lib', 'contracts', 'mcp', 'a2a', 'rag', 'simlab'],
					},
				],
			},
		],
	},
};
