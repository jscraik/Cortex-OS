========================
CODE SNIPPETS
========================

TITLE: Install Hyperfine and Node Modules
DESCRIPTION: Installs the 'hyperfine' benchmarking tool globally using Cargo and installs the necessary Node.js dependencies for running benchmarks.

SOURCE: <https://github.com/biomejs/biome/blob/main/benchmark/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
cargo install hyperfine
pnpm i
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.fr.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.ru.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.kr.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: HTML5 Boilerplate Setup
DESCRIPTION: This snippet demonstrates the core HTML5 Boilerplate structure, including a check for jQuery and a fallback script inclusion. It ensures a consistent starting point for web projects.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_formatter/tests/specs/prettier/html/basics/html5-boilerplate.html#_snippet_0>

LANGUAGE: html
CODE:

```
<!doctype html>
<html class="no-js" lang="">
  <head>
    <meta charset="utf-8">
    <title></title>
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="manifest" href="site.webmanifest">
    <link rel="apple-touch-icon" href="icon.png">
    <!-- Place favicon.ico in the root directory -->

    <link rel="stylesheet" href="css/normalize.css">
    <link rel="stylesheet" href="css/main.css">

    <meta name="theme-color" content="#fafafa">
  </head>
  <body>
    <!--[if IE]><p class="browserupgrade">You’re using an <strong>outdated</strong> browser. Please <a href="https://browsehappy.com/">upgrade your browser</a> to improve your experience and security.</p><![endif]-->

    <p>Hello world! This is HTML5 Boilerplate.</p>

    <script src="js/vendor/modernizr-3.11.2.min.js"></script>
    <script src="js/plugins.js"></script>
    <script src="js/main.js"></script>

    <!-- Google Analytics: change UA-XXXXX-Y to be your site's ID. -->
    <script>
        window.ga = function () { ga.q.push(arguments) }; ga.q = []; ga.l = +new Date;
        ga('create', 'UA-XXXXX-Y', 'auto'); ga('send', 'pageview');
    </script>
    <script async src="https://www.google-analytics.com/analytics.js"></script>
  </body>
</html>
```

----------------------------------------

TITLE: Install Just Tool
DESCRIPTION: Installs the 'just' command-line tool using Cargo, a utility for running scripts and tasks.

SOURCE: <https://github.com/biomejs/biome/blob/main/CONTRIBUTING.md#_snippet_2>

LANGUAGE: bash
CODE:

```
cargo install just
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs Biome as a development dependency for your project using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.ja.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.zh-CN.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Preact Hello World Example
DESCRIPTION: A simple example demonstrating how to render 'Hello World!' using Preact. It imports Preact components and renders an H1 element into the document body.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_formatter/tests/specs/prettier/html/script/babel.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
import { h, render } from 'https://unpkg.com/preact?module';
render( <h1>Hello World!</h1>, document.body );
```

----------------------------------------

TITLE: Node.js Development Setup for Biome
DESCRIPTION: Steps to set up the Node.js development environment for Biome, including installing pnpm, wasm-pack, and building the necessary packages for WebAssembly and JSON-RPC backends.

SOURCE: <https://github.com/biomejs/biome/blob/main/CONTRIBUTING.md#_snippet_20>

LANGUAGE: shell
CODE:

```
corepack enable
pnpm --filter "@biomejs/backend-jsonrpc" build
pnpm --filter "@biomejs/js-api" build:wasm-dev
pnpm --filter "@biomejs/js-api" build
pnpm i --filter "@biomejs/js-api" --frozen-lockfile
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs Biome as a development dependency in your project using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.zh-TW.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Full biome.json Configuration Example
DESCRIPTION: Presents an example of a full `biome.json` configuration file, using `full_options` to modify parsing mode. This allows for comprehensive configuration overrides and settings.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_analyze/CONTRIBUTING.md#_snippet_63>

LANGUAGE: jsonc
CODE:

```
{
  "linter": {
    "rules": {
      "style": {
        "useNamingConvention": "warn"
      }
    }
  },
  // ...
  "overrides": [
    {
      // Override useNamingConvention for external module typing declarations
      "include": ["typings/*.d.ts"],
      "linter": {
        "rules": {
          "style": {
            "useNamingConvention": "off"
          }
        }
      }
    }
  ]
}
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.pt-BR.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Example Array Parsing
DESCRIPTION: A simple JavaScript code snippet demonstrating a valid array structure that would be parsed.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_parser/CONTRIBUTING.md#_snippet_17>

