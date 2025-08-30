========================
CODE SNIPPETS
========================

TITLE: Install Dependencies with Yarn
DESCRIPTION: This command installs all necessary project dependencies using Yarn. Ensure Yarn is installed on your system; for Windows users, installation might require Node.js or Chocolatey. This step is crucial before running any project scripts.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/code/additional-space.md#_snippet_1>

LANGUAGE: sh
CODE:

```
yarn install
```

---

TITLE: Check Yarn Version
DESCRIPTION: This command verifies that Yarn is installed correctly and displays its current version. It's a good practice to run this after installation to confirm the setup.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/code/additional-space.md#_snippet_2>

LANGUAGE: sh
CODE:

```
yarn --version
```

---

TITLE: Shell Command for Global npm Package Installation
DESCRIPTION: A shell command demonstrating the global installation of an npm package named 'foo' using `npm i -g`.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/mdx/mdx/mixed.mdx#_snippet_4>

LANGUAGE: shell
CODE:

```
npm i -g foo
```

---

TITLE: Clone Repository and Create Branch
DESCRIPTION: This snippet demonstrates how to clone the Prettier repository from GitHub and create a new local branch for development. It requires Git to be installed and assumes you have a GitHub account. Remember to replace `<your_username>` with your actual GitHub username.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/code/additional-space.md#_snippet_0>

LANGUAGE: sh
CODE:

```
git clone https://github.com/<your_username>/jest
cd jest
git checkout -b my_branch
```

---

TITLE: Start Prettier Website Development Server
DESCRIPTION: Starts the local development server for the Prettier website using Docusaurus. This command should be run from the 'website' directory. Changes are reflected on refresh without restarting the server.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/README.md#_snippet_1>

LANGUAGE: sh
CODE:

```
cd website
yarn start
```

---

TITLE: Initial Setup and Testing Commands
DESCRIPTION: Commands to install project dependencies, run the test suite, update Jest snapshots, and review code changes. Essential for setting up a development environment.

