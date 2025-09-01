========================
CODE SNIPPETS
========================

TITLE: Initialize ESLint Configuration
DESCRIPTION: Installs and configures ESLint using the npm init command. This command prompts for setup options and creates an ESLint configuration file (`eslint.config.js`).

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm init @eslint/config
```

----------------------------------------

TITLE: Install ESLint and JavaScript Plugin
DESCRIPTION: Installs the latest versions of ESLint and the JavaScript language plugin as development dependencies using npm. This command assumes you have a `package.json` file.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_6>

LANGUAGE: npm
CODE:

```
npm install eslint@latest @eslint/js@latest --save-dev
```

----------------------------------------

TITLE: Initialize ESLint with Shared Config
DESCRIPTION: Installs ESLint and applies a specific shareable configuration, like `eslint-config-xo`, using the `--config` option. Requires npm 7+.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm init @eslint/config -- --config eslint-config-xo
```

----------------------------------------

TITLE: Basic ESLint Browser Configuration
DESCRIPTION: Example ESLint configuration file (`eslint.config.js`) for browser environments. It includes browser globals and the recommended ESLint rules from `@eslint/js`.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_3>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
 { files: ["**/*.js"], languageOptions: { globals: globals.browser } },
 { files: ["**/*.js"], plugins: { js }, extends: ["js/recommended"] },
]);
```

----------------------------------------

TITLE: Configure pnpm for ESLint
DESCRIPTION: Specifies essential settings for pnpm to ensure compatibility with ESLint installations, particularly `auto-install-peers` and `node-linker`. This configuration should be placed in a `.npmrc` file.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_5>

LANGUAGE: text
CODE:

```
auto-install-peers=true
node-linker=hoisted
```

----------------------------------------

TITLE: Run ESLint on Files
DESCRIPTION: Executes ESLint on specified JavaScript files or directories to check for code patterns and potential bugs. This command uses `npx` to run the locally installed ESLint package.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npx eslint yourfile.js
```

----------------------------------------

TITLE: Linting Code with ESLint CLI
DESCRIPTION: Executes ESLint from the command line to lint specified files or directories. This command uses `npx`, `yarn`, or `pnpm` to run the locally installed ESLint package, applying the configured rules to the codebase.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_10>

LANGUAGE: npm
CODE:

```
npx eslint project-dir/ file.js
```

LANGUAGE: yarn
CODE:

```
yarn eslint project-dir/ file.js
```

LANGUAGE: pnpm
CODE:

```
pnpm eslint project-dir/ file.js
```

----------------------------------------

TITLE: ESLint Configuration with Custom Rules
DESCRIPTION: Example ESLint configuration file (`eslint.config.js`) demonstrating how to extend recommended rules and override specific rules like `no-unused-vars` and `no-undef`. Rules can be set to 'off', 'warn', or 'error'.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
 { files: ["**/*.js"], plugins: { js }, extends: ["js/recommended"] },

 {
  rules: {
   "no-unused-vars": "warn",
   "no-undef": "warn",
  },
 },
]);
```

----------------------------------------

TITLE: Lint Code with ESLint CLI
DESCRIPTION: Executes ESLint to lint specified directories or files. This command uses `npx` to run the ESLint package without global installation, targeting project directories and specific JavaScript files.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_9>

LANGUAGE: shell
CODE:

```
npx eslint project-dir/ file.js
```

----------------------------------------

TITLE: Link ESLint for Development
DESCRIPTION: Installs ESLint locally for development purposes. This command needs to be run once initially to set up the development environment.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Unit-Tests.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm link
```

----------------------------------------

TITLE: Example ESLint Execution
DESCRIPTION: An example demonstrating how to run ESLint on specific JavaScript files.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Command-line-interface.md#_snippet_2>

LANGUAGE: shell
CODE:

```
eslint file1.js file2.js
```

----------------------------------------

TITLE: Example LLM Prompts for ESLint
DESCRIPTION: Provides example natural language prompts that can be given to an LLM integrated with the ESLint MCP server. These prompts demonstrate how to request linting and automatic fixing of code issues.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/mcp.md#_snippet_4>

LANGUAGE: text
CODE:

```
Lint the current file and explain any issues found

Lint and fix #file:index.js
```

----------------------------------------

TITLE: Create ESLint Configuration File
DESCRIPTION: Creates an empty JavaScript configuration file named `eslint.config.js` using the `touch` command in a Unix-like shell environment.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_7>

LANGUAGE: shell
CODE:

```
touch eslint.config.js
```

----------------------------------------

TITLE: ESLint CLI Options Reference
DESCRIPTION: Details common ESLint command-line options, including their purpose, usage, and examples.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Command-line-interface.md#_snippet_5>

LANGUAGE: APIDOC
CODE:

```
ESLint Command Line Options:

General Usage:
  eslint [options] file.js [file.js] [dir]

Options:
  -h, --help
    Show help menu, displaying all available options. All other flags are ignored when this is present.

  -c, --config <path>
    Load configuration data from a specific file path. If not provided, ESLint searches for configuration files in parent directories.
    Default: Searches for '.eslintrc.*' files.
    Example:
      eslint -c ~/my-eslint.json file.js

  --rulesdir <path>
    Load additional rules from a specified directory. This allows dynamic loading of custom rules.
    Example:
      eslint --rulesdir my-rules/ file.js

  -f, --format <name>
    Use a specific output format for the console. The default format is 'compact'.
    Example:
      eslint -f compact file.js
    To save output to a file:
      eslint -f compact file.js > results.txt
```

----------------------------------------

TITLE: Install @eslint/js package
DESCRIPTION: Installs the @eslint/js package, which provides access to ESLint's recommended and all rules configurations for flat config files. This is a development dependency.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/configure/migration-guide.md#_snippet_10>