LANGUAGE: javascript
CODE:

```
[ 1, 3, 6 ]
```

----------------------------------------

TITLE: Biome Development Workflow
DESCRIPTION: A step-by-step guide for the typical development workflow in Biome, from making code changes to submitting a Pull Request, emphasizing formatting, code generation, and testing.

SOURCE: <https://github.com/biomejs/biome/blob/main/CLAUDE.md#_snippet_5>

LANGUAGE: bash
CODE:

```
1. Make changes to source code
2. Run `just format` to format code
3. Run `just gen-all` if modifying grammars or adding rules
4. Run `just test` to verify changes
5. Use `just ready` before submitting PR (runs all CI checks)
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project using npm.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.uk.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: Cargo Test Command Examples
DESCRIPTION: Provides examples of how to run tests using the `cargo test` command. It covers running all tests, tests within a specific crate, tests within a specific module, and a single specific test.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/tests_macros/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
> cargo test                                            // all tests in all crates
> cargo test -p crate-name                              // all tests of one crate
> cargo test -p crate-name -- some_mod::                // all tests of one crate and one module
> cargo test -p crate-name -- some_mod::somefilename    // just one test
```

----------------------------------------

TITLE: Generate Grammar Command
DESCRIPTION: Demonstrates how to use the `just gen-grammar` command to generate parser files for specified languages. It shows examples for generating a single language, multiple languages, or all available languages.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_parser/CONTRIBUTING.md#_snippet_2>

LANGUAGE: shell
CODE:

```
# generate grammar of the HTML language
just gen-grammar html

# generate grammar of the HTML and CSS languages
just gen-grammar html css

# generate grammar of all languages
just gen-grammar
```

----------------------------------------

TITLE: Biome CLI Usage
DESCRIPTION: Provides examples of common Biome command-line interface (CLI) commands for formatting, linting, and checking project files.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_formatter/tests/specs/html/elements/pre-with-braille.html#_snippet_1>

LANGUAGE: bash
CODE:

```
# Format all files in the project
biome format --write .

# Lint all files in the project
biome lint --apply .

# Check the configuration
biome check --apply .

# Initialize Biome in the project
biome init
```

----------------------------------------

TITLE: Primary Development Commands
DESCRIPTION: Essential commands for setting up the development environment, formatting code, running tests, linting, and generating files using the 'just' task runner.

SOURCE: <https://github.com/biomejs/biome/blob/main/CLAUDE.md#_snippet_0>

LANGUAGE: bash
CODE:

```
just install-tools
just format
just test
just lint
just ready
just gen-all
```

----------------------------------------

TITLE: Biome Git Commit Example
DESCRIPTION: Example Git commands for staging and committing changes related to a new lint rule, following a conventional commit message format.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_analyze/CONTRIBUTING.md#_snippet_68>

LANGUAGE: shell
CODE:

```
> git add -A
> git commit -m 'feat(biome_js_analyze): myRuleName'
```

----------------------------------------

TITLE: Biome Configuration Example
DESCRIPTION: Example of Biome configuration file (`rome.json`) demonstrating how to ignore folders and files using Unix shell-style patterns for both the formatter and linter.

SOURCE: <https://github.com/biomejs/biome/blob/main/ROME_CHANGELOG.md#_snippet_43>

LANGUAGE: json
CODE:

```
{
  "formatter": {
    "ignore": ["scripts/*.js"]
  },
  "linter": {
    "ignore": ["src/**.test.{ts,js}"]
  }
}
```

----------------------------------------

TITLE: Installation: Rome via npm (next tag)
DESCRIPTION: Provides instructions on how to install the 'next' tag of Rome using npm, which includes the latest updates and the Rust rewrite.

SOURCE: <https://github.com/biomejs/biome/blob/main/ROME_CHANGELOG.md#_snippet_67>

LANGUAGE: shell
CODE:

```
npm i rome@next
```

----------------------------------------