SOURCE: <https://github.com/prettier/prettier/blob/main/CONTRIBUTING.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn
yarn test
```

---

TITLE: Install Husky and Lint-Staged (bun)
DESCRIPTION: Installs husky and lint-staged as development dependencies using bun and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_8>

LANGUAGE: bash
CODE:

```
bun add --dev husky lint-staged
bunx husky init
bun --eval "fs.writeFileSync('.husky/pre-commit','bunx lint-staged\n')"
```

---

TITLE: Install Neoformat with vim-plug
DESCRIPTION: Demonstrates how to install the Neoformat plugin for Vim using the vim-plug package manager. Neoformat is a generalized lint/format engine that supports Prettier.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/vim.md#_snippet_0>

LANGUAGE: vimscript
CODE:

```
Plug 'sbdchd/neoformat'
```

---

TITLE: Install Husky and Lint-Staged (bun)
DESCRIPTION: Installs husky and lint-staged as development dependencies using bun and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_8>

LANGUAGE: bash
CODE:

```
bun add --dev husky lint-staged
bunx husky init
bun --eval "fs.writeFileSync('.husky/pre-commit','bunx lint-staged\n')"
```

---

TITLE: Install Neoformat with vim-plug
DESCRIPTION: Demonstrates how to install the Neoformat plugin for Vim using the vim-plug package manager. Neoformat is a generalized lint/format engine that supports Prettier.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/vim.md#_snippet_0>

LANGUAGE: vimscript
CODE:

```
Plug 'sbdchd/neoformat'
```

---

TITLE: Executing a Shell Command
DESCRIPTION: Provides an example of a common shell command used for global installation of a package. This is typically used for command-line tools.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/mdx/mdx/mixed.mdx#_snippet_1>

LANGUAGE: sh
CODE:

```
npm i -g foo
```

---

TITLE: Install coc-prettier
DESCRIPTION: Provides the command to install the coc-prettier extension for coc.nvim, which enables Prettier integration within the editor.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/vim.md#_snippet_11>

LANGUAGE: vimscript
CODE:

```
CocInstall coc-prettier
```

---

TITLE: Install coc.nvim with vim-plug
DESCRIPTION: Shows how to install the coc.nvim plugin manager for Vim using vim-plug. coc.nvim is a powerful LSP client and autocompletion engine.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/vim.md#_snippet_10>

LANGUAGE: vimscript
CODE:

```
Plug 'neoclide/coc.nvim', {'branch': 'release'}
```

---

TITLE: Install coc.nvim with vim-plug
DESCRIPTION: Shows how to install the coc.nvim plugin manager for Vim using vim-plug. coc.nvim is a powerful LSP client and autocompletion engine.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/vim.md#_snippet_10>

LANGUAGE: vimscript
CODE:

```
Plug 'neoclide/coc.nvim', {'branch': 'release'}
```

---

TITLE: Install Husky and Lint-Staged (yarn)
DESCRIPTION: Installs husky and lint-staged as development dependencies using yarn and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_6>

LANGUAGE: bash
CODE:

```
yarn add --dev husky lint-staged
npx husky init
node --eval "fs.writeFileSync('.husky/pre-commit','yarn lint-staged\n')"
```

---

TITLE: Install Husky and Lint-Staged (pnpm)
DESCRIPTION: Installs husky and lint-staged as development dependencies using pnpm and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_7>

LANGUAGE: bash
CODE:

```
pnpm add --save-dev husky lint-staged
pnpm exec husky init
node --eval "fs.writeFileSync('.husky/pre-commit','pnpm exec lint-staged\n')"
```

---

TITLE: Install Husky and Lint-Staged (npm)
DESCRIPTION: Installs husky and lint-staged as development dependencies using npm and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_5>

LANGUAGE: bash
CODE:

```
npm install --save-dev husky lint-staged
npx husky init
node --eval "fs.writeFileSync('.husky/pre-commit','npx lint-staged\n')"
```

---

TITLE: Install coc-prettier
DESCRIPTION: Provides the command to install the coc-prettier extension for coc.nvim, which enables Prettier integration within the editor.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/vim.md#_snippet_11>

LANGUAGE: vimscript
CODE:

```
CocInstall coc-prettier
```

---

TITLE: Rust Hello World Example
DESCRIPTION: A basic Rust program that prints a message to the console. This example demonstrates the use of the `println!` macro for outputting text.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/footnoteDefinition/multiline.md#_snippet_0>

LANGUAGE: Rust
CODE:

```
fn main() {
    println!("this is some Rust!");
}
```

---

TITLE: Install Husky and Lint-Staged (yarn)
DESCRIPTION: Installs husky and lint-staged as development dependencies using yarn and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_6>

LANGUAGE: bash
CODE:

```
yarn add --dev husky lint-staged
npx husky init
node --eval "fs.writeFileSync('.husky/pre-commit','yarn lint-staged\n')"
```

---

TITLE: Install ALE with vim-plug
DESCRIPTION: Shows how to install the Asynchronous Lint Engine (ALE) plugin for Vim using vim-plug. ALE is a generalized linting and formatting tool that supports Prettier.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/vim.md#_snippet_5>

LANGUAGE: vimscript
CODE:

```
Plug 'dense-analysis/ale'
```

---

TITLE: Install Husky and Lint-Staged (pnpm)
DESCRIPTION: Installs husky and lint-staged as development dependencies using pnpm and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_7>

LANGUAGE: bash
CODE:

```
pnpm add --save-dev husky lint-staged
pnpm exec husky init
node --eval "fs.writeFileSync('.husky/pre-commit','pnpm exec lint-staged\n')"
```

---

TITLE: Prettier Configuration Example
DESCRIPTION: A basic example of a Prettier configuration file (.prettierrc) specifying print width and parser.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/markdown/real-world-case.md#_snippet_31>

LANGUAGE: json
CODE:

```
{
  "printWidth": 100,
  "parser": "flow"
}
```

---

TITLE: Install Husky and Lint-Staged (npm)
DESCRIPTION: Installs husky and lint-staged as development dependencies using npm and initializes husky. It then sets up a pre-commit hook to run lint-staged.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_5>

LANGUAGE: bash
CODE:

```
npm install --save-dev husky lint-staged
npx husky init
node --eval "fs.writeFileSync('.husky/pre-commit','npx lint-staged\n')"
```

---

TITLE: Statement Context Examples
DESCRIPTION: Shows how to execute actions or methods in response to events using parentheses for event binding. Covers component context, $event, and template reference variables.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_2>

LANGUAGE: template
CODE:

```
Component statement context ( (click)="onSave() )

Delete hero

Template $event statement context

Save

Template input variable statement context (let hero)

{{hero.name}}

Template reference variable statement context (#heroForm)

...
```

---

TITLE: Initialize Vue App and Data Binding
DESCRIPTION: Demonstrates the basic setup of a Vue.js application instance. It initializes the app, targets an HTML element, and binds data to the view using template syntax.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/vue/html-vue/hello-world.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
var app = new Vue({ el: '#app', data: { message: 'Hello Vue!' } })
```

LANGUAGE: html
CODE:

```
{{ message }}
```

---

TITLE: Install Husky.Net for Prettier Pre-commit Hook
DESCRIPTION: This snippet demonstrates installing and setting up Husky.Net, a .NET solution for managing pre-commit hooks. It includes commands to initialize the tool, install it, and add a pre-commit hook, allowing integration with Prettier and other .NET tools.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/precommit.md#_snippet_2>

LANGUAGE: bash
CODE:

```
dotnet new tool-manifest
dotnet tool install husky
dotnet husky install
dotnet husky add pre-commit
```

---

TITLE: Install ALE with vim-plug
DESCRIPTION: Shows how to install the Asynchronous Lint Engine (ALE) plugin for Vim using vim-plug. ALE is a generalized linting and formatting tool that supports Prettier.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/vim.md#_snippet_5>

LANGUAGE: vimscript
CODE:

```
Plug 'dense-analysis/ale'
```

---

TITLE: Configure Neoformat for Local Prettier
DESCRIPTION: Sets a Neoformat option to prioritize using a project-local installation of Prettier (e.g., from node_modules/.bin/prettier) over a globally installed version.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/vim.md#_snippet_1>

LANGUAGE: vimscript
CODE:

```
let g:neoformat_try_node_exe = 1
```

---

TITLE: Install Husky.Net for Prettier Pre-commit Hook
DESCRIPTION: This snippet demonstrates installing and setting up Husky.Net, a .NET solution for managing pre-commit hooks. It includes commands to initialize the tool, install it, and add a pre-commit hook, allowing integration with Prettier and other .NET tools.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/precommit.md#_snippet_2>

LANGUAGE: bash
CODE:

```
dotnet new tool-manifest
dotnet tool install husky
dotnet husky install
dotnet husky add pre-commit
```

---

TITLE: Prettier Documentation Front Matter
DESCRIPTION: Example front matter for documentation files written in Markdown. It defines metadata like ID, title, layout, category, permalink, and navigation links for Docusaurus.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/README.md#_snippet_2>

LANGUAGE: yaml
CODE:

```
id: doc1
title: Document Title
layout: docs1
category: Sidebar Category 1
permalink: docs/doc1.html
previous: doc0
next: doc2
---

```

---

TITLE: Prettier Blog Post Front Matter
DESCRIPTION: Example front matter for blog posts written in Markdown. It includes the post title and author reference. A '<!-- truncate -->' comment is used to define the preview text.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/README.md#_snippet_3>

LANGUAGE: yaml
CODE:

```
title: Blog Post Title
authors: author declared in `blog/authors.yml`
---
<!-- truncate -->

```

---

TITLE: Configure Neoformat for Local Prettier
DESCRIPTION: Sets a Neoformat option to prioritize using a project-local installation of Prettier (e.g., from node_modules/.bin/prettier) over a globally installed version.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/vim.md#_snippet_1>

LANGUAGE: vimscript
CODE:

```
let g:neoformat_try_node_exe = 1
```

---

TITLE: Property Binding Examples
DESCRIPTION: Demonstrates binding component properties to element properties using square brackets. Includes examples with interpolation and direct property binding.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_3>

LANGUAGE: template
CODE:

```
Cancel is disabled

[ngClass] binding to the classes property


![]({{heroImageUrl}}) is the _interpolated_ image.

 is the _property bound_ image.

"{{title}}" is the _interpolated_ title.

"" is the _property bound_ title.

"{{evilTitle}}" is the _interpolated_ evil title.

"" is the _property bound_ evil title.
```

---

TITLE: JSON Configuration Examples
DESCRIPTION: Demonstrates common JSON configurations used within the project. These examples show valid JSON structures for various settings, including boolean flags and array-based configurations.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/html/script/script.html#_snippet_0>

LANGUAGE: json
CODE:

```
{
  "json": true
}
```

LANGUAGE: json
CODE:

```
{
  "json": false
}
```

LANGUAGE: json
CODE:

```
{
  "prerender": [
    {
      "source": "list",
      "urls": [
        "https://a.test/foo"
      ]
    }
  ]
}
```

---

TITLE: YAML Configuration Example
DESCRIPTION: This snippet showcases a basic YAML configuration structure. YAML is often used for configuration files due to its human-readable format. This example defines a simple key-value pair.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/list/issue-17652.md#_snippet_0>

LANGUAGE: yaml
CODE:

```
---
foo: bar

```

---

TITLE: Initialize Vue.js App
DESCRIPTION: This snippet demonstrates the fundamental way to start a Vue.js application. It targets a specific DOM element by its ID and initializes the application's reactive data.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/misc/errors/vue/upper-case.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
new Vue({
  el: '#app',
  data: function() {
    return {
      value: '1'
    }
  }
})
```

---

TITLE: Class Binding Examples
DESCRIPTION: Shows how to dynamically add or remove CSS classes from elements using square bracket syntax. Includes examples with special characters and standard class names.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_5>

LANGUAGE: template
CODE:

```
Bad curly special

Bad curly

The class binding is special

This one is not so special

This class binding is special too
```

---

TITLE: Attribute Binding Examples
DESCRIPTION: Illustrates binding component data to element attributes using square brackets. Shows examples with standard attributes and ARIA attributes.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_4>

LANGUAGE: template
CODE:

```
One-Two

Five

Six

{{actionName}} with Aria


Disabled Disabled as well Enabled (but inert)
```

---

TITLE: runFormatTest Usage Examples
DESCRIPTION: Illustrative examples of how to invoke the `runFormatTest` function within test files, demonstrating basic usage and passing custom formatting options.

SOURCE: <https://github.com/prettier/prettier/blob/main/CONTRIBUTING.md#_snippet_3>

LANGUAGE: javascript
CODE:

```
runFormatTest(import.meta, ["babel", "flow", "typescript"]);
```

LANGUAGE: javascript
CODE:

```
runFormatTest(import.meta, ["babel"], { trailingComma: "es5" });
```

---

TITLE: Configure pretty-quick with simple-git-hooks
DESCRIPTION: This section details setting up Prettier with `pretty-quick` and `simple-git-hooks` for pre-commit formatting. It includes installation commands and configuration for the `.simple-git-hooks.json` file, supporting multiple package managers.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/precommit.md#_snippet_1>

LANGUAGE: npm
CODE:

```
npm install --save-dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "npx pretty-quick --staged"
}
' > .simple-git-hooks.json
npx simple-git-hooks
```

LANGUAGE: yarn
CODE:

```
yarn add --dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "yarn pretty-quick --staged"
}
' > .simple-git-hooks.json
yarn simple-git-hooks
```

LANGUAGE: pnpm
CODE:

```
pnpm add --save-dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "pnpm pretty-quick --staged"
}
' > .simple-git-hooks.json
pnpm simple-git-hooks
```

LANGUAGE: bun
CODE:

```
bun add --dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "bun pretty-quick --staged"
}
' > .simple-git-hooks.json
bun simple-git-hooks
```

---

TITLE: Code Block Example 2
DESCRIPTION: Another code block containing 'foo' and 'bar' text, presented as a distinct example.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-222.md#_snippet_1>

LANGUAGE: text
CODE:

```
foo


