========================
CODE SNIPPETS
========================

TITLE: Installing Nx into an Existing Repository (Bash)
DESCRIPTION: This command integrates Nx into an existing repository that is not yet an Nx workspace. It configures the necessary Nx files and settings within the current project directory, enabling Nx functionalities.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npx nx init
```

----------------------------------------

TITLE: Installing Nx Language Server Globally
DESCRIPTION: This command installs the Nx Language Server (nxls) globally using npm, making it accessible in the system's PATH. This is required for integrating the language server with editors other than VS Code, such as Neovim.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nxls/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
npm i -g nxls
```

----------------------------------------

TITLE: Example Feature Conventional Commit Message
DESCRIPTION: This example demonstrates a 'feat' type conventional commit message, detailing the addition of links to angular.io within the generate screen, providing a clear and concise description of the change.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md#_snippet_1>

LANGUAGE: text
CODE:

```
feat: add links to angular.io to the generate screen

The generate screen shows links to docs explaining all command-line options in depth
```

----------------------------------------

TITLE: Building Nx Library with Nx CLI
DESCRIPTION: This command builds the `nx-cloud-onboarding-webview` library using the Nx CLI. It compiles the source code and prepares it for deployment or further use.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-cloud-onboarding-webview/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build nx-cloud-onboarding-webview
```

----------------------------------------

TITLE: Running Unit Tests for Nx Library
DESCRIPTION: This command executes the unit tests for the `nx-cloud-onboarding-webview` library. It uses Jest as the test runner, as indicated by the project's configuration.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-cloud-onboarding-webview/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx test nx-cloud-onboarding-webview
```

----------------------------------------

TITLE: Building Nx Library
DESCRIPTION: This command builds the `vscode-migrate-sidebar-webview` library using the Nx CLI. It compiles the source code and prepares it for distribution or use, ensuring all dependencies are met and the output is ready.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/migrate-sidebar-webview/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build vscode-migrate-sidebar-webview
```

----------------------------------------

TITLE: Creating a New Nx Workspace (Bash)
DESCRIPTION: This command initializes a new Nx workspace using the latest version of the `create-nx-workspace` package. It sets up the foundational project structure and configurations required for an Nx project.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace@latest my-workspace
```

----------------------------------------

TITLE: Building Nx Library (Shell)
DESCRIPTION: This command builds the `language-server-capabilities-hover` library using the Nx CLI. It compiles the source code and prepares the library for use or distribution.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/hover/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build language-server-capabilities-hover
```

----------------------------------------

TITLE: Building an Nx Library - Shell
DESCRIPTION: This command initiates the build process for the `language-server-capabilities-definition` library using the Nx build system. It compiles the project's source code.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/definition/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build language-server-capabilities-definition
```

----------------------------------------

TITLE: Displaying Nx MCP Server Help Options
DESCRIPTION: This command is used to display all available command-line options and flags for the Nx MCP server. It's useful for understanding how to configure and run the server with different parameters, such as `--sse` and `--port` for hosting.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nx-mcp/README.md#_snippet_2>

LANGUAGE: Shell
CODE:

```
nx-mcp --help
```

----------------------------------------

TITLE: Building the vscode-project-details Library (Shell)
DESCRIPTION: This command builds the `vscode-project-details` library using the Nx CLI. It compiles the source code and prepares the library for use or distribution.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/project-details/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build vscode-project-details
```

----------------------------------------

TITLE: Building an Nx Library (Shell)
DESCRIPTION: This command builds the `vscode-nx-help-and-feedback-view` library using the Nx CLI. It compiles the source code and prepares the library for distribution or use within a larger Nx workspace.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-help-and-feedback-view/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
nx build vscode-nx-help-and-feedback-view
```

----------------------------------------

TITLE: Applying Code Formatting with Nx
DESCRIPTION: This command automatically formats the codebase using Nx's built-in formatting tools, ensuring consistent code style across the project. It is a prerequisite to run this command before creating a commit.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/CLAUDE.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
yarn nx format --fix
```

----------------------------------------

TITLE: Verifying Nx Tasks via CLI
DESCRIPTION: This command illustrates the recommended method for verifying changes by executing Nx tasks directly through the command line interface, ensuring proper integration and functionality within the Nx workspace.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/CLAUDE.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
yarn nx run ...
```