TITLE: Examples of Well-Formatted Biome Commits
DESCRIPTION: Examples of commit messages that adhere to the Biome project's conventional commit standards, demonstrating correct formatting for different types of changes.

SOURCE: <https://github.com/biomejs/biome/blob/main/CONTRIBUTING.md#_snippet_22>

LANGUAGE: txt
CODE:

```
feat(compiler): implement parsing for new type of files
fix: fix nasty unhandled error
docs: fix link to website page
test(lint): add more cases to handle invalid rules
```

----------------------------------------

TITLE: Install Biome Development Tools
DESCRIPTION: Installs necessary development tools for Biome using the 'just' task runner, including cargo-binstall, cargo-insta, taplo-cli, and wasm-pack/wasm-tools.

SOURCE: <https://github.com/biomejs/biome/blob/main/CONTRIBUTING.md#_snippet_3>

LANGUAGE: bash
CODE:

```
just install-tools
```

----------------------------------------

TITLE: Using Options with Example Snippets
DESCRIPTION: Shows how a configuration option snippet can be followed by code snippets that use these options, marked with `use_options`. This demonstrates the application of custom rule configurations.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_analyze/CONTRIBUTING.md#_snippet_65>

LANGUAGE: json
CODE:

```
{
    "options": {
      "your-custom-option": "..."
    }
}
```

LANGUAGE: js
CODE:

```
var some_valid_example = true;
```

LANGUAGE: js
CODE:

```
var this_should_trigger_the_rule = true;
```

----------------------------------------

TITLE: Dynamic Import Examples (JavaScript)
DESCRIPTION: This section showcases JavaScript code examples related to dynamic imports in the BiomeJS project. It includes a test case for assertions within dynamic imports.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2015.md#_snippet_24>

LANGUAGE: javascript
CODE:

```
/* js/dynamic-import/assertions.js */
// Example demonstrating assertions within dynamic imports
```

LANGUAGE: javascript
CODE:

```
/* js/dynamic-import/test.js */
// General test case for dynamic imports
```

----------------------------------------

TITLE: Component Usage Example
DESCRIPTION: Demonstrates how to use a component within the Biome.js project, including passing arguments and utilizing helper functions.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_formatter/tests/specs/prettier/html/handlebars-venerable/template.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
{{component arg1='hey' arg2=(helper this.arg7 this.arg4) arg3=anotherone arg6=this.arg8}}
```

----------------------------------------

TITLE: Updating Prettier Snapshots
DESCRIPTION: This section provides a step-by-step guide to update the Prettier snapshot tests. It involves cloning the Prettier repository, cleaning up old test specs, installing dependencies, and running a Node.js script to prepare the new snapshots.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_json_formatter/tests/specs/prettier/README.md#_snippet_2>

LANGUAGE: shell
CODE:

```
# 1. Clone the Prettier git repository locally
git clone https://github.com/prettier/prettier.git