LANGUAGE: bash
CODE:

```
npm install --save-dev @eslint/js
```

----------------------------------------

TITLE: Install ESLint with npm
DESCRIPTION: Installs ESLint as a development dependency using npm. This command is typically run in the project's root directory.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/_includes/components/code-tabs.html#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev
```

----------------------------------------

TITLE: Install ESLint with yarn
DESCRIPTION: Installs ESLint as a development dependency using yarn. This command is typically run in the project's root directory.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/_includes/components/code-tabs.html#_snippet_1>

LANGUAGE: shell
CODE:

```
yarn install
```

----------------------------------------

TITLE: Install @eslint/eslintrc package
DESCRIPTION: Installs the @eslint/eslintrc package, which provides the FlatCompat utility for translating .eslintrc configurations to the flat config format. This is a development dependency.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/configure/migration-guide.md#_snippet_15>

LANGUAGE: bash
CODE:

```
npm install --save-dev @eslint/eslintrc
```

----------------------------------------

TITLE: ESLint Command Line Options Overview
DESCRIPTION: Displays all available command-line options for the ESLint utility. This is the primary way to get help on usage.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Command-line-interface.md#_snippet_3>

LANGUAGE: shell
CODE:

```
eslint -h
```

----------------------------------------

TITLE: ESLint JavaScript Configuration
DESCRIPTION: Provides a basic ESLint configuration using JavaScript modules. It defines files to lint, includes the JavaScript plugin, extends recommended rules, and sets custom rules for unused variables and undefined identifiers.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/getting-started.md#_snippet_8>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
 {
  files: ["**/*.js"],
  plugins: {
   js,
  },
  extends: ["js/recommended"],
  rules: {
   "no-unused-vars": "warn",
   "no-undef": "warn",
  },
 },
]);
```

----------------------------------------

TITLE: Install and Initialize ESLint
DESCRIPTION: Installs and configures ESLint using npm. This command sets up the necessary configuration files for your project.

SOURCE: <https://github.com/eslint/eslint/blob/main/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm init @eslint/config@latest
```

----------------------------------------

TITLE: Clone ESLint Repository
DESCRIPTION: Clones the main ESLint repository from GitHub to create a local copy of the source code. This command requires Git to be installed on your system.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Source-Code.md#_snippet_0>

LANGUAGE: bash
CODE:

```
git clone git://github.com/nzakas/eslint.git
```

----------------------------------------

TITLE: Set Up ESLint in Development Mode
DESCRIPTION: This process allows you to run ESLint directly from your local source code. It involves uninstalling any globally installed ESLint and then linking your checked-out source directory. After this, the global `eslint` command will point to your development version.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Development-Environment.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm remove -g eslint
npm link
```

----------------------------------------

TITLE: Example .eslintignore file
DESCRIPTION: Specifies files and directories that ESLint should ignore during linting. This uses glob patterns similar to .gitignore.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/configure/migration-guide.md#_snippet_17>

LANGUAGE: shell
CODE:

```
# .eslintignore
temp.js
config/*
```

----------------------------------------

TITLE: ESLint Initialization with --init
DESCRIPTION: Illustrates how to initialize ESLint configuration by inspecting JavaScript files. This process is analogous to the JSCS `--auto-configure` option, guiding users through setup questions.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-from-jscs.md#_snippet_7>

LANGUAGE: shell
CODE:

```
eslint --init
? How would you like to configure ESLint? (Use arrow keys)
> Answer questions about your style
  Use a popular style guide
  Inspect your JavaScript file(s)
```

----------------------------------------

TITLE: Example SourceCode Implementation Reference
DESCRIPTION: Points to an example implementation of a basic SourceCode class for reference.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/extend/languages.md#_snippet_2>

LANGUAGE: APIDOC
CODE:

```
Example: JSONSourceCode
  - Located at: https://github.com/eslint/json/blob/main/src/languages/json-source-code.js
  - Demonstrates a basic SourceCode class implementation.
```

----------------------------------------

TITLE: Create Example JavaScript File
DESCRIPTION: Command to create a new JavaScript file for the integration example.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/integrate/integration-tutorial.md#_snippet_2>

LANGUAGE: shell
CODE:

```
touch example-eslint-integration.js
```

----------------------------------------

TITLE: Install Yeoman Globally
DESCRIPTION: Installs Yeoman, a scaffolding tool used by ESLint for streamlining the development of new rules. This command installs Yeoman globally on your system, making the 'yo' command available everywhere.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/contribute/development-environment.md#_snippet_3>

LANGUAGE: shell
CODE:

```
npm install yo --global
```

----------------------------------------

TITLE: ESLint Rule Visitor Example
DESCRIPTION: An example demonstrating how to implement visitor functions within the 'create' method of an ESLint rule. It shows how to handle different AST node types and lifecycle events like code path start and end.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rules.md#_snippet_2>

LANGUAGE: javascript
CODE:

```
function checkLastSegment (node) {
    // report problem for function if last code path segment is reachable
}

module.exports = {
    meta: { ... },
    create: function(context) {
        // declare the state of the rule
        return {
            ReturnStatement: function(node) {
                // at a ReturnStatement node while going down
            },
            // at a function expression node while going up:
            "FunctionExpression:exit": checkLastSegment,
            "ArrowFunctionExpression:exit": checkLastSegment,
            onCodePathStart: function (codePath, node) {
                // at the start of analyzing a code path
            },
            onCodePathEnd: function(codePath, node) {
                // at the end of analyzing a code path
            }
        };
    }
};
```

----------------------------------------