----------------------------------------

TITLE: Running Lint for Nx Library
DESCRIPTION: This command initiates the linting process for the `language-server-capabilities-document-links` library via the Nx CLI. It integrates with ESLint to enforce coding standards and identify potential issues, contributing to code quality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/document-links/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint language-server-capabilities-document-links
```

----------------------------------------

TITLE: Creating a New Nx Workspace (Bash)
DESCRIPTION: This command initializes a new Nx workspace using the latest version of the `create-nx-workspace` package. It sets up the foundational directory structure and configuration required for an Nx project. The `my-workspace` argument defines the name of the new workspace directory.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/vscode/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace@latest my-workspace
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the `nx-version` library using the Nx CLI, which in turn leverages Jest for testing. It's a standard way to verify the library's functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/nx-version/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test nx-version
```

----------------------------------------

TITLE: Building Nx Library - Shell
DESCRIPTION: This command builds the `vscode-nx-cloud-view` library using the Nx CLI. It compiles the source code and prepares it for distribution or further use, ensuring all dependencies are resolved and the output is ready for deployment.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-cloud-view/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build vscode-nx-cloud-view
```

----------------------------------------

TITLE: Formatting Kotlin Files with ktfmt
DESCRIPTION: This command specifically formats Kotlin files using `ktfmt` with the `intellij` style, ensuring Kotlin code adheres to the project's defined formatting standards. It should be executed if any Kotlin files were modified.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/CLAUDE.md#_snippet_2>

LANGUAGE: Shell
CODE:

```
yarn nx ktfmtFormat intellij
```

----------------------------------------

TITLE: Running Unit Tests for Nx Library (Shell)
DESCRIPTION: This command executes the unit tests for the `language-server-capabilities-hover` library via Jest, orchestrated by the Nx CLI. It ensures the library's functionality is working as expected.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/hover/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx test language-server-capabilities-hover
```

----------------------------------------

TITLE: Build ui-components library with Nx
DESCRIPTION: This command initiates the build process for the 'ui-components' library using the Nx build tool. It compiles the library's source code into distributable assets.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/ui-components/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build ui-components
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-lsp-client` library using Nx and Jest. It's a standard way to verify the library's functionality and ensure code correctness.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/lsp-client/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-lsp-client
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `shared-file-system` library using Nx, leveraging Jest as the test runner. It's a standard way to verify code correctness within an Nx workspace.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/file-system/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test shared-file-system
```

----------------------------------------

TITLE: Running Unit Tests for Nx Library - Shell
DESCRIPTION: This command executes the unit tests for the `language-server-capabilities-definition` library. It utilizes Jest as the test runner, integrated via Nx.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/definition/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx test language-server-capabilities-definition
```

----------------------------------------

TITLE: Initializing Nx in an Existing Repository (Bash)
DESCRIPTION: This command integrates Nx into an existing repository by adding the necessary Nx configuration files and dependencies. It enables the use of Nx features within a pre-existing project structure, facilitating the migration or enhancement of current projects with Nx capabilities.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/vscode/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npx nx init
```

----------------------------------------

TITLE: Running Unit Tests for Nx Library
DESCRIPTION: This command uses the Nx CLI to execute unit tests for the `language-server-capabilities-document-links` library. It leverages Jest as the underlying test runner, ensuring code correctness and functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/document-links/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test language-server-capabilities-document-links
```

----------------------------------------

TITLE: Running Lint with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting on the `vscode-lsp-client` library using Nx and ESLint. It helps maintain code quality, enforce coding standards, and identify potential issues.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/lsp-client/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint vscode-lsp-client
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the 'output-channels' library using the Nx CLI, which leverages Jest as the test runner. It's the standard way to verify the library's functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/output-channels/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test output-channels
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-nx-help-and-feedback-view` library using the Nx CLI, leveraging Jest as the test runner. It ensures the library's components function as expected.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-help-and-feedback-view/README.md#_snippet_1>

LANGUAGE: shell
CODE:

```
nx test vscode-nx-help-and-feedback-view
```

----------------------------------------