# 2. Remove all the directories inside crates/biome_json_formatter/tests/specs/prettier
# (Ensure all obsolete tests are removed)
rm -rf crates/biome_json_formatter/tests/specs/prettier/*

# 3. Go to crates/biome_formatter_test/src/prettier directory
cd crates/biome_formatter_test/src/prettier

# 4. Install prettier dependencies
pnpm install

# 5. Go to crates/biome_json_formatter/tests/specs/prettier directory
cd ../../../../biome_json_formatter/tests/specs/prettier

# 6. Run the snapshot preparation script
node ../../../../prettier/prepare_tests.js <prettier root directory>
```

----------------------------------------

TITLE: Biome Configuration Example
DESCRIPTION: An example of how to configure Biome's formatter settings using a `rome.json` file. This allows customization of indentation styles and other formatting preferences.

SOURCE: <https://github.com/biomejs/biome/blob/main/ROME_CHANGELOG.md#_snippet_60>

LANGUAGE: json
CODE:

```
{
  "root": true,
  "formatter": {
    "indentStyle": "space"
  }
}
```

----------------------------------------

TITLE: CSS Styling Example
DESCRIPTION: Demonstrates basic CSS styling for a web page, including styling for anchor tags and the body element.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_formatter/tests/specs/prettier/html/css/simple.html#_snippet_0>

LANGUAGE: css
CODE:

```
a {
  color: red;
}

body {
  background: navy;
  color: yellow;
}
```

----------------------------------------

TITLE: Console Usage Example
DESCRIPTION: Demonstrates how to use the Console trait to print formatted messages and diagnostics. It shows examples of using markup for emphasis and color, and how to log errors.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_console/README.md#_snippet_0>

LANGUAGE: rust
CODE:

```
console.message(markup! {
    <Info>"Processed "<Emphasis>{count}</Emphasis>" files"</Info>
});

console.diagnostic(
    &mut files,
    Diagnostics::error(file_id, code, title),
);
```

----------------------------------------

TITLE: CLI: lsp-proxy Options
DESCRIPTION: Introduces the `--config-path` option for the `lsp-proxy` and `start` commands, allowing users to specify a custom path for the `biome.json` configuration file when starting the Daemon server.

SOURCE: <https://github.com/biomejs/biome/blob/main/CHANGELOG_v1.md#_snippet_263>

LANGUAGE: APIDOC
CODE:

```
biome start --config-path=./custom/biome.json
lsp-proxy --config-path=./custom/biome.json
```

----------------------------------------

TITLE: HTML Content Example
DESCRIPTION: A simple example indicating that HTML content is present and considered 'cool'.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_parser/tests/html_specs/ok/special-chars.html#_snippet_1>

LANGUAGE: html
CODE:

```
<html>
<body>
  <h1>HTML is Cool</h1>
</body>
</html>
```

----------------------------------------

TITLE: Install Biome
DESCRIPTION: Installs the Biome package as a development dependency in your project using npm. The --save-exact flag ensures that the exact version is saved in package.json.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.hi.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm install --save-dev --save-exact @biomejs/biome
```

----------------------------------------

TITLE: JavaScript Generator Function Naming Convention
DESCRIPTION: Shows generator functions in JavaScript where the function name starts with 'get'.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2024+.md#_snippet_57>

LANGUAGE: javascript
CODE:

```
// js/generator/function-name-starts-with-get.js
// Prettier Similarity: 100.00%
```

----------------------------------------

TITLE: Changeset Frontmatter Example
DESCRIPTION: An example of the frontmatter for a changeset file, specifying the package and the type of change. The `@biomejs/biome` package is commonly used for the main Biome toolchain.

SOURCE: <https://github.com/biomejs/biome/blob/main/CONTRIBUTING.md#_snippet_24>

LANGUAGE: markdown
CODE:

```
---
"@biomejs/biome": patch
---

Description here...
```

----------------------------------------

TITLE: Initialize Fuzzers
DESCRIPTION: Installs cargo-fuzz and optionally downloads datasets to improve fuzzer efficacy. This step is crucial for initializing the shared corpus directory for all fuzzers.

SOURCE: <https://github.com/biomejs/biome/blob/main/fuzz/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
./fuzz/init-fuzzers.sh
```

----------------------------------------

TITLE: JavaScript Console Log Example
DESCRIPTION: An example of using console.log in JavaScript to output a variable.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_parser/tests/html_specs/ok/interpolation.html#_snippet_1>

LANGUAGE: javascript
CODE:

```
console.log( short_interpolation )
```

----------------------------------------

TITLE: Valid Example Snippets (Default Settings)
DESCRIPTION: Demonstrates valid code snippets that are analyzed using the rule's default options. These are marked with `options` or `full_options`.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_analyze/CONTRIBUTING.md#_snippet_60>

LANGUAGE: js
CODE:

```
var some_valid_example = true;
```

LANGUAGE: ts
CODE:

```
const some_invalid_example: UndeclaredType = false;
```

----------------------------------------

TITLE: Parsing a Single Node: Conditional Presence Test
DESCRIPTION: Shows an advanced presence test that considers multiple starting tokens for a rule, such as checking for `if` or `else` for an `if` statement.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_parser/CONTRIBUTING.md#_snippet_10>

LANGUAGE: rust
CODE:

```
if !p.at(T![if]) && !p.at(T![else]){
  return Absent
}
```

----------------------------------------

TITLE: Basic JavaScript Console Log
DESCRIPTION: A simple JavaScript snippet that logs 'Hello, world!' to the console. This is a fundamental example of outputting information.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_parser/tests/html_specs/ok/embedded-languages/script-basic.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
console.log('Hello, world!');
```

----------------------------------------

TITLE: JavaScript Alert Example
DESCRIPTION: A simple JavaScript snippet that displays an alert box with the message '1'. This is a basic client-side scripting example.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_html_formatter/tests/specs/prettier/html/bracket-same-line/embed.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
alert(1)
```

----------------------------------------

TITLE: JavaScript End of Line Example
DESCRIPTION: This snippet provides an example related to the end of a line in JavaScript, with 100% similarity to Prettier.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report.md#_snippet_82>

LANGUAGE: javascript
CODE:

```
### js/end-of-line/example.js

**Prettier Similarity**: 100.00%
```

----------------------------------------

TITLE: Rule Development Commands
DESCRIPTION: Commands for creating, testing, and managing lint rules within the Biome project, supporting JavaScript, CSS, JSON, and GraphQL.

SOURCE: <https://github.com/biomejs/biome/blob/main/CLAUDE.md#_snippet_2>

LANGUAGE: bash
CODE:

```
just new-js-lintrule ruleName
just new-css-lintrule ruleName
just new-json-lintrule ruleName
just new-graphql-lintrule ruleName
just test-lintrule ruleName
just move-rule stable ruleName
```

----------------------------------------

TITLE: Biome CLI Daemonless Mode
DESCRIPTION: Demonstrates starting the Biome daemon in daemonless mode via the CLI. This command initiates the daemon process, which logs its activity to the cache folder.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_service/CONTRIBUTING.md#_snippet_0>

LANGUAGE: bash
CODE:

```
cargo run --bin=biome -- start
```

----------------------------------------

TITLE: Biome CLI Usage
DESCRIPTION: Demonstrates common Biome command-line interface commands for formatting, linting, and checking code.

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/biome/README.ja.md#_snippet_1>

LANGUAGE: shell
CODE:

```
# Format files
npx @biomejs/biome format --write ./src

# Lint files
npx @biomejs/biome lint ./src

# Check and apply safe suggestions
npx @biomejs/biome check --write ./src

# Check formatting and linting in CI environments
npx @biomejs/biome ci ./src
```

----------------------------------------

TITLE: Install Prettier Test Dependencies
DESCRIPTION: Install the necessary Node.js dependencies for the Prettier test suite using pnpm. This step is a prerequisite for preparing or updating the test snapshots from the Prettier repository.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_graphql_formatter/tests/specs/prettier/README.md#_snippet_2>

LANGUAGE: Shell
CODE:

```
pnpm install
```

----------------------------------------

TITLE: JavaScript Range Formatting Example
DESCRIPTION: Shows examples of code formatting adjustments related to ranges, including changes in function call spacing and numeric literal formatting.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2024+.md#_snippet_75>

LANGUAGE: javascript
CODE:

```
function a(
){
  a (
);
  b();
  c(); d(
);

 }
```

LANGUAGE: javascript
CODE:

```
a (
);
b();
c(); d(
 );
```

LANGUAGE: javascript
CODE:

```
foo = 1.0000;bar = 1.0;baz=1.0000;
 // The range will be 13~26
 // `foo` ends at 13, should not format
 // `bar` ends at 26, should format
```

LANGUAGE: javascript
CODE:

```
class a {
  b() {}
}

let    x
```

LANGUAGE: javascript
CODE:

```
call(
  1, 2,3
);

call(1, 2, 3);

call(1, 2, 3);

call(
  1, 2,3
);
```

----------------------------------------

TITLE: Install Biome JavaScript Bindings
DESCRIPTION: Installs the core JavaScript API and a specific WASM distribution for Biome. Choose the WASM package that matches your environment (bundler, Node.js, or web).

SOURCE: <https://github.com/biomejs/biome/blob/main/packages/@biomejs/js-api/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm i @biomejs/js-api
npm i @biomejs/wasm-<dist>
```

----------------------------------------

TITLE: Install Biome Nightly Release
DESCRIPTION: Installs the latest nightly release of the Biome CLI tool as a development dependency. This command is useful for testing the most recent features and fixes.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-challenge.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npm install -D @biomejs/biome@1.3.3-nightly.ced82da
```

----------------------------------------

TITLE: File Start with Comment JavaScript Code
DESCRIPTION: This snippet includes JavaScript code for files that start with a comment, demonstrating 100% similarity to Prettier formatting.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2024+.md#_snippet_30>

LANGUAGE: javascript
CODE:

```
/* js/cursor/file-start-with-comment-1.js */
// Prettier Similarity: 100.00%
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/file-start-with-comment-2.js */
// Prettier Similarity: 100.00%
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/file-start-with-comment-3.js */
// Prettier Similarity: 100.00%
```

----------------------------------------

TITLE: Biome Testing Strategy
DESCRIPTION: Details the various testing methodologies employed by Biome, including spec tests using snapshot testing, quick tests for rapid iteration, Prettier compatibility checks, and fuzz testing.

SOURCE: <https://github.com/biomejs/biome/blob/main/CLAUDE.md#_snippet_4>

LANGUAGE: bash
CODE:

```
# Spec Tests: Snapshot testing with .snap files (use `cargo insta`)
# Quick Tests: `just test-quick package` for rapid iteration
# Prettier Compatibility: Automated comparison tests
# Fuzz Testing: In `/fuzz/` directory
```

----------------------------------------

TITLE: Biome CLI Commands
DESCRIPTION: Examples of common Biome CLI commands, including checking diagnostics and initializing a project. The `--max-diagnostics` argument controls the output verbosity.

SOURCE: <https://github.com/biomejs/biome/blob/main/ROME_CHANGELOG.md#_snippet_61>

LANGUAGE: bash
CODE:

```
rome check --max-diagnostics 50
ome init
```

----------------------------------------

TITLE: JavaScript Ignore Directive Formatting Examples
DESCRIPTION: A collection of examples showcasing the `// prettier-ignore` directive in various JavaScript contexts, including simple ignores, issue-specific cases, and formatting of array literals.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2024+.md#_snippet_67>