TITLE: Install ESLint Documentation Dependencies
DESCRIPTION: Installs the necessary Node.js packages required to build and serve the ESLint documentation site. This command should be run from the 'docs' folder.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install
```

----------------------------------------

TITLE: Setup Project Directory and Initialize Package
DESCRIPTION: Commands to create a new project directory and initialize a package.json file using npm.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/integrate/integration-tutorial.md#_snippet_0>

LANGUAGE: shell
CODE:

```
mkdir eslint-integration
cd eslint-integration
```

LANGUAGE: shell
CODE:

```
npm init -y
```

----------------------------------------

TITLE: ESLint Configuration Naming Conventions
DESCRIPTION: Provides examples of naming conventions for ESLint configuration objects, particularly for shared configurations. It shows how to use a scoped name with a prefix (e.g., 'example/recommended') to identify configurations within plugins or custom setups.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files.md#_snippet_24>

LANGUAGE: javascript
CODE:

```
export default {
 configs: {
  recommended: {
   name: "example/recommended",
   rules: {
    "no-unused-vars": "warn",
   },
  },
  strict: {
   name: "example/strict",
   rules: {
    "no-unused-vars": "error",
   },
  },
 },
};
```

LANGUAGE: javascript
CODE:

```
export default {
 configs: {
  strict: [
   {
    name: "example/strict/language-setup",
    languageOptions: {
     ecmaVersion: 2024,
    },
   },
   {
    name: "example/strict/sub-config",
    files: ["src/**/*.js"],
    rules: {
     "no-unused-vars": "error",
    },
   },
  ],
 },
};
```

----------------------------------------

TITLE: Install ESLint CLI
DESCRIPTION: Installs the ESLint command-line interface globally using npm. Ensure Node.js and npm are installed beforehand.

SOURCE: <https://github.com/eslint/eslint/blob/main/__wiki__/Command-line-interface.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install -g eslint
```

----------------------------------------

TITLE: ESLint Shareable Config Example
DESCRIPTION: Demonstrates how to import and use shareable ESLint configurations, including those from external plugins like `eslint-plugin-solid` and core configurations like `@eslint/js`. This setup combines multiple configurations into a single export for project linting.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/core-concepts/glossary.md#_snippet_7>

LANGUAGE: js
CODE:

```
import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/recommended";

export default [js.configs.recommended, solid];
```

----------------------------------------

TITLE: VS Code Command Palette: Add ESLint MCP Server
DESCRIPTION: Provides step-by-step instructions for adding the ESLint MCP server to VS Code using the Command Palette. This method guides users through selecting the server type, command, and saving the configuration.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/mcp.md#_snippet_1>

LANGUAGE: APIDOC
CODE:

```
MCP: Add Server
  - Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
  - Type and select 'MCP: Add Server'.
  - Choose 'Command (stdio)' from the dropdown.
  - Enter 'npx @eslint/mcp@latest' as the command.
  - Type 'ESLint' as the server ID.
  - Select 'Workspace Settings' to create `.vscode/mcp.json`.
```

----------------------------------------

TITLE: Use eslint:recommended in .eslintrc.js
DESCRIPTION: Demonstrates how to extend the recommended ESLint configuration in a traditional .eslintrc.js file. It includes the 'extends' property to inherit rules and an example of overriding a specific rule.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/configure/migration-guide.md#_snippet_11>

LANGUAGE: javascript
CODE:

```
// .eslintrc.js

module.exports = {
 // ...other config
 extends: "eslint:recommended",
 rules: {
  semi: ["warn", "always"],
 },
 // ...other config
};
```

----------------------------------------

TITLE: ESLint Rule Tester Setup
DESCRIPTION: Demonstrates how to set up tests for an ESLint custom rule using `eslint.RuleTester`. It includes valid and invalid code examples with expected error messages.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rules.md#_snippet_8>

LANGUAGE: javascript
CODE:

```
// avoid-name.test.js

var rule = require("../../../lib/rules/avoid-name");
var RuleTester = require("eslint").RuleTester;

var ruleTester = new RuleTester();
ruleTester.run("avoid-name", rule, {
 valid: ["bar", "baz"],
 invalid: [
  {
   code: "foo",
   errors: [
    {
     messageId: "avoidName",
    },
   ],
  },
 ],
});
```

----------------------------------------

TITLE: Install ESLint
DESCRIPTION: Installs the ESLint package as a development dependency using npm. This is the first step to using ESLint in your project.

SOURCE: <https://github.com/eslint/eslint/blob/main/packages/eslint-config-eslint/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install eslint --save-dev
```

----------------------------------------

TITLE: Convert JSCS Presets to ESLint Shareable Configs
DESCRIPTION: Maps common JSCS presets to their corresponding ESLint shareable configuration packages. Includes installation instructions and configuration file examples for migrating projects.

SOURCE: <https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-from-jscs.md#_snippet_4>

LANGUAGE: apidoc
CODE:

```
JSCS Preset to ESLint Shareable Config Mapping:

JSCS Preset Name | ESLint Shareable Config Package
-----------------|---------------------------------
airbnb           | eslint-config-airbnb-base
crockford        | (not available)
google           | eslint-config-google
grunt            | eslint-config-grunt
idiomatic        | eslint-config-idiomatic
jquery           | eslint-config-jquery
mdcs             | eslint-config-mdcs
node-style-guide | eslint-config-node-style-guide
wikimedia        | eslint-config-wikimedia
wordpress        | eslint-config-wordpress

Example Migration:

JSCS Configuration:
```json
{
 "preset": "airbnb"
}
```

Installation:

```shell
npm install eslint-config-airbnb-base --save-dev
```

ESLint Configuration:

```json
{
 "extends": "airbnb-base"
}
```

Note: ESLint automatically resolves `"airbnb-base"` to `"eslint-config-airbnb-base"`.