TITLE: Adding Nx MCP Server to VSCode
DESCRIPTION: This shell command demonstrates how to register the Nx MCP server directly with VSCode using the `--add-mcp` flag. It provides a JSON string defining the server's name, the command (`npx`), and arguments to launch `nx-mcp` for a specific workspace.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nx-mcp/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
code --add-mcp '{"name":"nx-mcp","command":"npx","args":["nx-mcp", "/path/to/your/workspace"]}'
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the `vscode-nx-conversion` library using the Nx CLI and Jest test runner. It ensures the code functions as expected and helps maintain code quality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-conversion/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-nx-conversion
```

----------------------------------------

TITLE: Running Lint with ESLint (Nx CLI)
DESCRIPTION: This command performs linting on the `language-server-utils` library using ESLint, managed by the Nx CLI. It helps enforce code style, identify potential errors, and maintain code quality standards.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/utils/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint language-server-utils
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-copilot` library. It utilizes the Nx CLI to orchestrate the test run, with Jest serving as the underlying testing framework.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/copilot/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-copilot
```

----------------------------------------

TITLE: Building an Nx Library - Shell
DESCRIPTION: This command builds the `running-tasks` library using the Nx CLI. It compiles the library's source code and prepares it for distribution or further use within an Nx workspace. This is a standard command for compiling Nx-managed projects.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/running-tasks/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build running-tasks
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `nx-mcp-server` library. It uses the Nx CLI to run tests via Jest, ensuring code quality and functionality. This command is typically run from the project's root directory.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/nx-mcp/nx-mcp-server/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test nx-mcp-server
```

----------------------------------------

TITLE: Running Unit Tests with Jest (Nx CLI)
DESCRIPTION: This command executes the unit tests for the `language-server-utils` library using Jest, orchestrated by the Nx CLI. It's used to verify the correctness and functionality of the code within the library.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/utils/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test language-server-utils
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the `shared-npm` library using Nx and Jest. It's typically run from the project's root directory to ensure all dependencies and configurations are correctly loaded.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/npm/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test shared-npm
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-verify-workspace` library using Nx and Jest. It's typically run from the project's root directory in a terminal, leveraging Nx's task runner to orchestrate the Jest test execution.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/verify/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-verify-workspace
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-utils` library using Nx and Jest. It's part of the standard development workflow to ensure code quality and functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/utils/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-utils
```

----------------------------------------

TITLE: Running Lint Checks with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting for the `shared-file-system` library using Nx, with ESLint enforcing code style and quality. It helps maintain code consistency and identify potential issues.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/file-system/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint shared-file-system
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the 'vscode-nx-cli-quickpicks' library. It utilizes the Nx CLI to orchestrate the testing process, which in turn uses Jest as the test runner.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-cli-quickpicks/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-nx-cli-quickpicks
```

----------------------------------------

TITLE: Running Linting with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting on the `vscode-project-graph` library to enforce code style and identify potential issues. It uses the Nx CLI to integrate with ESLint.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/project-graph/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint vscode-project-graph
```

----------------------------------------

TITLE: Running Unit Tests with Jest and Nx - Shell
DESCRIPTION: This command executes the unit tests for the `vscode-nx-cloud-view` library using Jest, orchestrated by the Nx CLI. It runs all defined test cases to verify the functionality and correctness of the code, providing feedback on any regressions or issues.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-cloud-view/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx test vscode-nx-cloud-view
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-nx-workspace` library. It utilizes the Nx CLI to orchestrate the testing process, with Jest serving as the test runner. This command should be executed in the terminal from the root directory of the Nx workspace.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-workspace/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-nx-workspace
```

----------------------------------------

TITLE: Building Nx MCP Project
DESCRIPTION: This Nx command is used to build the `nx-mcp` project within an Nx monorepo. It compiles the source code and prepares it for deployment or testing. An alternative, `nx run nx-mcp:build:debug`, is available for building with source maps for debugging purposes.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nx-mcp/README.md#_snippet_3>

LANGUAGE: Shell
CODE:

```
nx run nx-mcp:build
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the `vscode-nx-project-tree` library. It utilizes the Nx CLI to orchestrate the testing process, which is powered by Jest. This is the standard method for verifying the correctness of Nx-generated libraries.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-project-view/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-nx-project-tree
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `nxls-e2e` library using the Nx CLI. It leverages Jest as the underlying test runner to perform the tests.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nxls-e2e/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test nxls-e2e
```

----------------------------------------

TITLE: Running Lint with ESLint (Nx)
DESCRIPTION: This command performs static code analysis (linting) on the `language-server-watcher` library using ESLint, managed by Nx. It helps maintain code quality, consistency, and adherence to coding standards.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/watcher/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint language-server-watcher
```