LANGUAGE: javascript
CODE:

```
// prettier-ignore
function HelloWorld(x) {
  // prettier-ignore
  // eslint-disable-next-line
  (x.a |
    x.b).call(null);
}

function HelloWorld(x) {
  // prettier-ignore

  (
    // eslint-disable-next-line
    x.a |
    x.b
  ).call(null)
}

```

LANGUAGE: javascript
CODE:

```
oneArgument(
  // prettier-ignore
  (0, 1),
);

a =
  // prettier-ignore
  (0, 1);
```

LANGUAGE: javascript
CODE:

```
async function foo() {
  (
   // prettier-ignore
   // b
 await thing()
).blah
}
```

LANGUAGE: javascript
CODE:

```
export default function test() {
  return {
    matrix: // prettier-ignore
      new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
  };
}
```

----------------------------------------

TITLE: JSX Await Example
DESCRIPTION: Demonstrates the usage of `await` within JSX expressions. It shows how to await promises and access properties of objects within JSX.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report.md#_snippet_158>

LANGUAGE: JSX
CODE:

```
async function testFunction() {
  const short = (
    <>
      {await Promise.all(hierarchyCriticism)}
      {await hierarchyCriticism.ic.me.oa.p}
      {await hierarchyCriticism}

      {Promise.all(hierarchyCriticism)}
      {hierarchyCriticism.ic.me.oa.p}
      {hierarchyCriticism}
    </>
  );

  const long = (
    <>
      {
        await Promise.all(
          hierarchyCriticismIncongruousCooperateMaterialEducationOriginalArticulateParameter,
        )
      }
      {
        await hierarchyCriticism.IncongruousCooperate.MaterialEducation
          .OriginalArticulate.Parameter
      }
      {
        await hierarchyCriticismIncongruousCooperateMaterialEducationOriginalArticulateParameter
      }

      {Promise.all(
        hierarchyCriticismIncongruousCooperateMaterialEducationOriginalArticulateParameter,
      )}
      {
        hierarchyCriticism.IncongruousCooperate.MaterialEducation
          .OriginalArticulate.Parameter
      }
      {
        hierarchyCriticismIncongruousCooperateMaterialEducationOriginalArticulateParameter
      }
    </>
  );

  const jsx = (
    <>
      {
        await (
          <IncongruousCooperate>
            material education original articulate parameter
          </IncongruousCooperate>
        )
      }
    </>
  );
}
```

