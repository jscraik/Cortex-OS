module.exports = {
	env: { node: true, es2022: true },
	parserOptions: { ecmaVersion: "latest", sourceType: "module" },
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
	plugins: ["@typescript-eslint", "import"],
	rules: {
		"import/no-unresolved": "off",
	},
};
