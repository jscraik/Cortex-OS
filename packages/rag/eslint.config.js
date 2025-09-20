import globals from 'globals';
import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.js';

// Package-level refinements:
// - Keep type-aware linting for source/scripts only
// - Explicitly disable type-aware parsing for tests/examples to avoid TS project service errors
const typeAwareSrc = {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'],
    ignores: ['src/integrations/archon-mcp.ts'],
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
    files: [
        '__tests__/**/*.ts',
        'test/**/*.ts',
        'tests/**/*.ts',
        'examples/**/*.ts',
        'vitest.config.ts',
    ],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
        parserOptions: {
            projectService: false,
            allowDefaultProject: true,
        },
        globals: {
            ...globals.node,
        },
    },
    rules: {
        // Tests can have unused helpers/mocks; ignore underscore convention
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
    },
};

// JS files (configs, stubs) should not use TS projectService; ensure stable root dir
const jsFiles = {
    files: ['**/*.js', '**/*.mjs', 'eslint.config.js'],
    languageOptions: {
        parserOptions: {
            projectService: false,
            tsconfigRootDir: new URL('.', import.meta.url).pathname,
        },
        globals: {
            ...globals.node,
        },
    },
};

export default [...baseConfig, typeAwareSrc, nonTypeAwareTests, jsFiles];