bar
```

---

TITLE: Configure pretty-quick with simple-git-hooks
DESCRIPTION: This section details setting up Prettier with `pretty-quick` and `simple-git-hooks` for pre-commit formatting. It includes installation commands and configuration for the `.simple-git-hooks.json` file, supporting multiple package managers.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/precommit.md#_snippet_1>

LANGUAGE: npm
CODE:

```
npm install --save-dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "npx pretty-quick --staged"
}
' > .simple-git-hooks.json
npx simple-git-hooks
```

LANGUAGE: yarn
CODE:

```
yarn add --dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "yarn pretty-quick --staged"
}
' > .simple-git-hooks.json
yarn simple-git-hooks
```

LANGUAGE: pnpm
CODE:

```
pnpm add --save-dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "pnpm pretty-quick --staged"
}
' > .simple-git-hooks.json
pnpm simple-git-hooks
```

LANGUAGE: bun
CODE:

```
bun add --dev simple-git-hooks pretty-quick
echo '{
  "pre-commit": "bun pretty-quick --staged"
}
' > .simple-git-hooks.json
bun simple-git-hooks
```

---

TITLE: Style Binding Examples
DESCRIPTION: Demonstrates how to dynamically apply inline styles to elements using square bracket syntax. Allows binding to CSS properties like color and font-size.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_6>

LANGUAGE: template
CODE:

```
Red Save Big Small
```

---

TITLE: Event Binding Examples
DESCRIPTION: Explains how to respond to user interactions like clicks by binding events to component methods. Covers event propagation and custom event handlers.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_7>

LANGUAGE: template
CODE:

```
Save On Save

