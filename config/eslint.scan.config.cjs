// Temporary ESLint flat config used by scripts/run-sonarjs-per-package.mjs and CLI
// This file is intentionally minimal and only used for generating cognitive
// complexity reports. It avoids loading user or repo configs.
const config = {
	files: [
		'scripts/**/*.{js,mjs,ts,tsx}',
		'packages/*/src/**/*.{js,ts,tsx}',
		'apps/*/src/**/*.{js,ts,tsx}',
	],
	languageOptions: {
		parser: require('@typescript-eslint/parser'),
		parserOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			ecmaFeatures: { jsx: true },
		},
	},
	plugins: {
		// require the plugin modules directly so resolution uses workspace node_modules
		sonarjs: require('eslint-plugin-sonarjs'),
		'@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
	},
	rules: {
		'sonarjs/cognitive-complexity': ['error', 15],
	},
};

module.exports = [config];
