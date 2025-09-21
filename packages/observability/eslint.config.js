import globals from 'globals';
import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.js';

const typeAwareSrc = {
	files: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'],
	languageOptions: {
		parserOptions: {
			projectService: true,
			allowDefaultProject: true,
			project: ['./tsconfig.eslint.json'],
			tsconfigRootDir: new URL('.', import.meta.url).pathname,
		},
		globals: {
			...globals.browser,
			...globals.node,
		},
	},
};

const nonTypeAwareTests = {
	files: ['tests/**/*.ts', 'vitest.config.ts'],
	...tseslint.configs.disableTypeChecked,
	languageOptions: {
		parserOptions: {
			projectService: false,
			project: false,
			allowDefaultProject: true,
			tsconfigRootDir: new URL('.', import.meta.url).pathname,
		},
		globals: { ...globals.node },
	},
	rules: {
		'@typescript-eslint/no-unused-vars': 'off',
	},
};

const jsFiles = {
	files: ['**/*.js', '**/*.mjs', 'eslint.config.js'],
	languageOptions: {
		parserOptions: {
			projectService: false,
			tsconfigRootDir: new URL('.', import.meta.url).pathname,
		},
		globals: { ...globals.node },
	},
};

export default [...baseConfig, typeAwareSrc, nonTypeAwareTests, jsFiles];