----------------------------------------

TITLE: Method Chain Formatting in JavaScript
DESCRIPTION: A comprehensive set of examples covering various aspects of method chain formatting in JavaScript. This includes handling different bracket styles, comments, arguments, and specific library usages like Cypress and D3.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2015.md#_snippet_45>

LANGUAGE: javascript
CODE:

```
js/method-chain/13018.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/bracket_0-1.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/bracket_0.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/break-last-call.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/break-last-member.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/break-multiple.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/comment.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/complex-args.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/computed-merge.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/computed.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/conditional.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/cypress.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/d3.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/first_long.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/fluent-configuration.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/inline_merge.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/issue-11298.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/issue-3594.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/issue-3621.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/issue-4125.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/logical.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/multiple-members.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/object-literal.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/pr-7889.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/print-width-120/constructor.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/print-width-120/issue-7884.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/short-names.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/simple-args.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/square_0.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/test.js
```

LANGUAGE: javascript
CODE:

```
js/method-chain/this.js
```

----------------------------------------

TITLE: JavaScript Destructuring Assignment Examples
DESCRIPTION: This section provides examples of JavaScript destructuring assignments, including a specific test case for issue 5988.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report.md#_snippet_73>

LANGUAGE: javascript
CODE:

```
/*
 * js/destructuring/destructuring.js
 */

// Prettier Similarity: 100.00%
```