```

----------------------------------------

TITLE: JavaScript Return Statement Formatting
DESCRIPTION: Provides examples of correctly formatted JavaScript return statements, including returning values and using parentheses only when they enhance clarity.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_45

LANGUAGE: javascript
CODE:
```

return;

return collection.size();

return (size > 0 ? size : defaultSize);

```

----------------------------------------

TITLE: Run All ESLint Tests with npm
DESCRIPTION: Executes all unit tests for ESLint using the `npm test` command. This command automatically starts Mocha and runs all tests found in the `tests` directory. Ensure `npm install` has been run first.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/contribute/tests.md#_snippet_0

LANGUAGE: shell
CODE:
```

npm test

```

----------------------------------------

TITLE: JavaScript Indentation Example
DESCRIPTION: Example of JavaScript code demonstrating indentation practices. The ESLint indent rule enforces consistent indentation, with a default of 4 spaces, and is often configured based on style guide recommendations.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/rules/indent.md#_snippet_0

LANGUAGE: javascript
CODE:
```

function hello(indentSize, type) {
    if (indentSize === 4 && type !== 'tab') {
        console.log('Each next indentation will increase on 4 spaces');
    }
}

```

----------------------------------------

TITLE: Install ESLint Package
DESCRIPTION: Command to install the eslint package as a project dependency using npm.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/integrate/integration-tutorial.md#_snippet_1

LANGUAGE: shell
CODE:
```

npm install eslint

```

----------------------------------------

TITLE: JavaScript Variable Naming: Good Practices
DESCRIPTION: Demonstrates correct camelCase formatting for JavaScript variables, starting with a lowercase noun. Avoids uppercase starts, verbs, and underscores.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_25

LANGUAGE: javascript
CODE:
```

var accountNumber = "8401-1";

```

----------------------------------------

TITLE: ESLint Flat Configuration Example (CommonJS)
DESCRIPTION: An example of an ESLint flat configuration file using CommonJS syntax, defining rules for semi-colon usage and preferring constants.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files.md#_snippet_1

LANGUAGE: javascript
CODE:
```

// eslint.config.js
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
 {
  rules: {
   semi: "error",
   "prefer-const": "error",
  },
 },
]);

```

----------------------------------------

TITLE: Install Polyjuice CLI
DESCRIPTION: Installs the Polyjuice command-line interface globally using npm. This utility helps convert JSCS configuration files to ESLint format.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-from-jscs.md#_snippet_0

LANGUAGE: shell
CODE:
```

npm install -g polyjuice

```

----------------------------------------

TITLE: JavaScript Function Naming: Good Practices
DESCRIPTION: Shows correct camelCase formatting for JavaScript function names, starting with a lowercase verb. Avoids uppercase starts, nouns, and underscores.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_27

LANGUAGE: javascript
CODE:
```

function doSomething() {
    // code
}

```

----------------------------------------

TITLE: Migrate ESLint Config using npx
DESCRIPTION: Executes the @eslint/migrate-config package via npx to convert an existing .eslintrc.json file to the new flat configuration format. This command-line tool automates much of the conversion process, creating a starting point for your eslint.config.js file.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/migration-guide.md#_snippet_0

LANGUAGE: shell
CODE:
```

npx @eslint/migrate-config .eslintrc.json

```

----------------------------------------

TITLE: ESLint Rule Definition Examples
DESCRIPTION: Provides examples of using the `rule` macro to define specific ESLint rules. Each example showcases different configurations, including deprecated rules, rules replaced by others, and standard rule definitions with their categories (recommended, fixable, hasSuggestions).

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/library/rule.md#_snippet_1

LANGUAGE: html
CODE:
```

{ % from 'components/rule.macro.html' import rule % }

{{ rule({
    name: "array-bracket-newline",
    deprecated: true,
    description: 'Enforces line breaks after opening and before closing array brackets.',
    categories: {
        recommended: true,
        fixable: true,
        hasSuggestions: false
    }
}) }}

{{ rule({
    name: "no-arrow-condition",
    removed: true,
    description: 'Disallows arrow functions where test conditions are expected.',
    replacedBy: ["no-confusing-arrow", "no-constant-condition"],
    categories: {
        recommended: false,
        fixable: false,
        hasSuggestions: false
    }
}) }}

{{ rule({
    name: "getter-return",
    deprecated: false,
    description: 'Enforce `return` statements in getters.',
    categories: {
        recommended: true,
        fixable: false,
        hasSuggestions: false
    }
}) }}

```

----------------------------------------

TITLE: ESLint Configuration Example
DESCRIPTION: An example of an ESLint configuration object, specifying various rules and their settings. This JSON structure is commonly used in .eslintrc.js or .eslintrc.json files.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-to-1.0.0.md#_snippet_2

LANGUAGE: json
CODE:
```

{
  "no-extra-parens": [2, "functions"],
  "eqeqeq": 2,
  "key-spacing": [2, { "beforeColon": false, "afterColon": true }],
  "new-cap": 2,
  "new-parens": 2,
  "quotes": [2, "double"],
  "semi": 2,
  "semi-spacing": [2, { "before": false, "after": true }],
  "space-infix-ops": 2,
  "space-return-throw-case": 2,
  "space-unary-ops": [2, { "words": true, "nonwords": false }],
  "strict": [2, "function"],
  "yoda": [2, "never"]
 }

```

----------------------------------------

TITLE: ESLint Flat Configuration Example (ES Module)
DESCRIPTION: An example of an ESLint flat configuration file using ES Module syntax, defining rules for semi-colon usage and preferring constants.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files.md#_snippet_0

LANGUAGE: javascript
CODE:
```

// eslint.config.js
import { defineConfig } from "eslint/config";

export default defineConfig([
 {
  rules: {
   semi: "error",
   "prefer-const": "error",
  },
 },
]);