----------------------------------------

TITLE: Configuring Nx MCP Server in mcp.json
DESCRIPTION: This JSON configuration defines how to register the Nx MCP server within an AI tool's `mcp.json` file. It specifies the server type as 'stdio' for standard I/O communication and provides the command to invoke the `nx-mcp` package using `npx`, along with the path to the Nx workspace.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nx-mcp/README.md#_snippet_0>

LANGUAGE: JSON
CODE:

```
{
  "servers": {
    "nx-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["nx-mcp@latest", "/path/to/your/workspace"]
    }
  }
}
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the 'mcp' library using the Nx CLI, which in turn leverages Jest for test execution. It's a standard way to verify the functionality of Nx-generated libraries.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/mcp/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test mcp
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-project-graph` library. It leverages the Nx CLI to run tests via Jest, ensuring code functionality and correctness.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/project-graph/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-project-graph
```

----------------------------------------

TITLE: Running Local CI Checks for Nx Console
DESCRIPTION: These commands allow contributors to manually run various CI checks locally, including formatting, testing, building, and end-to-end tests, to ensure code quality and adherence to project standards before submitting a pull request.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md#_snippet_2>

LANGUAGE: shell
CODE:

```
yarn nx format:check
yarn nx format:write
yarn nx run-many --target=test
yarn nx run-many --target=build
yarn nx run-many --target=e2e
```

----------------------------------------

TITLE: Running Unit Tests for vscode-typescript-plugin (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-typescript-plugin` library using the Nx CLI. It leverages Jest as the underlying testing framework to ensure code quality and functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/typescript-plugin/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-typescript-plugin
```

----------------------------------------

TITLE: Running Lint with ESLint (Shell)
DESCRIPTION: Performs static code analysis on the `vscode-add-dependency` library using ESLint, managed by Nx. This helps maintain code style and identify potential issues.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/add-dependency/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint vscode-add-dependency
```

----------------------------------------

TITLE: Running Lint Checks with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting on the `vscode-utils` library using Nx and ESLint. Linting helps maintain code style consistency and identify potential errors or anti-patterns.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/utils/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint vscode-utils
```

----------------------------------------

TITLE: Building Nx MCP Project for Debugging
DESCRIPTION: This Nx command is specifically used to build the `nx-mcp` project with debugging capabilities, including source maps. It's essential for developers who need to step through the code and identify issues during development.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/nx-mcp/README.md#_snippet_4>

LANGUAGE: Shell
CODE:

```
nx run nx-mcp:build:debug
```

----------------------------------------

TITLE: Running Lint with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting for the `language-server-types` library using ESLint, managed by Nx. It helps maintain code quality and consistency by identifying potential errors and style violations.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/types/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint language-server-types
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `error-diagnostics` library using the Nx CLI. It leverages Jest as the underlying test runner to validate the library's functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/error-diagnostics/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test error-diagnostics
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the 'language-server-capabilities-code-completion' library. It leverages the Nx CLI to run tests configured with Jest, ensuring code functionality and correctness.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/code-completion/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test language-server-capabilities-code-completion
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest
DESCRIPTION: This command executes the unit tests for the `shared-json-schema` library using Nx and Jest. It's a standard way to verify the library's functionality and ensure code quality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/json-schema/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test shared-json-schema
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `vscode-cli-task` library using the Nx CLI. It leverages Jest as the testing framework to run all defined test suites within the project.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/tasks/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-cli-task
```

----------------------------------------

TITLE: Running Unit Tests with Jest (Shell)
DESCRIPTION: Executes the unit tests for the `vscode-add-dependency` library using Jest, orchestrated by Nx. This command ensures code quality and functionality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/add-dependency/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-add-dependency
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `language-server-workspace` library. It leverages Nx to orchestrate the testing process using Jest, ensuring code correctness.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/workspace/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test language-server-workspace
```

----------------------------------------

TITLE: Running Unit Tests with Jest (Nx)
DESCRIPTION: This command executes the unit tests for the `language-server-watcher` library using Jest, orchestrated by Nx. It ensures the code functions as expected and helps verify its correctness.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/watcher/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test language-server-watcher
```