click with myClick

{{clickMessage}}


Click me

Click me too!

Save, no propagation

Save w/ propagation
```

---

TITLE: Build Static Prettier Website
DESCRIPTION: Generates a static build of the Prettier website. The output is placed in the 'website/build/' directory.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/README.md#_snippet_4>

LANGUAGE: sh
CODE:

```
yarn build
```

---

TITLE: Install Prettier Locally
DESCRIPTION: Installs Prettier as a development dependency for your project using various package managers. It's recommended to save Prettier with an exact version to ensure consistent formatting across your team.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_0>

LANGUAGE: npm
CODE:

```
npm install --save-dev --save-exact prettier
```

LANGUAGE: yarn
CODE:

```
yarn add --dev --exact prettier
```

LANGUAGE: pnpm
CODE:

```
pnpm add --save-dev --save-exact prettier
```

LANGUAGE: bun
CODE:

```
bun add --dev --exact prettier
```

---

TITLE: Interpolation Examples
DESCRIPTION: Demonstrates how to display dynamic data within templates using double curly braces. Supports expressions and function calls.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_0>

LANGUAGE: template
CODE:

```
My current hero is {{currentHero.name}}

### {{title}} ![]({{heroImageUrl}})

The sum of 1 + 1 is {{1 + 1}}

The sum of 1 + 1 is not {{1 + 1 + getVal()}}
```

---

TITLE: Example Code Block
DESCRIPTION: This snippet contains a basic code block. It serves as a placeholder for actual code examples and demonstrates content structure.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-108.md#_snippet_0>

LANGUAGE: text
CODE:

```
bar
```

---

TITLE: Expression Context Examples
DESCRIPTION: Illustrates how expressions can access data from different contexts within a template, including component properties, template input variables, and template reference variables.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_1>

LANGUAGE: template
CODE:

```
Component expression context ({{title}}, [hidden]="isUnchanged")