```

----------------------------------------

TITLE: Install ESLint Yeoman Generator
DESCRIPTION: Installs the ESLint Yeoman generator globally. This generator helps in scaffolding new ESLint rules and other project components. Refer to the generator's documentation for usage instructions.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/contribute/development-environment.md#_snippet_4

LANGUAGE: shell
CODE:
```

npm install generator-eslint --global

```

----------------------------------------

TITLE: Install ESLint Dependencies
DESCRIPTION: Installs all necessary project dependencies for ESLint development using npm. This command requires an active internet connection. It's recommended to re-run this after pulling changes from the main repository.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/contribute/development-environment.md#_snippet_1

LANGUAGE: shell
CODE:
```

cd eslint
npm install

```

----------------------------------------

TITLE: ESLint Rule Unit Test Structure
DESCRIPTION: Demonstrates the standard structure for an ESLint rule unit test file. It includes setup for testing rule violations and ensuring no violations are reported for valid code patterns.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Working-with-Rules.md#_snippet_4

LANGUAGE: js
CODE:
```

/**

* @fileoverview Tests for no-with rule.
* @author Nicholas C. Zakas
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var vows = require("vows"),
    assert = require("assert"),
    eslint = require("../../../lib/eslint");

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

var RULE_ID = "no-with";

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

vows.describe(RULE_ID).addBatch({

    "when evaluating '<some code>'": {

        topic: "<some code>",

        "should report a violation": function(topic) {
            var config = { rules: {} };
            config.rules[RULE_ID] = 1;

            var messages = eslint.verify(topic, config);

            assert.equal(messages.length, 1);
            assert.equal(messages[0].ruleId, RULE_ID);
            assert.equal(messages[0].message, "<rule message>");
            assert.include(messages[0].node.type, "<expected node type>");
        }
    },

    "when evaluating '<some other code>'": {

        topic: "<some other code>",

        "should not report a violation": function(topic) {
            var config = { rules: {} };
            config.rules[RULE_ID] = 1;

            var messages = eslint.verify(topic, config);

            assert.equal(messages.length, 0);
        }
    }

}).export(module);

```

----------------------------------------

TITLE: Individual Alert Examples
DESCRIPTION: Provides individual examples for each alert type (warning, tip, important) with placeholder text and URLs.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/library/alert.md#_snippet_1

LANGUAGE: html
CODE:
```

{% warning "warning text", "/" %}

```

LANGUAGE: html
CODE:
```

{% tip "tip text", "/" %}

```

LANGUAGE: html
CODE:
```

{% important "text", "/" %}

```

----------------------------------------

TITLE: Complete ESLint Integration Example
DESCRIPTION: This JavaScript code provides a complete example of integrating ESLint. It includes functions to create an ESLint instance with custom configurations, lint specified files, automatically apply fixes, and output the linting results to the console. It serves as a main entry point for custom ESLint integrations.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/integrate/integration-tutorial.md#_snippet_6

LANGUAGE: javascript
CODE:
```

const { ESLint } = require("eslint");

// Create an instance of ESLint with the configuration passed to the function
function createESLintInstance(overrideConfig) {
 return new ESLint({
  overrideConfigFile: true,
  overrideConfig,
  fix: true,
 });
}

// Lint the specified files and return the results
async function lintAndFix(eslint, filePaths) {
 const results = await eslint.lintFiles(filePaths);

 // Apply automatic fixes and output fixed code
 await ESLint.outputFixes(results);

 return results;
}

// Log results to console if there are any problems
function outputLintingResults(results) {
 // Identify the number of problems found
 const problems = results.reduce(
  (acc, result) => acc + result.errorCount + result.warningCount,
  0
 );

 if (problems > 0) {
  console.log("Linting errors found!");
  console.log(results);
 } else {
  console.log("No linting errors found.");
 }
 return results;
}

// Put previous functions all together
async function lintFiles(filePaths) {
 // The ESLint configuration. Alternatively, you could load the configuration
 // from an eslint.config.js file or just use the default config.
 const overrideConfig = {
  languageOptions: {
   ecmaVersion: 2018,
   sourceType: "commonjs",
  },
  rules: {
   "no-console": "error",
   "no-unused-vars": "warn",
  },
 };

 const eslint = createESLintInstance(overrideConfig);
 const results = await lintAndFix(eslint, filePaths);
 return outputLintingResults(results);
}

// Export integration
module.exports = { lintFiles };

```

----------------------------------------

TITLE: Get ESLint Version
DESCRIPTION: Accesses the static property ESLint.version to retrieve the currently installed version string of ESLint.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/integrate/nodejs-api.md#_snippet_15

LANGUAGE: javascript
CODE:
```

const version = ESLint.version;

```

----------------------------------------

TITLE: Run ESLint Documentation Locally
DESCRIPTION: Starts a local development server to build and host the ESLint documentation site. After execution, the site is typically accessible at http://localhost:2023. This command should be run from the 'docs' folder.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/README.md#_snippet_1

LANGUAGE: shell
CODE:
```

npm start

```

----------------------------------------

TITLE: Set up Project for Custom Rule
DESCRIPTION: Commands to create a new directory, initialize an npm project, and create the rule file for a custom ESLint rule.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rule-tutorial.md#_snippet_0

LANGUAGE: shell
CODE:
```

mkdir eslint-custom-rule-example # create directory
cd eslint-custom-rule-example # enter the directory
npm init -y # init new npm project
touch enforce-foo-bar.js # create file enforce-foo-bar.js

```

----------------------------------------

TITLE: JavaScript Constructor Naming: Bad Practices
DESCRIPTION: Illustrates incorrect naming for JavaScript constructor functions, including starting with a lowercase letter, a verb, or using underscores.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_30

LANGUAGE: javascript
CODE:
```

// Bad: Begins with lowercase letter
function myObject() {
    // code
}

// Bad: Uses underscores
function My_Object() {
    // code
}

// Bad: Begins with verb
function getMyObject() {
    // code
}

```

----------------------------------------

TITLE: Configure ESLint with All JS Rules
DESCRIPTION: Extends ESLint configuration to enable all available ESLint rules for JavaScript files. This provides a comprehensive linting setup, with an example of overriding a specific rule.

SOURCE: https://github.com/eslint/eslint/blob/main/packages/js/README.md#_snippet_3

LANGUAGE: javascript
CODE:
```

import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
 // apply all rules to JS files
 {
  name: "your-project/all-rules",
  files: ["**/*.js"],
  plugins: {
   js,
  },
  extends: ["js/all"],
  rules: {
   "no-unused-vars": "warn",
  },
 },
]);

