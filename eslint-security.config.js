import js from "@eslint/js";
import sonarjs from "eslint-plugin-sonarjs";
import ts from "typescript-eslint";

// Security-focused overlay config. Assumes base config already registered sonarjs.
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    // Limit to primary source directories to avoid loading every test/build artifact into the TS program (reduces memory footprint).
    files: [
      "apps/**/src/**/*.{ts,tsx,js,jsx}",
      "packages/**/src/**/*.{ts,tsx,js,jsx}",
    ],
    // Register sonarjs plugin exactly once in this file so rules resolve.
    plugins: { "@typescript-eslint": ts.plugin, sonarjs },
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        performance: "readonly",
        window: "readonly",
        document: "readonly",
      },
      parser: ts.parser,
      parserOptions: {
        // Enable type-aware linting for @typescript-eslint security rules.
        // projectService automatically discovers tsconfig.* in workspace (v8 feature).
        projectService: true,
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Elevate sonarjs rules to error (plugin is provided by base config)
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-duplicate-string": ["error", { threshold: 5 }],
      "sonarjs/no-duplicated-branches": "error",
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-redundant-boolean": "error",
      "sonarjs/no-unused-collection": "error",
      "sonarjs/no-useless-catch": "error",
      "sonarjs/prefer-immediate-return": "error",
      "sonarjs/prefer-object-literal": "error",
      "sonarjs/prefer-single-boolean-return": "error",
      // TypeScript security rules
      "@typescript-eslint/no-explicit-any": "error",
      // Unsafe rules require full type info and are expensive on very large monorepos.
      // We keep them as warnings for now to reduce OOM risk; can re-elevate in CI with per-package runs.
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/restrict-template-expressions": ["warn", { allowNumber: true, allowBoolean: true, allowNullish: true }],
      // General security rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    ignores: [
      "**/.venv/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.artifacts/**",
      "**/coverage/**",
      "**/*.min.js",
      "**/*.bundle.js",
      "**/build/**",
      "external/**",
      "htmlcov/**",
    ],
  },
];