{{title}} changed

Template input variable expression context (let hero)

{{hero.name}}

Template reference variable expression context (#heroInput)

Type something:  {{heroInput.value}}
```

---

TITLE: Install Prettier Locally
DESCRIPTION: Installs Prettier as a development dependency for your project using various package managers. It's recommended to save Prettier with an exact version to ensure consistent formatting across your team.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_0>

LANGUAGE: npm
CODE:

```
npm install --save-dev --save-exact prettier
```

LANGUAGE: yarn
CODE:

```
yarn add --dev --exact prettier
```

LANGUAGE: pnpm
CODE:

```
pnpm add --save-dev --save-exact prettier
```

LANGUAGE: bun
CODE:

```
bun add --dev --exact prettier
```

---

TITLE: Prettier Formatting Example
DESCRIPTION: A basic example showcasing content that can be formatted by Prettier. This snippet demonstrates how Prettier handles whitespace and indentation.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-100.md#_snippet_0>

LANGUAGE: text
CODE:

```
aaa
 aaa
aaa
```

---

TITLE: Visual Studio Code Installation Command
DESCRIPTION: Command to install the Prettier extension for Visual Studio Code directly from the extensions sidebar.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/markdown/real-world-case.md#_snippet_35>

LANGUAGE: shell
CODE:

```
ext install prettier-vscode
```

---

TITLE: Input and Output Binding
DESCRIPTION: Illustrates how to bind to component inputs and outputs using property binding and event binding syntax. This example shows saving data and handling custom click events.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_18>

LANGUAGE: Angular Template
CODE:

```
 Save
```

LANGUAGE: Angular Template
CODE:

```
myClick2
```

LANGUAGE: Angular Template
CODE:

```
{{clickMessage2}}
```

---

TITLE: Basic Content Example
DESCRIPTION: A simple example of content found within the project.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/code/leading-trailing-newlines.md#_snippet_0>

LANGUAGE: plaintext
CODE:

```
123
```

---

TITLE: JavaScript Function Example: myFunction
DESCRIPTION: This snippet demonstrates a simple JavaScript function named `myFunction`. It imports a library from a local file and returns a string value. This is a basic example of JavaScript syntax.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/html/cursor/cursor-5.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
import lib from './lib.js';
function myFunction() {
  return 'foo';
}
```

---

TITLE: Basic Code Example
DESCRIPTION: A fundamental code snippet demonstrating basic syntax. This example is language-agnostic and serves as a placeholder.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-605.md#_snippet_0>

LANGUAGE: plaintext
CODE:

```
code
span
```

---

TITLE: Form Submission Example
DESCRIPTION: A basic example of a form submission in an Angular template, showing input fields and a submit button. It includes binding to a submit message variable.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_24>

LANGUAGE: Angular Template
CODE:

```
Name

Submit

{{submitMessage}}
```

---

TITLE: NgSwitch Binding Example
DESCRIPTION: Shows how to use the NgSwitch directive for conditional rendering based on different cases. This example demonstrates binding to a variable to switch between different template content.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_16>

LANGUAGE: Angular Template
CODE:

```
{{h.name}}
```

LANGUAGE: Angular Template
CODE:

```
Are you as confused as {{currentHero.name}}?
```

---

TITLE: Install Prettier Oxc Plugin
DESCRIPTION: Installs the @prettier/plugin-oxc package and its peer dependency, prettier, as development dependencies using yarn. This command sets up the necessary tools for using the Oxc formatter with Prettier.

SOURCE: <https://github.com/prettier/prettier/blob/main/packages/plugin-oxc/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn add --dev prettier @prettier/plugin-oxc
```

---

TITLE: Simple JavaScript Addition
DESCRIPTION: This snippet demonstrates a basic arithmetic operation in JavaScript. It shows the syntax for adding two numbers. This example requires no external libraries or setup.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/misc/embedded_language_formatting/in-markdown/test.md#_snippet_0>

LANGUAGE: javascript
CODE:

```
1 +  2
```

---

TITLE: Basic Code Example
DESCRIPTION: A simple example demonstrating basic code structure. This snippet is illustrative and may not represent a specific programming language.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-604.md#_snippet_0>

LANGUAGE: plain-text
CODE:

```
code
span
```

---

TITLE: Basic C Code Snippet
DESCRIPTION: This snippet contains a minimal example of C code. It serves as a placeholder for more detailed C functionality within the Prettier project context.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-278.md#_snippet_0>

LANGUAGE: c
CODE:

```
c
```

---

TITLE: Render Hello World with Preact
DESCRIPTION: This snippet demonstrates how to use Preact to render a simple 'Hello World!' heading into the document's body. It imports the necessary 'h' and 'render' functions from the Preact library hosted via an unpkg CDN module. Ensure Preact is correctly imported for this code to function.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/html/script/babel.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
import { h, render } from 'https://unpkg.com/preact?module';
render( <h1>Hello World!</h1>, document.body );
```

---

TITLE: Build Prettier Browser Libraries
DESCRIPTION: Builds the Prettier browser libraries required for the website's Playground. This command should be run from the project root. An optional environment variable can be used to build for a pull request.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
cd your/path/to/prettier
yarn build:website
```

LANGUAGE: sh
CODE:

```
PULL_REQUEST=true yarn build:website
```

---

TITLE: Lint-Staged Configuration
DESCRIPTION: Configures lint-staged to format all files (`**/*`) using Prettier with the `--write` and `--ignore-unknown` flags. This ensures all staged files are formatted before committing.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_9>

LANGUAGE: json
CODE:

```
{
  "lint-staged": {
    "**/*": "prettier --write --ignore-unknown"
  }
}
```

---

TITLE: Lint-Staged Configuration
DESCRIPTION: Configures lint-staged to format all files (`**/*`) using Prettier with the `--write` and `--ignore-unknown` flags. This ensures all staged files are formatted before committing.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_9>

LANGUAGE: json
CODE:

```
{
  "lint-staged": {
    "**/*": "prettier --write --ignore-unknown"
  }
}
```

---

TITLE: Markdown Lists
DESCRIPTION: Shows examples of unordered lists using asterisks, plus signs, and hyphens, as well as ordered lists using numbered items.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/markdown/test-case.md#_snippet_2>

LANGUAGE: markdown
CODE:

```
- Red
- Green
- Blue