```

----------------------------------------

TITLE: ESLint Shareable Configurations
DESCRIPTION: Shareable configurations are distributed via npm and are often used to enforce specific style guides using ESLint's built-in rules. An example is `eslint-config-airbnb-base`.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/core-concepts/index.md#_snippet_2

LANGUAGE: javascript
CODE:
```

Shareable configurations are ESLint configurations that are shared via npm.

Often shareable configurations are used to enforce style guides using ESLint's built-in rules. For example the shareable configuration [eslint-config-airbnb-base](https://www.npmjs.com/package/eslint-config-airbnb-base) implements the popular Airbnb JavaScript style guide.

```

----------------------------------------

TITLE: ESLint Recommended Configuration Example
DESCRIPTION: Demonstrates how to configure ESLint to mimic the behavior of `eslint:recommended` from older versions by explicitly disabling or enabling specific rules within a configuration file.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-to-6.0.0.md#_snippet_0

LANGUAGE: json
CODE:
```

{
 "extends": "eslint:recommended",

 "rules": {
  "no-async-promise-executor": "off",
  "no-misleading-character-class": "off",
  "no-prototype-builtins": "off",
  "no-shadow-restricted-names": "off",
  "no-useless-catch": "off",
  "no-with": "off",
  "require-atomic-updates": "off",

  "no-console": "error"
 }
}

```

----------------------------------------

TITLE: Install ESLint Plugin Package
DESCRIPTION: Installs a specified ESLint plugin package as a development dependency in your project using npm.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rule-tutorial.md#_snippet_16

LANGUAGE: bash
CODE:
```

npm install --save-dev eslint-plugin-example
// Add your package name here

```

----------------------------------------

TITLE: Install ESLint as Development Dependency
DESCRIPTION: This shell command installs the `eslint` package as a development dependency using npm. This is necessary for setting up testing for custom ESLint rules.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rule-tutorial.md#_snippet_5

LANGUAGE: shell
CODE:
```

npm install --save-dev eslint

```

----------------------------------------

TITLE: ESLint Configuration for generator-star Rule (JSON)
DESCRIPTION: Provides an example of how to configure the 'generator-star' ESLint rule in a project's configuration file. It shows how to specify the desired asterisk (*) placement style, such as 'start'.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/rules/generator-star.md#_snippet_3

LANGUAGE: json
CODE:
```

"generator-star": ["error", "start"]

```

----------------------------------------

TITLE: ESLint Configuration Example
DESCRIPTION: This JavaScript code demonstrates a typical ESLint configuration file (`eslint.config.js`) using the recommended rules and custom rule settings.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/formatters/index.md#_snippet_0

LANGUAGE: javascript
CODE:
```

import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
 js.configs.recommended,
 {
  rules: {
   "consistent-return": 2,
   "indent"           : [1, 4],
   "no-else-return"   : 1,
   "semi"             : [1, "always"],
   "space-unary-ops"  : 2
  }
 }
]);

```

----------------------------------------

TITLE: ESLint Configuration Example
DESCRIPTION: An example of an ESLint configuration file (`eslint.config.js`) defining rules for JavaScript files. It shows how to set error levels for rules like 'prefer-const' and 'no-constant-binary-expression'.

SOURCE: https://github.com/eslint/eslint/blob/main/README.md#_snippet_2

LANGUAGE: javascript
CODE:
```

import { defineConfig } from "eslint/config";

export default defineConfig([
 {
  files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
  rules: {
   "prefer-const": "warn",
   "no-constant-binary-expression": "error",
  },
 },
]);

```

----------------------------------------

TITLE: Clone ESLint Repository
DESCRIPTION: Clones your forked ESLint repository from GitHub. Ensure you replace `<Your GitHub Username>` with your actual GitHub username. This is the first step after forking the project.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/contribute/development-environment.md#_snippet_0

LANGUAGE: shell
CODE:
```

git clone <https://github.com/><Your GitHub Username>/eslint

```

----------------------------------------

TITLE: Ignoring Files with .eslintignore
DESCRIPTION: Provides an example of a `.eslintignore` file used with eslintrc configurations to prevent ESLint from linting specific files or directories. It uses glob patterns similar to `.gitignore`.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/migration-guide.md#_snippet_24

LANGUAGE: shell
CODE:
```

# .eslintignore

