import js from "@eslint/js";
import ts from "typescript-eslint";

export default [
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  { ignores: ["**/dist/**", "**/.artifacts/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parserOptions: { project: ["tsconfig.json"] } },
    rules: {
      "no-console": ["warn", { allow: ["error"] }],
      "@typescript-eslint/explicit-module-boundary-types": "off"
    }
  }
];