+ Red
+ Green
+ Blue

* Red
* Green
* Blue

1. Buy flour and salt
1. Mix together with water
1. Bake
```

---

TITLE: Create Prettier Configuration File
DESCRIPTION: Creates an empty .prettierrc configuration file using Node.js to signal to editors and tools that Prettier is being used. This ensures consistent formatting rules are applied.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_1>

LANGUAGE: bash
CODE:

```
node --eval "fs.writeFileSync('.prettierrc','{}\n')"
```

---

TITLE: Create Prettier Configuration File
DESCRIPTION: Creates an empty .prettierrc configuration file using Node.js to signal to editors and tools that Prettier is being used. This ensures consistent formatting rules are applied.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_1>

LANGUAGE: bash
CODE:

```
node --eval "fs.writeFileSync('.prettierrc','{}\n')"
```

---

TITLE: Configuration File Example
DESCRIPTION: This snippet illustrates a common pattern found in configuration files, potentially for defining aliases or specific entries. It shows how special characters like backslashes are handled within the configuration syntax.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-516.md#_snippet_0>

LANGUAGE: plaintext
CODE:

```
[bar\\]: /uri

[bar\\]
```

---

TITLE: Prettier CLI Usage
DESCRIPTION: Demonstrates how to run Prettier from the command line to format files. It includes options for in-place writing and mentions the availability of further options via the `--help` flag.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/markdown/real-world-case.md#_snippet_2>

LANGUAGE: shell
CODE:

```
prettier [opts] [filename ...]

# Example: Format files in-place with specific options
prettier --single-quote --trailing-comma es5 --write "{app,___{tests,mocks}__}/**/*.js"
```

---

TITLE: Two-way Binding Example
DESCRIPTION: Illustrates two-way data binding, where changes in the UI update the component property and vice-versa. Shows the desugared syntax for two-way binding.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_8>

LANGUAGE: template
CODE:

```
Resizable Text

FontSize (px):


### De-sugared two-way binding
```

---

TITLE: NgIf Binding
DESCRIPTION: Demonstrates the NgIf directive for conditionally rendering elements in the DOM. Shows how to toggle elements based on boolean expressions and includes examples with CSS classes and styles.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_12>

LANGUAGE: template
CODE:

```
Hello, {{currentHero.name}}

Hello, {{nullHero.name}}

Add {{currentHero.name}} with template

Hero Detail removed from DOM (via template) because isActive is false

Show with class

Hide with class

Show with style