temp.js
config/*

```

----------------------------------------

TITLE: Initialize ESLint Configuration
DESCRIPTION: Uses the ESLint CLI to start an interactive wizard for creating a new ESLint configuration file from scratch.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-from-jscs.md#_snippet_3

LANGUAGE: shell
CODE:
```

npm init @eslint/config@latest

```

----------------------------------------

TITLE: JavaScript Function Naming: Bad Practices
DESCRIPTION: Highlights incorrect JavaScript function naming conventions, such as starting with an uppercase letter, a noun, or using underscores.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_28

LANGUAGE: javascript
CODE:
```

// Bad: Begins with uppercase letter
function DoSomething() {
    // code
}

// Bad: Begins with noun
function car() {
    // code
}

// Bad: Uses underscores
function do_something() {
    // code
}

```

----------------------------------------

TITLE: ESLint JavaScript Function Example
DESCRIPTION: A basic JavaScript function demonstrating console logging. This snippet is part of the ESLint project documentation.

SOURCE: https://github.com/eslint/eslint/blob/main/tests/fixtures/processors/test/test-processor.txt#_snippet_0

LANGUAGE: javascript
CODE:
```

function a() {
    console.log("Test");
}

```

----------------------------------------

TITLE: JavaScript Constructor Naming: Good Practices
DESCRIPTION: Demonstrates correct camelCase formatting for JavaScript constructor functions, starting with an uppercase non-verb. This distinguishes them from regular functions and variables.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_29

LANGUAGE: javascript
CODE:
```

function MyObject() {
    // code
}

```

----------------------------------------

TITLE: ESLint JavaScript Configuration Example
DESCRIPTION: An example of an ESLint configuration file in JavaScript format. It shows how to define environment settings and override specific rules using JavaScript-style comments.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files-deprecated.md#_snippet_1

LANGUAGE: js
CODE:
```

{
    "env": {
        "browser": true
    },
    "rules": {
        // Override our default settings just for this directory
        "eqeqeq": "warn",
        "strict": "off"
    }
}

```

----------------------------------------

TITLE: ESLint YAML Configuration Example
DESCRIPTION: An example of an ESLint configuration file in YAML format. It demonstrates defining environment settings and overriding rules using YAML-style comments.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files-deprecated.md#_snippet_2

LANGUAGE: yaml
CODE:
```

---
settings:
    sharedData: "Hello"
env:
    browser: true
rules:
    # Override default settings
    eqeqeq: warn
    strict: off

```

----------------------------------------

TITLE: ESLint Rule: no-new-require - Correct Example
DESCRIPTION: An example of code that adheres to the `no-new-require` ESLint rule, demonstrating correct module inclusion and instantiation.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/rules/no-new-require.md#_snippet_3

LANGUAGE: javascript
CODE:
```

/*eslint no-new-require: "error"*/

var AppHeader = require('app-header');
var appHeader = new AppHeader();

```

----------------------------------------

TITLE: JavaScript Variable Naming: Bad Practices
DESCRIPTION: Illustrates common mistakes in JavaScript variable naming, including starting with an uppercase letter, a verb, or using underscores instead of camelCase.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Code-Conventions.md#_snippet_26

LANGUAGE: javascript
CODE:
```

// Bad: Begins with uppercase letter
var AccountNumber = "8401-1";

// Bad: Begins with verb
var getAccountNumber = "8401-1";

// Bad: Uses underscore
var account_number = "8401-1";

```

----------------------------------------

TITLE: ESLint capitalized-comments: Default Usage
DESCRIPTION: Demonstrates the default behavior of the capitalized-comments rule, which requires comments to start with a capital letter. Shows examples of incorrect and correct comment capitalization.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/rules/capitalized-comments.md#_snippet_0

LANGUAGE: javascript
CODE:
```

/*eslint capitalized-comments: ["error"]*/

// lowercase comment

// Capitalized comment

/*istanbul ignore next */
/* jscs:enable */
/* jshint asi:true */
/* global foo */
/* globals foo */
/* exported myVar*/
// <https://github.com>

/*eslint semi:2 */
/* eslint-disable */
foo
/* eslint-enable*/
// eslint-disable-next-line
baz
bar // eslint-disable-line

```

----------------------------------------

TITLE: Starting ESLint MCP Server (Shell)
DESCRIPTION: This snippet shows how to start the ESLint MCP (Multi-Client Protocol) server using the `--mcp` option. This server is intended for use with AI agents or other external clients that interact with ESLint programmatically.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/command-line-interface.md#_snippet_72

LANGUAGE: Shell
CODE:
```

npx eslint --mcp

```

----------------------------------------

TITLE: ESLint Using Predefined Configurations
DESCRIPTION: Illustrates how to use ESLint's built-in predefined configurations, such as 'js/recommended' and 'js/all', by installing the '@eslint/js' package. This allows applying recommended rules or all available rules and then customizing them.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files.md#_snippet_22

LANGUAGE: javascript
CODE:
```

import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
 {
  files: ["**/*.js"],
  plugins: {
   js,
  },
  extends: ["js/recommended"],
  rules: {
   "no-unused-vars": "warn",
  },
 },
]);

```

----------------------------------------

TITLE: ExecuteOnText() Usage Examples
DESCRIPTION: Demonstrates how to use the `CLIEngine#executeOnText()` method, showing the previous usage and the updated usage with the new `warnIgnoredFiles` parameter.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/migrating-to-3.0.0.md#_snippet_3

LANGUAGE: javascript
CODE:
```

var result = engine.executeOnText(text, filename);

```

LANGUAGE: javascript
CODE:
```

var result = engine.executeOnText(text, filename, true);

```

----------------------------------------

TITLE: Create File for Testing Plugin
DESCRIPTION: Creates a sample JavaScript file (`example.js`) that will be linted by ESLint. This file contains code intended to trigger the custom rule, allowing for verification of the plugin's functionality.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-rule-tutorial.md#_snippet_12

LANGUAGE: shell
CODE:
```

touch example.js

```

----------------------------------------

TITLE: JavaScript Syntax with ECMAScript 2015 (ES6)
DESCRIPTION: Demonstrates a JavaScript code snippet using ES6 features like the 'let' keyword. This example is marked as 'correct' and includes specific parser configuration.

SOURCE: https://github.com/eslint/eslint/blob/main/tests/fixtures/good-examples.md#_snippet_4