----------------------------------------

TITLE: Running Lint Checks with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting for the 'language-server-capabilities-code-completion' library. It uses the Nx CLI to apply linting rules defined by ESLint, helping maintain code quality and adherence to coding standards.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/capabilities/code-completion/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint language-server-capabilities-code-completion
```

----------------------------------------

TITLE: Building Nx Terminal Library - Shell
DESCRIPTION: This command builds the 'terminal' library using the Nx CLI. It compiles the library's source code and prepares it for use or distribution.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/messaging/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx build terminal
```

----------------------------------------

TITLE: Running Unit Tests with Nx and Jest (Shell)
DESCRIPTION: This command executes the unit tests for the `language-server-types` library using Jest, orchestrated by Nx. It ensures code functionality and adherence to testing standards.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/types/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test language-server-types
```

----------------------------------------

TITLE: Running Unit Tests with Nx CLI
DESCRIPTION: This command executes the unit tests for the `vscode-nx-commands-tree` library using the Nx CLI and Jest. It's a standard way to verify the functionality of Nx-generated projects.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/vscode/nx-commands-view/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test vscode-nx-commands-tree
```

----------------------------------------

TITLE: Running Lint Checks with Nx and ESLint (Shell)
DESCRIPTION: This command performs linting for the `language-server-workspace` library. Nx uses ESLint to analyze the code for style violations and potential errors, promoting code quality.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/language-server/workspace/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint language-server-workspace
```

----------------------------------------

TITLE: Executing Linting with ESLint in Nx
DESCRIPTION: This command performs linting for the `shared-types` library using ESLint, managed by Nx. It helps maintain code quality and consistency by identifying potential issues.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/types/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
nx lint shared-types
```

----------------------------------------

TITLE: Regenerating Nx Console README
DESCRIPTION: This command is used to regenerate the `README.md` file for the Nx Console project. It executes an Nx task named `prune-readme` within the `vscode` project, ensuring the documentation is up-to-date based on the root `README.md`.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/vscode/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx run vscode:prune-readme
```

----------------------------------------

TITLE: Executing Unit Tests with Jest in Nx
DESCRIPTION: This command runs the unit tests for the `shared-types` library using Jest, as configured by Nx. It ensures code correctness and adherence to testing standards.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/libs/shared/types/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
nx test shared-types
```

----------------------------------------

TITLE: Assigning a Keyboard Shortcut to a VS Code Task
DESCRIPTION: This JSON configuration adds a keyboard shortcut (`ctrl+cmd+t`) in VS Code's `keybindings.json` to run a specific task. It targets the `workbench.action.tasks.runTask` command and passes 'Test Affected' as an argument, enabling rapid execution of the previously defined custom task.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/vscode/src/getting-started/5-streamlining.md#_snippet_1>

LANGUAGE: JSON
CODE:

```
{
  "key": "ctrl+cmd+t",
  "command": "workbench.action.tasks.runTask",
  "args": "Test Affected"
}
```

----------------------------------------

TITLE: Basic Conventional Commit Message Structure
DESCRIPTION: This snippet illustrates the fundamental structure of a conventional commit message, comprising a 'type', a 'subject', and an optional 'body' separated by a blank line, as required for contributions.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md#_snippet_0>

LANGUAGE: text
CODE:

```
type: subject

body
```

----------------------------------------

TITLE: Defining a Custom Nx Test Task in VS Code tasks.json
DESCRIPTION: This JSON snippet defines a custom shell task named 'Test Affected' within VS Code's `tasks.json`. It executes the `nx affected --target=test` command, allowing developers to quickly run tests on affected projects. This task can then be invoked directly or linked to a keyboard shortcut.

SOURCE: <https://github.com/nrwl/nx-console/blob/master/apps/vscode/src/getting-started/5-streamlining.md#_snippet_0>

LANGUAGE: JSON
CODE:

```
{
  "label": "Test Affected",
  "type": "shell",
  "command": "nx affected --target=test"
}
```