Hide with style
```

---

TITLE: Basic Text Content Example
DESCRIPTION: This snippet displays a simple block of text. It serves as an example of content that might be processed or formatted by tools like Prettier.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/commonmark-0.30-example-335.md#_snippet_0>

LANGUAGE: text
CODE:

```
foo
bar
baz
```

---

TITLE: Async Function with Loop and Import
DESCRIPTION: An example of an asynchronous JavaScript function demonstrating a countdown loop and dynamic module import. The function initializes a counter, decrements it in a while loop, logs the counter value, and awaits an imported module.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/html/script/module.html#_snippet_1>

LANGUAGE: javascript
CODE:

```
async function foo() {
  let x=10;
  while(x-->0) {
    console.log(x);
  }
  await (import('mod'));
}
```

---

TITLE: Install Prettier Shareable Config: Package Managers
DESCRIPTION: Installs your published shareable Prettier configuration as a development dependency using various package managers. This makes the config available for use in your project.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/sharing-configurations.md#_snippet_3>

LANGUAGE: bash
CODE:

```
npm install --save-dev @username/prettier-config
```

LANGUAGE: bash
CODE:

```
yarn add --dev @username/prettier-config
```

LANGUAGE: bash
CODE:

```
pnpm add --save-dev @username/prettier-config
```

LANGUAGE: bash
CODE:

```
bun add --dev @username/prettier-config
```

---

TITLE: Install Prettier Shareable Config: Package Managers
DESCRIPTION: Installs your published shareable Prettier configuration as a development dependency using various package managers. This makes the config available for use in your project.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/sharing-configurations.md#_snippet_3>

LANGUAGE: bash
CODE:

```
npm install --save-dev @username/prettier-config
```

LANGUAGE: bash
CODE:

```
yarn add --dev @username/prettier-config
```

LANGUAGE: bash
CODE:

```
pnpm add --save-dev @username/prettier-config
```

LANGUAGE: bash
CODE:

```
bun add --dev @username/prettier-config
```

---

TITLE: Markdown Headers
DESCRIPTION: Demonstrates various ways to create headers in Markdown, including underline style and hash symbols. Covers levels 1 through 6.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/markdown/test-case.md#_snippet_0>

LANGUAGE: markdown
CODE:

```
Header 1
========

Header 2
--------

# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
###### Header 6

# Header 1 #
## Header 2 ##
### Header 3 ###
#### Header 4 ####
##### Header 5 #####
###### Header 6 ######
```

---

TITLE: Testing Prettier Plugins Locally
DESCRIPTION: Example demonstrating how to test a Prettier plugin using a relative path. This allows for local development and testing of plugins before publishing.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/plugins.md#_snippet_26>

LANGUAGE: JavaScript
CODE:

```
import * as prettier from "prettier";
const code = "(add 1 2)";
await prettier.format(code, {
  parser: "lisp",
  plugins: ["."],
});
```

---

TITLE: JavaScript Code Formatting Example
DESCRIPTION: This snippet demonstrates a basic JavaScript code structure. It highlights variable declaration and console output, showcasing typical code formatting patterns.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/code/format.md#_snippet_0>

LANGUAGE: javascript
CODE:

```
const foo      = 'bar'


   console     .log(    213    )