LANGUAGE: js
CODE:
```

let x;

```

----------------------------------------

TITLE: Run ESLint with npx
DESCRIPTION: Demonstrates how to execute ESLint using npx, specifying files or directories to lint. Includes examples for single files, multiple files, and using glob patterns with shell expansion and quoted globs for node glob syntax.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/command-line-interface.md#_snippet_0

LANGUAGE: bash
CODE:
```

npx eslint [options] [file|dir|glob]*

```

LANGUAGE: bash
CODE:
```

npx eslint file1.js file2.js

# Run on two files

```

LANGUAGE: bash
CODE:
```

npx eslint lib/**

# Run on multiple files

```

LANGUAGE: bash
CODE:
```

npx eslint "lib/**"

# Use node glob syntax

```

LANGUAGE: bash
CODE:
```

npx eslint .

# Run ESLint using a flat config file

```

LANGUAGE: bash
CODE:
```

npx eslint

# Run ESLint using a flat config file (same as above)

```

----------------------------------------

TITLE: Simple Custom ESLint Parser Example
DESCRIPTION: Provides a basic JavaScript example of a custom ESLint parser named `awesome-custom-parser.js`. It demonstrates how to use `espree.parse` and expose a custom `services` object with a `foo()` method to ESLint rules. Includes examples of how to configure ESLint to use this custom parser.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/extend/custom-parsers.md#_snippet_6

LANGUAGE: js
CODE:
```

// awesome-custom-parser.js
var espree = require("espree");
function parseForESLint(code, options) {
 return {
  ast: espree.parse(code, options),
  services: {
   foo: function () {
    console.log("foo");
   },
  },
  scopeManager: null,
  visitorKeys: null,
 };
}

module.exports = { parseForESLint };

```

LANGUAGE: js
CODE:
```

// eslint.config.js
module.exports = [
 {
  languageOptions: {
   parser: require("./path/to/awesome-custom-parser"),
  },
 },
];

```

LANGUAGE: json
CODE:
```

// .eslintrc.json
{
    "parser": "./path/to/awesome-custom-parser.js"
}

```

----------------------------------------

TITLE: Initialize ESLint Configuration
DESCRIPTION: Starts the ESLint configuration wizard by running `npm init @eslint/config`. This helps new users create an `eslint.config.js` file by answering interactive questions. Linting is not performed when this flag is used.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/command-line-interface.md#_snippet_45

LANGUAGE: bash
CODE:
```

npx eslint --init

```

----------------------------------------

TITLE: Link Local ESLint Development Copy
DESCRIPTION: Navigates into the cloned ESLint directory and links the local copy for development. This allows you to run your local version of ESLint and see changes immediately. It's recommended to re-run this command after pulling updates from the main repository.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Source-Code.md#_snippet_1

LANGUAGE: bash
CODE:
```

cd eslint
npm link

```

----------------------------------------

TITLE: Basic ESLint Command Structure
DESCRIPTION: The fundamental structure for running ESLint from the command line. It accepts options and targets files or directories for linting.

SOURCE: https://github.com/eslint/eslint/blob/main/__wiki__/Command-line-interface.md#_snippet_1

LANGUAGE: shell
CODE:
```

eslint [options] [file|dir]*

```

----------------------------------------

TITLE: Alert Usage Examples
DESCRIPTION: Demonstrates the usage of different alert types (warning, tip, important) using Jinja-like shortcodes within HTML. Each shortcode expects text and a URL for a 'Learn more' link.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/library/alert.md#_snippet_0

LANGUAGE: html
CODE:
```

{ % warning "This rule has been removed in version x.xx", "/link/to/learn/more"
% } { % tip "Kind reminder to do something maybe", "/link/to/learn/more" % } { %
important "This rule has been deprecated in version x.xx", "/link/to/learn/more"
% }

```

----------------------------------------

TITLE: ESLint JSON Configuration Example
DESCRIPTION: An example of an ESLint configuration file in JSON format. It demonstrates setting root, extending recommended configurations, specifying a parser for TypeScript, defining plugins, and configuring rules and ignore patterns.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/use/configure/configuration-files-deprecated.md#_snippet_0

LANGUAGE: json
CODE:
```

{
 "root": true,
 "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
 "parser": "@typescript-eslint/parser",
 "parserOptions": { "project": ["./tsconfig.json"] },
 "plugins": ["@typescript-eslint"],
 "rules": {
  "@typescript-eslint/strict-boolean-expressions": [
   2,
   {
    "allowString": false,
    "allowNumber": false
   }
  ]
 },
 "ignorePatterns": ["src/**/*.test.ts", "src/frontend/generated/*"]
}

```

----------------------------------------

TITLE: Run ESLint Tests
DESCRIPTION: Executes the full test suite for ESLint. This command verifies your development environment setup and ensures code integrity. It includes linting, running tests on Node.js, checking code coverage, and generating browser-compatible builds.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/contribute/development-environment.md#_snippet_5

LANGUAGE: shell
CODE:
```

npm test

```

----------------------------------------

TITLE: Allowed Identifiers Matching Regex with `allow` Option (ESLint camelcase)
DESCRIPTION: This example demonstrates how the `allow` option can accept a regular expression to permit multiple identifiers that match a specific pattern, such as all identifiers starting with `UNSAFE_`, from being flagged by the `camelcase` rule.

SOURCE: https://github.com/eslint/eslint/blob/main/docs/src/rules/camelcase.md#_snippet_15

LANGUAGE: JavaScript
CODE:
```

/*eslint camelcase: ["error", {allow: ["^UNSAFE_"]}]*/

function UNSAFE_componentWillMount() {
    // ...
}

function UNSAFE_componentWillReceiveProps() {
    // ...
}

```