LANGUAGE: javascript
CODE:

```
/*
 * js/destructuring/issue-5988.js
 */

// Prettier Similarity: 100.00%
```

----------------------------------------

TITLE: Run Prettier Benchmarks with xargs
DESCRIPTION: An example command used for benchmarking Prettier's performance. It finds JavaScript files and formats them in parallel using `xargs -P` and `npx prettier`, logging only errors.

SOURCE: <https://github.com/biomejs/biome/blob/main/benchmark/README.md#_snippet_5>

LANGUAGE: bash
CODE:

```
time find lib/ examples declarations benchmark -name '*.js' -print0 | xargs -P8 -0 -n 200 npx prettier --write --loglevel=error
```

----------------------------------------

TITLE: JavaScript Call Argument Expansion Examples
DESCRIPTION: Demonstrates various scenarios of argument expansion within JavaScript function calls. These examples are likely used for testing or showcasing specific behaviors related to how arguments are passed and processed.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report.md#_snippet_46>

LANGUAGE: javascript
CODE:

```
js/call/first-argument-expansion/issue-5172.js
```

LANGUAGE: javascript
CODE:

```
js/call/first-argument-expansion/jsx.js
```

LANGUAGE: javascript
CODE:

```
js/call/first-argument-expansion/test.js
```

----------------------------------------

TITLE: Cursor Handling Examples (JavaScript)
DESCRIPTION: This section contains various JavaScript code snippets related to cursor handling within the BiomeJS project. These examples likely cover different scenarios and edge cases for managing cursors in code.

SOURCE: <https://github.com/biomejs/biome/blob/main/crates/biome_js_formatter/report-es2015.md#_snippet_22>

LANGUAGE: javascript
CODE:

```
/* js/cursor/comments-1.js */
// Content related to cursor handling with comments
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/comments-2.js */
// Content related to cursor handling with comments
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/comments-3.js */
// Content related to cursor handling with comments
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/comments-4.js */
// Content related to cursor handling with comments
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-0.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-1.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-10.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-2.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-3.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-4.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-5.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-6.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-7.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-8.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-9.js */
// General cursor handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/cursor-emoji.js */
// Cursor handling with emoji characters
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/file-start-with-comment-1.js */
// Cursor handling when file starts with a comment
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/file-start-with-comment-2.js */
// Cursor handling when file starts with a comment
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/file-start-with-comment-3.js */
// Cursor handling when file starts with a comment
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-0.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-1.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-2.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-3.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-4.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-5.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-6.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-7.js */
// Cursor range handling example
```

LANGUAGE: javascript
CODE:

```
/* js/cursor/range-8.js */
// Cursor range handling example
```