```

---

TITLE: Prettier Expression Syntax Examples
DESCRIPTION: A collection of examples demonstrating the syntax for variable assignments and expression evaluation. This includes basic literals, operators, function calls, and custom pipe syntax.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/let-declaration/complex.html#_snippet_0>

LANGUAGE: custom-expression
CODE:

```
@let foo = a | b : c:d :e;
@let foo = a | pipe;
@let foo = 0 - 1;
@let foo = - 1;
@let foo = a ? 1 : 2;
@let foo = a ( 1 ) ( 2 );
@let foo = a \[ b \];
@let foo = \[ 1 \];
@let foo = { 'a' : 1 };
@let foo = { a : 1 };
@let foo = true;
@let foo = undefined;
@let foo = null;
@let foo = ( 1 );
@let foo = 1;
@let foo = 'hello';
@let foo = a ( 1 , 2 );
@let foo = a . b ( 1 , 2 );
@let foo = x !;
@let foo = ! x;
@let foo = ( ( a ) );
@let foo = a;
@let foo = a; // hello
@let foo = a . b;
@let foo = a ?. b ( );
@let foo = a ?. b;
@let foo = a; // hello
@let foo = "SearchSelection.transmissionLayoutRadioButton" | localize:localizationSection;
@let foo = copyTypes\[options.copyType\];
@let foo = listRow.NextScheduledSendStatus == 1 || listRow.NextScheduledSendStatus == 2 || listRow.NextScheduledSendStatus == 3;
@let foo = a;
@let foo = b;
@let foo = aNormalValue | aPipe;
@let foo = aReallyReallySuperLongValue | andASuperLongPipeJustToBreakThis;
@let foo = 'delete' | translate: {what: ('entities' | translate: {count: array.length})};
@let foo = {a:1+{} };
@let foo = {a:a==={} };
@let foo = {a:!{} };
@let foo = {a:a?b:{} };
```

---

TITLE: Markdown Links
DESCRIPTION: Illustrates different types of links: standard, with titles, and reference-style links with explicit definitions.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/markdown/test-case.md#_snippet_5>

LANGUAGE: markdown
CODE:

```
[an example](http://example.com "Example") link.

[This link](http://example.com) has no title attr.

These is [an] [example] of two shortcut reference-style links.

This is [an example][id] reference-style link.

[id]: http://example.com "Optional Title"
```

---

TITLE: Vue Component Styling Example
DESCRIPTION: Demonstrates selecting a Vue.js application instance and applying CSS styles to its elements. This pattern is common for targeting specific parts of a Vue application for styling.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/vue/bracket-same-line/vue.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
new Vue({el: '#js-app'})
```

LANGUAGE: css
CODE:

```
.a {
  color: #f00
}
```

---

TITLE: Format Project Files with Prettier
DESCRIPTION: Formats all files in the current directory and its subdirectories using Prettier. This command overwrites the files with the formatted code. Variations for different package managers are provided.

SOURCE: <https://github.com/prettier/prettier/blob/main/docs/install.md#_snippet_3>

LANGUAGE: npm
CODE:

```
npx prettier . --write
```

LANGUAGE: yarn
CODE:

```
yarn exec prettier . --write
```

LANGUAGE: pnpm
CODE:

```
pnpm exec prettier . --write
```

LANGUAGE: bun
CODE:

```
bunx prettier . --write
```

---

TITLE: Format Project Files with Prettier
DESCRIPTION: Formats all files in the current directory and its subdirectories using Prettier. This command overwrites the files with the formatted code. Variations for different package managers are provided.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/versioned_docs/version-stable/install.md#_snippet_3>

LANGUAGE: npm
CODE:

```
npx prettier . --write
```

LANGUAGE: yarn
CODE:

```
yarn exec prettier . --write
```

LANGUAGE: pnpm
CODE:

```
pnpm exec prettier . --write
```

LANGUAGE: bun
CODE:

```
bunx prettier . --write
```

---

TITLE: JavaScript Alert Example
DESCRIPTION: A simple JavaScript snippet demonstrating an alert function. Prettier ensures consistent formatting for JavaScript code.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/html/bracket-same-line/embed.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
alert(1)
```

---

TITLE: Code Block Example 1
DESCRIPTION: A simple code block containing 'foo' and 'bar' text.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/markdown/spec/example-222.md#_snippet_0>

LANGUAGE: text
CODE:

```
foo


bar
```

---

TITLE: Install Latest Prettier CLI
DESCRIPTION: Installs the next version of the Prettier CLI from npm, allowing users to test the latest improvements and features. This command is essential for trying out the performance enhancements discussed.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/blog/2023-11-30-cli-deep-dive.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npm install prettier@next
```

---

TITLE: Run Prettier CLI via npx
DESCRIPTION: Executes the latest Prettier CLI using `npx`, which is convenient for trying out packages without global installation. Note that `npx` itself can add some overhead.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/blog/2023-11-30-cli-deep-dive.md#_snippet_3>

LANGUAGE: sh
CODE:

```
npx prettier@next . --check
```

---

TITLE: Templating Structure Example
DESCRIPTION: Demonstrates a common templating structure for rendering content, including dynamic titles and bodies.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/html/handlebars-venerable/template.html#_snippet_0>

LANGUAGE: templating
CODE:

```
<div class="entry">
  <h1>{{title}}</h1>
  <div class="body">{{body}}</div>
</div>
```

---

TITLE: Prettier: Global Prettier and Plugin Loading
DESCRIPTION: Addresses issues with loading Prettier and plugins installed globally. Prettier now searches for plugins in its own `node_modules` directory. A new `--plugin-search-dir` option is available for custom plugin search paths.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/blog/2018-05-27-1.13.0.md#_snippet_3>

LANGUAGE: APIDOC
CODE:

```
Prettier Global Plugin Loading

Automatic Loading:
- Prettier automatically loads plugins from the `node_modules` directory where Prettier itself is installed.

Manual Plugin Search Directory:
- `--plugin-search-dir <dir>`: Specifies additional directories where Prettier should look for plugins.

Use Cases:
- Ensures plugins installed globally with Prettier are correctly recognized.
- Allows users to specify custom locations for plugins in non-standard project setups.
```

---

TITLE: *ngFor trackBy Functionality
DESCRIPTION: Illustrates the use of the trackBy property with the*ngFor directive to optimize DOM updates by providing a unique identifier for each item. Examples show usage with and without trackBy, and with different separator styles.

SOURCE: <https://github.com/prettier/prettier/blob/main/tests/format/angular/angular/real-world.component.html#_snippet_15>

LANGUAGE: Angular Template
CODE:

```
({{hero.id}}) {{hero.name}}
```

LANGUAGE: Angular Template
CODE:

```
({{hero.id}}) {{hero.name}}
```

LANGUAGE: Angular Template
CODE:

```
({{hero.id}}) {{hero.name}}
```

LANGUAGE: Angular Template
CODE:

```
({{hero.id}}) {{hero.name}}
```

LANGUAGE: Angular Template
CODE:

```
({{hero.id}}) {{hero.name}}
```

LANGUAGE: Angular Template
CODE:

```
({{hero.id}}) {{hero.name}}
```

---

TITLE: Install and Configure Hermes Plugin
DESCRIPTION: Steps to install the `@prettier/plugin-hermes` and configure Prettier for Flow syntax parsing using the Hermes engine. This plugin is planned to become the default for Flow in future versions.

SOURCE: <https://github.com/prettier/prettier/blob/main/website/blog/2025-06-23-3.6.0.md#_snippet_2>

LANGUAGE: sh
CODE:

```
yarn add --dev prettier @prettier/plugin-hermes
```

LANGUAGE: yaml
CODE:

```
plugins:
  - "@prettier/plugin-hermes"
```
