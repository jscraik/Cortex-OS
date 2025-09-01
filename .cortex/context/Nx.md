========================
CODE SNIPPETS
========================

TITLE: Setup Commands - Bash
DESCRIPTION: Basic commands for installing dependencies and starting the development server.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#2025-04-22_snippet_1>

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

----------------------------------------

TITLE: Nx Quickstart and Exploration
DESCRIPTION: Guides for getting started with Nx, exploring technologies, and learning through tutorials and video courses.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/intro.md#_snippet_1>

LANGUAGE: documentation
CODE:

```
Nx quickstart: Dive right in with our quickstart steps to create your first project or add Nx to your existing one. (/getting-started)
Explore Technologies: Explore Nx's technology integrations and how it can support your specific stack. (/technologies)
Step by step with our tutorials: Learn more about Nx through hands-on tutorials for different technology stacks. (/getting-started/tutorials)
Learn with our video courses: Dive deeper with comprehensive video courses that walk you through Nx concepts. (/courses)
```

----------------------------------------

TITLE: Install Dependencies and Start Development Server
DESCRIPTION: These commands are used to initialize a TutorialKit project by installing all necessary dependencies and then starting the local development server for authoring and previewing tutorials.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

----------------------------------------

TITLE: Nx Project Setup
DESCRIPTION: Guides on starting new Nx projects and adding Nx to existing ones, covering various monorepo types.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_1>

LANGUAGE: bash
CODE:

```
# Start a new Nx workspace
npx create-nx-workspace@latest my-workspace

# Add Nx to an existing project (e.g., NPM/Yarn/PNPM workspaces)
npx nx@latest add
```

----------------------------------------

TITLE: Nx Core Guides - Installation
DESCRIPTION: Guides related to Nx installation, including installing in non-JavaScript repos and updating global installations.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_44>

LANGUAGE: bash
CODE:

```
# Install Nx in a non-Javascript repo (e.g., Java, Go)
# Follow specific instructions for integrating Nx with your build tools.

# Update your global Nx installation
npm install -g nx@latest
```

----------------------------------------

TITLE: Install Nx CLI
DESCRIPTION: Installs the Nx command-line interface globally using different package managers. While global installation is optional, it provides convenient access to Nx commands.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/quick-start.md#_snippet_0>

LANGUAGE: shell
CODE:

```
npm add --global nx
```

LANGUAGE: shell
CODE:

```
brew install nx
```

LANGUAGE: shell
CODE:

```
choco install nx
```

LANGUAGE: shell
CODE:

```
sudo add-apt-repository ppa:nrwl/nx
sudo apt update
sudo apt install nx
```

----------------------------------------

TITLE: Example Lesson Content - Markdown
DESCRIPTION: Shows the structure of a lesson file with front matter metadata and markdown content.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#2025-04-22_snippet_3>

LANGUAGE: markdown
CODE:

```
---
type: lesson
title: Welcome!
---

# Welcome to TutorialKit!

In this tutorial we'll walk you through how to setup your environment to
write your first tutorial 🤩
```

----------------------------------------

TITLE: Nx Micro-Frontend Setup
DESCRIPTION: This snippet demonstrates the basic setup and commands for an Nx workspace, commonly used for micro-frontend architectures. It includes commands for creating a new workspace, generating applications, and running tasks.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/examples/nx-examples.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace@latest myorg --preset=react-standalone
cd myorg
npx nx generate @nx/react:app my-react-app
npx nx generate @nx/angular:app my-angular-app
npx nx serve my-react-app
npx nx serve my-angular-app
```

----------------------------------------

TITLE: Getting Started with Nx
DESCRIPTION: Learn the basics of Nx and set up your first workspace. This section covers fundamental concepts and initial configuration.

SOURCE: <https://github.com/nrwl/nx/blob/master/astro-docs/src/content/docs/index.mdx#_snippet_0>

LANGUAGE: markdown
CODE:

```
Learn the basics of Nx and set up your first workspace. [Start learning
    →](/getting-started/intro)
```

----------------------------------------

TITLE: Nx Cloud CI Configuration Example
DESCRIPTION: This YAML configuration demonstrates a basic Nx Cloud workflow setup. It includes environment variables, setup steps like Git Checkout and Npm Install, and execution steps for Nx commands with parallelization.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-10-13-nx-conf-2023-recap.md#_snippet_5>

LANGUAGE: yaml
CODE:

```
env:
  NODE_OPTIONS: '--max_old_space_size=4096'
setup:
  - name: Git Checkout
    uses: 'nx-cloud-steps/checkout'
  - name: Npm Install
    uses: 'nx-cloud-steps/npm-install'
steps:
  - name: CI Checks
    parallel-scripts: |
      nx affected -t build e2e --parallel=1
      nx affected -t test lint --parallel=3
```

----------------------------------------

TITLE: Running Development Server for React Store
DESCRIPTION: This command starts the development server for the 'react-store' project in the Nx workspace.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/src/templates/react-monorepo/lesson-2/README.md#2025-04-22_snippet_0>

LANGUAGE: sh
CODE:

```
npx nx serve react-store
```

----------------------------------------

TITLE: Running Development Commands
DESCRIPTION: Various commands for starting Metro server, running on iOS/Android, and building applications

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/packages/react-native/react-native-plugin.md#2025-04-22_snippet_9>

LANGUAGE: shell
CODE:

```
nx start <your-app-name>
```

LANGUAGE: shell
CODE:

```
nx run-ios <your-app-name>
```

LANGUAGE: shell
CODE:

```
nx run-android <your-app-name>
```

LANGUAGE: shell
CODE:

```
nx build-ios <your-app-name>
```

LANGUAGE: shell
CODE:

```
nx build-android <your app name>
```

----------------------------------------

TITLE: Tutorial Content Structure - Bash
DESCRIPTION: Illustrates the directory structure for organizing tutorial content into parts, chapters, and lessons.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#2025-04-22_snippet_2>

LANGUAGE: bash
CODE:

```
tutorial
├── 1-basics-of-vite
│   ├── 1-introduction
│   │   ├── 1-welcome
│   │   │   ├── content.md    # The content of your lesson
│   │   │   ├── _files        # Initial set of files
│   │   │   │   └── ...
│   │   │   └── _solution     # Solution of the lesson
│   │   │       └── ...
│   │   ├── 2-why-vite
│   │   │   ├── content.md
│   │   │   └── _files
│   │   │       └── ...
│   │   └── meta.md           # Metadata for the chapter
│   └── meta.md               # Metadata for the part
├── 2-advanced
│   ├── ...
│   └── meta.md
└── meta.md                   # Metadata for the tutorial
```

----------------------------------------

TITLE: Creating Nx Workspace with npx
DESCRIPTION: This command uses npx to create a new Nx workspace. It's a quick way to get started with Nx without installing it globally.

SOURCE: <https://github.com/nrwl/nx/blob/master/scripts/readme-fragments/content.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace
```

----------------------------------------

TITLE: Nx Cloud Onboarding Link
DESCRIPTION: Provides a direct link to the Nx Cloud onboarding page, featuring an image to visually guide users.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/start-new-project.md#_snippet_2>

LANGUAGE: html
CODE:

```
<a href="https://cloud.nx.app/get-started"><img src="/shared/images/getting-started/nx-cloud-starting-screen.avif" alt="Nx Cloud onboarding"></a>
```

----------------------------------------

TITLE: Nx Project Configuration Example
DESCRIPTION: Example of Nx project configuration showing executor setup in project.json.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/generated/packages/angular/documents/nx-and-angular.md#2025-04-22_snippet_2>

LANGUAGE: json
CODE:

```
{
  "name": "myngapp",
  ...
  "targets": {
    "build": {
      "executor": "@angular-devkit/build-angular:browser",
      ...
    },
    ...
  }
}
```

----------------------------------------

TITLE: Importing from an Nx Library
DESCRIPTION: This TypeScript example demonstrates how to import components or utilities from an Nx-generated library using the configured path mapping.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_14>

LANGUAGE: typescript
CODE:

```
import { SomeComponent } from '@awesomereactapp/domains/orders/checkout';
```

----------------------------------------

TITLE: Create a new Nx workspace with presets
DESCRIPTION: This command initiates the creation of a new Nx workspace using a guided, interactive setup. Users can select workspace name, package manager, presets for technology stacks, and other configurations.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/start-new-project.md#_snippet_1>

LANGUAGE: shell
CODE:

```
npx create-nx-workspace@latest
```

----------------------------------------

TITLE: Start Development Server
DESCRIPTION: Starts the development server for the application. This command invokes the 'nx serve' target defined in the project configuration.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_2>

LANGUAGE: shell
CODE:

```
npm start
```

----------------------------------------

TITLE: Advanced Cypress Configuration with Nx Preset
DESCRIPTION: Complete example showing how to integrate Nx's Cypress preset with custom setupNodeEvents configuration. Demonstrates proper web server setup with different environments and async handling.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/packages/cypress/cypress-setup-node-events.md#2025-04-22_snippet_1>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

const preset = nxE2EPreset(__filename, {
  cypressDir: 'src',
  bundler: 'vite',
  webServerCommands: {
    default: 'nx run my-project:serve',
    production: 'nx run my-project:preview',
  },
  ciWebServerCommand: 'nx run my-project:serve-static',
});

export default defineConfig({
  e2e: {
    ...preset,
    async setupNodeEvents(on, config) {
      // This line sets up the web server as provided via `webServerCommands` and `ciWebServerCommand`
      await preset.setupNodeEvents(on, config);

      // Register your listeners here
    },
  },
});
```

----------------------------------------

TITLE: Project Configuration with Tags
DESCRIPTION: Example of how to assign tags to a project within its `project.json` configuration file. These tags are used by the Nx module boundary lint rule to enforce dependency constraints.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_18>

LANGUAGE: json
CODE:

```
{
  // ... more project configuration here
  "tags": ["domain:products", "type:domain"]
}
```

----------------------------------------

TITLE: Installing @nx/react Plugin
DESCRIPTION: Example of installing the @nx/react package matching the installed version of nx and running its init generator.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/generated/cli/add.md#2025-04-22_snippet_1>

LANGUAGE: shell
CODE:

```
nx add @nx/react
```

----------------------------------------

TITLE: Tutorial Content File Structure Example
DESCRIPTION: This snippet demonstrates the hierarchical file organization for tutorial content within src/content/tutorial, illustrating how parts, chapters, and lessons are structured with their respective content.md, _files,_solution, and meta.md files.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#_snippet_3>

LANGUAGE: bash
CODE:

```
tutorial
├── 1-basics-of-vite
│   ├── 1-introduction
│   │   ├── 1-welcome
│   │   │   ├── content.md    # The content of your lesson
│   │   │   ├── _files        # Initial set of files
│   │   │   │   └── ...
│   │   │   └── _solution     # Solution of the lesson
│   │   │       └── ...
│   │   ├── 2-why-vite
│   │   │   ├── content.md
│   │   │   └── _files
│   │   │       └── ...
│   │   └── meta.md           # Metadata for the chapter
│   └── meta.md               # Metadata for the part
├── 2-advanced
│   ├── ...
│   └── meta.md
└── meta.md                   # Metadata for the tutorial
```

----------------------------------------

TITLE: Create Nx Workspace
DESCRIPTION: Commands to create a new Nx workspace using different package managers. This sets up a new project with Nx tooling.

SOURCE: <https://github.com/nrwl/nx/blob/master/scripts/readme-fragments/content.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace
```

LANGUAGE: bash
CODE:

```
npm init nx-workspace
```

LANGUAGE: bash
CODE:

```
yarn create nx-workspace
```

----------------------------------------

TITLE: Setup and Install Nx Astro Plugin
DESCRIPTION: This code snippet demonstrates the setup process for end-to-end tests. It includes creating a test project, installing the nx-astro plugin from a local registry, and running the application generator.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/plugins/tooling-plugin.md#_snippet_15>

LANGUAGE: ts
CODE:

```
beforeAll(() => {
  projectDirectory = createTestProject();

  // The plugin has been built and published to a local registry in the jest globalSetup
  // Install the plugin built with the latest source code into the test repo
  execSync('npx nx add nx-astro@e2e', {
    cwd: projectDirectory,
    stdio: 'inherit',
    env: process.env,
  });
  execSync('npx nx g nx-astro:application my-lib', {
    cwd: projectDirectory,
    stdio: 'inherit',
    env: process.env,
  });
});
```

----------------------------------------

TITLE: Project Directory Structure - Bash
DESCRIPTION: Shows the basic directory structure of a TutorialKit project, highlighting key configuration files and content locations.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
.
├── astro.config.mjs    # TutorialKit uses Astro 🚀 (https://astro.build)
├── src
│   ├── ...
│   ├── content
│   │   └── tutorial    # Your tutorial content lives here
│   └── templates       # Your templates (see below for more information)
├── public
│   ├── favicon.svg
│   └── logo.svg        # Default logo used in top left for your tutorial
├── ...
├── theme.ts            # Customize the theme of the tutorial
└── uno.config.ts       # UnoCSS config (https://unocss.dev/)
```

----------------------------------------

TITLE: Start Local Verdaccio Registry
DESCRIPTION: This command starts a local Verdaccio registry instance. The NPM, Yarn, and PNPM registries will be configured to point to this local instance, allowing for testing without publishing to the public NPM.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/plugins/create-install-package.md#_snippet_5>

LANGUAGE: shell
CODE:

```
npx nx local-registry
```

----------------------------------------

TITLE: Project Creation Prompts
DESCRIPTION: Example interactive prompts during the `create-zephyr-apps` process, guiding the user through project setup details.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2025-01-31-over-the-air-updates-with-zephyr.md#_snippet_4>

LANGUAGE: jsx
CODE:

```
│
◇   ──────────────────────────────╮
│                                 │
│  npx create-zephyr-apps@latest  │
│                                 │
├─────────────────────────────────╯
┌   Create federated applications with Zephyr
│
◇  Where should we create your project?
│  ./acme
│
◇  What type of project you are creating?
│  React Native
│
◇  Project successfully created at acme
│
◇  Problems? ─────────────────────────────────────────────────────────────────╮
│                                                                             │
│  Discord: https://zephyr-cloud.io/discord                                   │
│  Documentation: https://zephyr-cloud.io/docs                                │
│  Open an issue: https://github.com/ZephyrCloudIO/create-zephyr-apps/issues  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────╯
```

----------------------------------------

TITLE: Running Vite Preview Server Command
DESCRIPTION: Command to start the Vite preview server for a specific app using Nx.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/vite/docs/preview-server-examples.md#2025-04-22_snippet_1>

LANGUAGE: bash
CODE:

```
nx preview my-app
```

----------------------------------------

TITLE: Nx Workspace Interactive Setup Prompts
DESCRIPTION: This output displays the interactive questions posed by `create-nx-workspace` during the setup process. Users define the initial application's name, preferred bundler (Vite), unit test runner (Vitest), E2E test runner (Cypress), stylesheet format (CSS), and options for ESLint, Prettier, and CI integration.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/src/content/tutorial/2-react-monorepo/2r-smart-monorepo/2-use-preset/content.mdx#_snippet_1>

LANGUAGE: text
CODE:

```
NX   Let's create a new workspace [https://nx.dev/getting-started/intro]

✔ Application name · react-store
✔ Which bundler would you like to use? · vite
✔ Which unit test runner would you like to use? · vitest
✔ Test runner to use for end to end (E2E) tests · cypress
✔ Default stylesheet format · css
✔ Would you like to use ESLint? · Yes
✔ Would you like to use Prettier for code formatting? · Yes
✔ Which CI provider would you like to use? · github
```

----------------------------------------

TITLE: Custom Done Conditions Configuration
DESCRIPTION: Configuration examples for custom completion conditions using readyWhen option.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/nx/docs/run-commands-examples.md#2025-04-22_snippet_6>

LANGUAGE: json
CODE:

```
"finish-when-ready": {
    "executor": "nx:run-commands",
    "options": {
        "commands": [
            "sleep 5 && echo 'FINISHED'",
            "echo 'READY'"
        ],
        "readyWhen": "READY",
        "parallel": true
    }
}
```

LANGUAGE: json
CODE:

```
"finish-when-multiple-ready": {
    "executor": "nx:run-commands",
    "options": {
        "commands": [
            "sleep $[ ( $RANDOM % 10 ) + 1 ] && echo 'READY1' && sleep 3600",
            "sleep $[ ( $RANDOM % 10 ) + 1 ] && echo 'READY2' && sleep 3600"
        ],
        "readyWhen": ["READY1", "READY2"],
        "parallel": true
    }
}
```

----------------------------------------

TITLE: Storybook Project Configuration Example
DESCRIPTION: A static example of a Storybook target within a project.json file, illustrating the command used to start the Storybook development server.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2024-12-18-dynamic-targets-with-inference.md#_snippet_3>

LANGUAGE: json
CODE:

```
{
  "targets": {
    "storybook": {
      "command": "storybook dev --port 3000",
      "...": "..."
    }
  }
}
```

----------------------------------------

TITLE: Install Nx JavaScript Plugin
DESCRIPTION: This command adds the `@nx/js` package, which is required for Nx Release to manage and release JavaScript packages in your monorepo.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/nx-release/get-started-with-nx-release.md#_snippet_0>

LANGUAGE: shell
CODE:

```
nx add @nx/js
```

----------------------------------------

TITLE: Initialize Nx in an existing NPM workspace
DESCRIPTION: This snippet shows how to initialize Nx within an existing NPM workspace. It requires a `package.json` with a `workspaces` field. The `nx init` command will then guide the user through the Nx setup process.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/start-new-project.md#_snippet_0>

LANGUAGE: json
CODE:

```
{
  "name": "my-workspace",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

LANGUAGE: shell
CODE:

```
nx init
```

----------------------------------------

TITLE: Basic Cypress Configuration with setupNodeEvents
DESCRIPTION: Basic example of configuring Cypress with setupNodeEvents function in a TypeScript configuration file. Shows the minimal setup required for e2e testing node events.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/packages/cypress/cypress-setup-node-events.md#2025-04-22_snippet_0>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // e2e testing node events setup code
    },
  },
});
```

----------------------------------------

TITLE: Example Tutorial Lesson Markdown Content
DESCRIPTION: This snippet shows a basic Markdown file for a tutorial lesson, including the Front Matter section at the top for defining metadata such as type and title, followed by the actual lesson content.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#_snippet_4>

LANGUAGE: markdown
CODE:

```
---
type: lesson
title: Welcome!
---

# Welcome to TutorialKit!

In this tutorial we'll walk you through how to setup your environment to
write your first tutorial 🤩
```

----------------------------------------

TITLE: TutorialKit Project Directory Structure
DESCRIPTION: This snippet illustrates the standard directory layout for a TutorialKit project, highlighting key configuration files and content locations like src/content/tutorial.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
.
├── astro.config.mjs    # TutorialKit uses Astro 🚀 (https://astro.build)
├── src
│   ├── ...
│   ├── content
│   │   └── tutorial    # Your tutorial content lives here
│   └── templates       # Your templates (see below for more information)
├── public
│   ├── favicon.svg
│   └── logo.svg        # Default logo used in top left for your tutorial
├── ...
├── theme.ts            # Customize the theme of the tutorial
└── uno.config.ts       # UnoCSS config (https://unocss.dev/)
```

----------------------------------------

TITLE: Installing Nx React Plugin
DESCRIPTION: Example of installing the @nx/react package matching the installed nx version.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/generated/packages/nx/documents/add.md#2025-04-22_snippet_1>

LANGUAGE: shell
CODE:

```
nx add @nx/react
```

----------------------------------------

TITLE: Legacy React Native Plugin Installation
DESCRIPTION: NPM command for installing React Native plugin in Nx versions below 18

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/packages/react-native/react-native-plugin.md#2025-04-22_snippet_3>

LANGUAGE: shell
CODE:

```
npm add -D @nx/react-native
```

----------------------------------------

TITLE: Nx Core Guides - Adopting Nx
DESCRIPTION: Guides on adopting Nx into existing projects and monorepos.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_46>

LANGUAGE: bash
CODE:

```
# Add Nx to an existing monorepo
npx nx@latest add

# Import an existing project into an Nx workspace
npx nx@latest g @nx/js:import-project --project-path=./path/to/project
```

----------------------------------------

TITLE: Nx Next.js Plugin Setup
DESCRIPTION: Example of setting up a Next.js application within an Nx workspace using the Nx CLI.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/next/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace@latest my-monorepo --preset=next
cd my-monorepo
nx g @nrwl/next:app my-next-app
```

----------------------------------------

TITLE: Running the Start Command
DESCRIPTION: Demonstrates how to execute the start command for a React Native project using the NX CLI.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/react-native/docs/start-examples.md#_snippet_1>

LANGUAGE: bash
CODE:

```
nx run mobile:start
```

----------------------------------------

TITLE: Nx Showcase: Qwik Integration
DESCRIPTION: Demonstrates Nx integration with Qwik. This example repository shows how to set up and manage a Qwik project within an Nx workspace.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/showcase/example-repos.md#_snippet_3>

LANGUAGE: html
CODE:

```
<a href="/showcase/example-repos/add-qwik">Qwik</a>
```

----------------------------------------

TITLE: Nx Installation
DESCRIPTION: Instructions for installing Nx, including global installations and adding Nx to existing projects.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_0>

LANGUAGE: bash
CODE:

```
# Install Nx globally
npm install -g nx

# Add Nx to an existing project
npx @nx/add
```

----------------------------------------

TITLE: Installing Nx using npx
DESCRIPTION: Command to initialize Nx in an existing project using the npx command. This is the easiest way to start using Nx.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/migration/manual.md#2025-04-22_snippet_0>

LANGUAGE: shell
CODE:

```
npx nx@latest init
```

----------------------------------------

TITLE: Installing React Native Plugin
DESCRIPTION: Command for Nx 18+ to add the React Native plugin to an existing workspace

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/packages/react-native/react-native-plugin.md#2025-04-22_snippet_2>

LANGUAGE: shell
CODE:

```
nx add @nx/react-native
```

----------------------------------------

TITLE: Migrate CRA to Nx + Vite
DESCRIPTION: Easily migrate your Create React App (CRA) project to an Nx workspace with a React and Vite-based setup.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_22>

LANGUAGE: shell
CODE:

```
npx nx@latest init
```

----------------------------------------

TITLE: Installing Additional Packages on Nx Cloud Agents
DESCRIPTION: Demonstrates how to install additional Linux packages on Nx Cloud agents using apt. This example installs the GitHub CLI and zip utilities.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/nx-cloud/reference/launch-templates.md#2025-04-22_snippet_21>

LANGUAGE: yaml
CODE:

```
launch-templates:
  my-linux-medium-js:
    resource-class: 'docker_linux_amd64/medium'
    image: 'ubuntu22.04-node20.11-v9'
    init-steps:
      - name: Install Extras
        script: |
          sudo apt install gh unzip zip -y
```

----------------------------------------

TITLE: NX Expo Start Command
DESCRIPTION: Demonstrates the basic usage of the nx run command to start an Expo application. It shows the command structure and a sample project.json configuration for the 'start' target.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/expo/docs/start-examples.md#_snippet_0>

LANGUAGE: json
CODE:

```
{
  "name": "mobile",
  //...
  "targets": {
    //...
    "start": {
      "executor": "@nx/expo:start",
      "options": {
        "port": 8081
      }
    }
    //...
  }
}
```

LANGUAGE: shell
CODE:

```
nx run mobile:start
```

----------------------------------------

TITLE: Migrate CRA to Nx + Webpack (Optional)
DESCRIPTION: If you cannot migrate to Vite immediately, you can maintain a Webpack-based setup during the Nx migration by using this flag.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_23>

LANGUAGE: shell
CODE:

```
npx nx@latest init --vite=false
```

----------------------------------------

TITLE: Nx Showcase: Solid Integration
DESCRIPTION: Demonstrates Nx integration with Solid. This example repository shows how to set up and manage a Solid project within an Nx workspace.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/showcase/example-repos.md#_snippet_2>

LANGUAGE: html
CODE:

```
<a href="/showcase/example-repos/add-solid">Solid</a>
```

----------------------------------------

TITLE: Stay Up to Date with Nx
DESCRIPTION: Connect with the Nx community and stay informed about the latest news and updates through various channels.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/intro.md#_snippet_3>

LANGUAGE: documentation
CODE:

```
Stay up to date with our latest news by starring us on Github (https://github.com/nrwl/nx), subscribing to our Youtube channel (https://www.youtube.com/@nxdevtools), joining our Discord (https://go.nx.dev/community), subscribing to our monthly tech newsletter (https://go.nrwl.io/nx-newsletter) or follow us on X (https://x.com/nxdevtools), Bluesky (https://bsky.app/profile/nx.dev) and LinkedIn (https://www.linkedin.com/company/nxdevtools).
```

----------------------------------------

TITLE: Nx Core Guides - Nx Release
DESCRIPTION: Detailed guides on using Nx for managing project releases, versioning, and publishing.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_47>

LANGUAGE: bash
CODE:

```
# Release a project to NPM
nx release my-package --npm

# Configure custom registries for publishing
nx release my-package --npm --registry=https://my.registry.com
```

----------------------------------------

TITLE: Changes in Storybook Main Config File
DESCRIPTION: Example of configuration changes in .storybook/main.js|ts for Storybook 7, showing the removal of core field and addition of mandatory framework field

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/packages/storybook/storybook-7-setup.md#2025-04-22_snippet_0>

LANGUAGE: javascript
CODE:

```
// Old v6.5 configuration
{
  core: { builder: 'webpack5' },
  // other config
}

// New v7 configuration
{
  framework: '@storybook/react-webpack5',
  // other config
}
```

----------------------------------------

TITLE: Cloning and Installing nx-shops Repository
DESCRIPTION: Commands to clone the nx-shops sample repo and install dependencies using PNPM.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/nx-cloud/tutorial/github-actions.md#2025-04-22_snippet_0>

LANGUAGE: shell
CODE:

```
git clone https://github.com/<your-username>/nx-shops.git
pnpm i
```

----------------------------------------

TITLE: Run Nx Tasks
DESCRIPTION: Examples of running tasks within an Nx workspace. This includes running a task for a single project or running multiple tasks across several projects using `run-many`.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/getting-started/quick-start.md#_snippet_2>

LANGUAGE: shell
CODE:

```
nx build my-app
nx test my-lib
```

LANGUAGE: shell
CODE:

```
nx run-many -t build test lint
```

----------------------------------------

TITLE: Basic Monorepo Structure Example
DESCRIPTION: Shows the initial basic structure of a monorepo with three applications before optimization.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2024-10-25-sports-retailer-success.md#2025-04-22_snippet_0>

LANGUAGE: text
CODE:

```
monorepo/
└── apps/
    ├── storefront/
    ├── internal-dash/
    └── support-dash/
```

----------------------------------------

TITLE: Listing All Installed Plugins
DESCRIPTION: Example command to list all plugins installed in the current Nx workspace.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/generated/cli/list.md#2025-04-22_snippet_1>

LANGUAGE: shell
CODE:

```
 nx list
```

----------------------------------------

TITLE: Convert App to Module Federation Remote
DESCRIPTION: Converts an existing Nx application into a Module Federation remote application. This setup allows the application to be consumed by a host application and includes routing configuration.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-mf-examples.md#_snippet_1>

LANGUAGE: bash
CODE:

```
nx g setup-mf myapp --mfType=remote --routing=true
```

----------------------------------------

TITLE: Package.json Scripts
DESCRIPTION: Defines the scripts for common development tasks like starting, building, and testing the application using Nx.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_3>

LANGUAGE: json
CODE:

```
{
  "name": "awesomereactapp",
  "scripts": {
    "start": "nx serve",
    "build": "nx build",
    "test": "nx test"
  }
}
```

----------------------------------------

TITLE: Project Structure Overview
DESCRIPTION: Illustrates the typical directory and file structure of an Astro project using Starlight. Key directories include `public/` for static assets and `src/content/docs/` for documentation files.

SOURCE: <https://github.com/nrwl/nx/blob/master/astro-docs/README.md#_snippet_1>

LANGUAGE: shell
CODE:

```
. 
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

----------------------------------------

TITLE: Storing Affected Projects for Manual Distribution in YAML
DESCRIPTION: This snippet shows how to get the list of affected projects and store them in an environment variable for use by agent jobs in a manual distribution setup.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/nx-cloud/concepts/parallelization-distribution.md#2025-04-22_snippet_0>

LANGUAGE: yaml
CODE:

```
# Get the list of affected projects
- nx show projects --affected --json > affected-projects.json
# Store the list of affected projects in a PROJECTS environment variable
# that is accessible by the agent jobs
- node storeAffectedProjects.js
```

----------------------------------------

TITLE: Specify Styles Entrypoint for Tailwind Setup
DESCRIPTION: Configures Tailwind CSS with a specific styles entrypoint file. This is useful when your main styles file is not located at the default path. The path should be relative to the workspace root.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-tailwind-examples.md#_snippet_1>

LANGUAGE: bash
CODE:

```
nx g @nx/angular:setup-tailwind myapp --stylesEntryPoint=apps/myapp/src/styles.css
```

----------------------------------------

TITLE: Convert App to Host with Routing (Nx)
DESCRIPTION: This command converts an existing application named `myapp` into a host application with Module Federation enabled. The `--routing=true` flag enables routing for the host application. The `--mfType=host` flag specifies that the application should be configured as a host.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-mf-examples.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
nx g setup-mf myapp --mfType=host --routing=true
```

----------------------------------------

TITLE: Previewing Nx Release Changes with Dry Run
DESCRIPTION: This command demonstrates how to use `nx release` with the `--dry-run` option to preview the changes that would be made to package versions, package.json files, and changelogs without actually applying them. It shows the version resolution, application of new versions, and diffs for package.json updates.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/nx-release/get-started-with-nx-release.md#_snippet_4>

LANGUAGE: text
CODE:

```
 NX   Running release version for project: pkg-1

pkg-1 📄 Resolved the current version as 0.0.1 from manifest: packages/pkg-1/package.json
pkg-1 ❓ Applied semver relative bump "major", from the prompted specifier, to get new version 1.0.0
pkg-1 ✍️ New version 1.0.0 written to manifest: packages/pkg-1/package.json

 NX   Running release version for project: pkg-2

pkg-2 📄 Resolved the current version as 0.0.1 from manifest: packages/pkg-2/package.json
pkg-2 ❓ Applied version 1.0.0 directly, because the project is a member of a fixed release group containing pkg-1
pkg-2 ✍️ New version 1.0.0 written to manifest: packages/pkg-2/package.json

 NX   Running release version for project: pkg-3

pkg-3 📄 Resolved the current version as 0.0.1 from manifest: packages/pkg-3/package.json
pkg-3 ❓ Applied version 1.0.0 directly, because the project is a member of a fixed release group containing pkg-1
pkg-3 ✍️ New version 1.0.0 written to manifest: packages/pkg-3/package.json

UPDATE packages/pkg-1/package.json [dry-run]

    "name": "@myorg/pkg-1",
-   "version": "0.0.1",
+   "version": "0.0.2",
    "dependencies": {
      "tslib": "^2.3.0",
-     "@myorg/pkg-2": "0.0.1"
+     "@myorg/pkg-2": "0.0.2"
    },

 UPDATE packages/pkg-2/package.json [dry-run]

    "name": "@myorg/pkg-2",
-   "version": "0.0.1",
+   "version": "0.0.2",
    "dependencies": {

 UPDATE packages/pkg-3/package.json [dry-run]

    "name": "@myorg/pkg-3",
-   "version": "0.0.1",
+   "version": "0.0.2",
    "dependencies": {


NX   Updating npm lock file


NX   Staging changed files with git


NOTE: The "dryRun" flag means no changes were made.

NX   Previewing an entry in CHANGELOG.md for v0.0.2


CREATE CHANGELOG.md [dry-run]
+ ## 0.0.2 (2024-01-23)
+
+ This was a version bump only, there were no code changes.

NX   Staging changed files with git


NOTE: The "dryRun" flag means no changelogs were actually created.

NX   Committing changes with git


NX   Tagging commit with git

Skipped publishing packages.
```

----------------------------------------

TITLE: Clone Nx Shops Sample Repository
DESCRIPTION: This command clones the forked `nx-shops` sample repository from GitHub to your local machine. Replace `<your-username>` with your actual GitHub username. This is the first step to set up the example project for the tutorial.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/nx-cloud/tutorial/github-actions.md#_snippet_0>

LANGUAGE: shell
CODE:

```
git clone https://github.com/<your-username>/nx-shops.git
```

----------------------------------------

TITLE: Install Nx in PNPM Monorepo
DESCRIPTION: Installs Nx as a dev dependency at the root of a PNPM monorepo using the `-w` flag for workspace-level installation.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2022-07-14-setup-a-monorepo-with-pnpm-workspaces-and-speed-it-up-with-nx.md#_snippet_22>

LANGUAGE: shell
CODE:

```
pnpm add nx -D -w
```

----------------------------------------

TITLE: Create Nx Workspace with Angular Rspack (SSR)
DESCRIPTION: Creates a new Nx workspace with an Angular application configured to use Rspack for Server-Side Rendering (SSR). This process is similar to CSR setup but includes enabling the SSR option during workspace creation.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/guides/angular-rspack/getting-started.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npx create-nx-workspace myorg

NX   Let's create a new workspace [[https://nx.dev/getting-started/intro](https://nx.dev/getting-started/intro)]

✔ Which stack do you want to use? · angular
✔ Integrated monorepo, or standalone project? · integrated
✔ Application name · myorg
✔ Which bundler would you like to use? · rspack
✔ Default stylesheet format · css
✔ Do you want to enable Server-Side Rendering (SSR)? · Yes
✔ Which unit test runner would you like to use? · vitest
✔ Test runner to use for end to end (E2E) tests · playwright

NX   Creating your v20.8.0 workspace.

```

----------------------------------------

TITLE: Create Starlight Project
DESCRIPTION: This command initializes a new Astro project using the Starlight template. It requires pnpm to be installed.

SOURCE: <https://github.com/nrwl/nx/blob/master/astro-docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm create astro@latest -- --template starlight
```

----------------------------------------

TITLE: Argument Forwarding Configuration
DESCRIPTION: Examples of argument forwarding behavior and configuration options in run-commands.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/nx/docs/run-commands-examples.md#2025-04-22_snippet_4>

LANGUAGE: shell
CODE:

```
nx run frontend:webpack --args="--config=example.config.js"
```

LANGUAGE: json
CODE:

```
"webpack": {
    "executor": "nx:run-commands",
    "options": {
        "command": "webpack"
    }
}
```

LANGUAGE: json
CODE:

```
"webpack": {
    "executor": "nx:run-commands",
    "options": {
        "commands": [
            {
                "command": "webpack",
                "forwardAllArgs": false
            }
        ]
    }
}
```

----------------------------------------

TITLE: Add Nx to Existing Repository
DESCRIPTION: Command to add Nx to an existing repository. This command initializes Nx in your current project.

SOURCE: <https://github.com/nrwl/nx/blob/master/scripts/readme-fragments/content.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npx nx@latest init
```

----------------------------------------

TITLE: Previous Local Registry Setup Script
DESCRIPTION: This script demonstrates the older method of starting a local registry and publishing packages using `nx run-many`. It's identified by the use of `execFileSync` to run the `publish` target.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/nx-release/update-local-registry-setup.md#_snippet_0>

LANGUAGE: typescript
CODE:

```
/**
 * This script starts a local registry for e2e testing purposes.
 * It is meant to be called in jest's globalSetup.
 */
import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { execFileSync } from 'child_process';

export default async () => {
  // local registry target to run
  const localRegistryTarget = '@demo-plugin-1800/source:local-registry';
  // storage folder for the local registry
  const storage = './tmp/local-registry/storage';

  global.stopLocalRegistry = await startLocalRegistry({
    localRegistryTarget,
    storage,
    verbose: false,
  });
  const nx = require.resolve('nx');
  execFileSync(
    nx,
    ['run-many', '--targets', 'publish', '--ver', '0.0.0-e2e', '--tag', 'e2e'],
    { env: process.env, stdio: 'inherit' }
  );
};
```

----------------------------------------

TITLE: Starting Metro Server
DESCRIPTION: Command to start the Metro server for device communication

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/generated/packages/react-native/documents/overview.md#2025-04-22_snippet_9>

LANGUAGE: shell
CODE:

```
nx start <your-app-name>
```

----------------------------------------

TITLE: Installing Non-Core Nx Plugin
DESCRIPTION: Example of installing the latest version of a non-core Nx plugin.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/generated/packages/nx/documents/add.md#2025-04-22_snippet_2>

LANGUAGE: shell
CODE:

```
nx add non-core-nx-plugin
```

----------------------------------------

TITLE: Repository Setup Commands
DESCRIPTION: Shell commands for cloning the repository and installing dependencies using NPM.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/tutorials/typescript-packages.md#2025-04-22_snippet_3>

LANGUAGE: shell
CODE:

```
git clone https://github.com/<your-username>/tuskydesign.git
npm install
```

----------------------------------------

TITLE: Running Vite Dev Server Command
DESCRIPTION: Command to start the Vite dev server for a specific app using Nx.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/vite/docs/dev-server-examples.md#2025-04-22_snippet_1>

LANGUAGE: bash
CODE:

```
nx serve my-app
```

----------------------------------------

TITLE: Convert App to Module Federation Host
DESCRIPTION: Converts an existing Nx application into a Module Federation host application. This involves setting up routing and configuring the application to serve remote applications.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-mf-examples.md#_snippet_0>

LANGUAGE: bash
CODE:

```
nx g setup-mf myapp --mfType=host --routing=true
```

----------------------------------------

TITLE: Original package.json Build Script
DESCRIPTION: Example of a typical build script in package.json before integrating with Nx. This shows the starting point before enabling Nx caching.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/migration/manual.md#2025-04-22_snippet_7>

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

----------------------------------------

TITLE: Storybook 9 Setup Guide
DESCRIPTION: Provides instructions for setting up Storybook version 9 in an Nx project. This guide is for scenarios where automatic migration is not sufficient.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/storybook/plugin-react.md#_snippet_4>

LANGUAGE: APIDOC
CODE:

```
Storybook 9 Setup:
  URL: /technologies/test-tools/storybook/recipes/storybook-9-setup
  Description: Guide for setting up Storybook version 9.
  Dependencies: Nx, Storybook v9
```

----------------------------------------

TITLE: Nx Recipes for Various Stacks
DESCRIPTION: Nx provides a collection of example repositories (Nx Recipes) showcasing different technology stacks and configurations. These examples cover setups like fastify with various databases (mongo, postgres, redis), NextJS with TRPC, Remix, and serverless applications.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-07-06-nx-16-5-release.md#_snippet_5>

LANGUAGE: bash
CODE:

```
git clone https://github.com/nrwl/nx-recipes.git
```

----------------------------------------

TITLE: Nx Showcase: Lit Integration
DESCRIPTION: Demonstrates Nx integration with Lit. This example repository shows how to set up and manage a Lit project within an Nx workspace.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/showcase/example-repos.md#_snippet_1>

LANGUAGE: html
CODE:

```
<a href="/showcase/example-repos/add-lit">Lit</a>
```

----------------------------------------

TITLE: Generating Standard Tailwind Setup in Nx Angular
DESCRIPTION: This command generates a standard Tailwind CSS setup for the specified Angular application (`myapp`). It uses the `@nx/angular:setup-tailwind` generator.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-tailwind-examples.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
nx g @nx/angular:setup-tailwind myapp
```

----------------------------------------

TITLE: Project Commands
DESCRIPTION: Lists common commands for managing an Astro project with Starlight, including dependency installation, development server, building for production, and previewing.

SOURCE: <https://github.com/nrwl/nx/blob/master/astro-docs/README.md#_snippet_2>

LANGUAGE: shell
CODE:

```
pnpm install
# Installs dependencies

pnpm dev
# Starts local dev server at `localhost:4321`

pnpm build
# Build your production site to `./dist/`

pnpm preview
# Preview your build locally, before deploying

pnpm astro ...
# Run CLI commands like `astro add`, `astro check`

pnpm astro -- --help
# Get help using the Astro CLI
```

----------------------------------------

TITLE: Add Rspack to Existing Nx Monorepo
DESCRIPTION: Installs the Rspack Nx plugin and generates a new Rspack-based application within an existing Nx monorepo. This allows for easy experimentation with Rspack in production setups and integration with existing libraries.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-03-10-rspack-getting-up-to-speed-with-nx.md#_snippet_1>

LANGUAGE: npm
CODE:

```
npm i @nrwl/rspack -D
```

LANGUAGE: shell
CODE:

```
npx nx g @nrwl/rspack:app myrspackapp
```

----------------------------------------

TITLE: Preview First Nx Release with Dry Run
DESCRIPTION: This command initiates the first release process with Nx Release. The `--first-release` option tells Nx Release to not expect existing git tags or changelog files, and `--dry-run` allows you to test the configuration without making actual changes.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/nx-release/get-started-with-nx-release.md#_snippet_2>

LANGUAGE: shell
CODE:

```
nx release --first-release --dry-run
```

----------------------------------------

TITLE: Working Directory Configuration
DESCRIPTION: Example showing how to set a working directory for command execution using the cwd option.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/nx/docs/run-commands-examples.md#2025-04-22_snippet_2>

LANGUAGE: json
CODE:

```
"create-script": {
    "executor": "nx:run-commands",
    "options": {
        "cwd": "apps/frontend",
        "commands": [
          "mkdir -p scripts",
          "touch scripts/my-script.sh",
          "chmod +x scripts/my-script.sh"
        ],
        "parallel": false
    }
}
```

----------------------------------------

TITLE: Install React Native Web Dependencies
DESCRIPTION: Installs the necessary packages for React Native web support using Yarn.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2021-10-14-step-by-step-guide-on-creating-a-monorepo-for-react-native-apps-using-nx.md#_snippet_51>

LANGUAGE: bash
CODE:

```
yarn add react-native-web
yarn add --dev babel-plugin-react-native-web
```

----------------------------------------

TITLE: Nx Serve Command
DESCRIPTION: Demonstrates the command to serve an Nx application using Vite.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/vite/docs/build-examples.md#_snippet_0>

LANGUAGE: bash
CODE:

```
nx serve my-app
```

----------------------------------------

TITLE: Windows Development Setup
DESCRIPTION: Instructions for developing Nx on Windows, which requires using WSL for package installation and running commands.

SOURCE: <https://github.com/nrwl/nx/blob/master/CONTRIBUTING.md#_snippet_14>

LANGUAGE: bash
CODE:

```
pnpm install
nx affected --target=test
```

----------------------------------------

TITLE: Fastify Postgres Setup Example
DESCRIPTION: Illustrates a basic Fastify server setup with PostgreSQL connection pooling. This snippet shows how to initialize the Fastify application and establish a connection to the database using a plugin.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/database/postgres-fastify.md#_snippet_1>

LANGUAGE: typescript
CODE:

```
import fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';

const app = fastify();

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/database'
});

app.get('/', async (request, reply) => {
  const result = await app.pg.query('SELECT NOW()');
  return result.rows[0];
});

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log(`Server listening on http://localhost:3000`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

----------------------------------------

TITLE: Convert App to Host and Attach Remotes
DESCRIPTION: Converts an Nx application into a Module Federation host application and configures it to load specified remote applications. This allows the host to dynamically load modules from these remotes.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-mf-examples.md#_snippet_3>

LANGUAGE: bash
CODE:

```
nx g setup-mf myapp --mfType=host --routing=true --remotes=remote1,remote2
```

----------------------------------------

TITLE: Standard Tailwind Setup
DESCRIPTION: Generates a standard Tailwind CSS configuration for an Angular application or publishable library. This command adds Tailwind to your project's dependencies and sets up the necessary configuration files.

SOURCE: <https://github.com/nrwl/nx/blob/master/packages/angular/docs/setup-tailwind-examples.md#_snippet_0>

LANGUAGE: bash
CODE:

```
nx g @nx/angular:setup-tailwind myapp
```

----------------------------------------

TITLE: Starting CI Run with Custom Launch Templates
DESCRIPTION: Demonstrates the command-line usage for starting an Nx Cloud CI run, specifying the number of agents and the custom launch template to use.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/nx-cloud/reference/launch-templates.md#_snippet_2>

LANGUAGE: bash
CODE:

```
nx-cloud start-ci-run --distribute-on="3 template-one"

```

----------------------------------------

TITLE: Nx Tutorials - Gradle Monorepo
DESCRIPTION: Tutorials on setting up and managing Gradle monorepos with Nx.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_52>

LANGUAGE: bash
CODE:

```
# Integrate Nx into a Gradle monorepo for enhanced build capabilities.
# This typically involves setting up Nx executors for Gradle tasks.
```

----------------------------------------

TITLE: TutorialKit UI Layout Diagram
DESCRIPTION: This ASCII diagram visualizes the user interface structure of TutorialKit, showing the arrangement of the content area, code editor, preview/boot screen, and terminal within the application.

SOURCE: <https://github.com/nrwl/nx/blob/master/nx-dev/tutorial/README.md#_snippet_2>

LANGUAGE: markdown
CODE:

```
┌─────────────────────────────────────────────────────┐
│ ● ● ● │
├───────────────────────────┬─────────────────────────┤
│ │ │
│ │ │
│ │ │
│ │ │
│ │ Code Editor │
│ │ │
│ │ │
│ │ │
│ │ │
│ Content ├─────────────────────────┤
│ │ │
│ │ Preview & Boot Screen │
│ │ │
│ │ │
│ ├─────────────────────────┤
│ │ │
│ │ Terminal │
│ │ │
└───────────────────────────┴─────────────────────────┘
```

----------------------------------------

TITLE: Application Routes Structure Example
DESCRIPTION: Shows the structure of an application's routes before breaking them into separate projects.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2024-10-25-sports-retailer-success.md#2025-04-22_snippet_2>

LANGUAGE: text
CODE:

```
storefront/
├── product-search
├── product-details
└── checkout
```

----------------------------------------

TITLE: Nx Core Guides - Tasks & Caching
DESCRIPTION: Comprehensive guides on Nx's task running and caching features.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/reference/sitemap.md#_snippet_45>

LANGUAGE: bash
CODE:

```
# Configure inputs for task caching
nx run my-project:build --inputs=production,tsconfig.json

# Skip task caching for a specific run
nx run my-project:build --cache=false
```

----------------------------------------

TITLE: Initializing Nx in PNPM Workspace using CLI
DESCRIPTION: Command to initialize Nx in an existing PNPM workspace. The command analyzes the repository and guides through interactive setup while preserving the existing workspace structure.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/courses/pnpm-nx-next/lessons/01-nx-init.md#2025-04-22_snippet_0>

LANGUAGE: shell
CODE:

```
nx init
```

----------------------------------------

TITLE: Configuring Root Package.json with Script Example
DESCRIPTION: Example of a basic root package.json file with a 'docs' script that generates documentation. This shows the starting point before making the script Nx-aware.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/shared/recipes/running-tasks/root-level-scripts.md#2025-04-22_snippet_0>

LANGUAGE: json
CODE:

```
{
  "name": "myorg",
  "scripts": {
    "docs": "node ./generateDocsSite.js"
  }
}
```

----------------------------------------

TITLE: Build the Application
DESCRIPTION: Builds the application for deployment. This command outputs the build artifacts to a 'dist' folder.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2023-01-12-react-vite-and-typescript-get-started-in-under-2-minutes.md#_snippet_5>

LANGUAGE: shell
CODE:

```
npx nx build
```

----------------------------------------

TITLE: Remix Application Package.json Scripts
DESCRIPTION: Shows the default scripts in a Remix application's `package.json` file, including build, dev, and start commands.

SOURCE: <https://github.com/nrwl/nx/blob/master/docs/blog/2022-07-14-setup-a-monorepo-with-pnpm-workspaces-and-speed-it-up-with-nx.md#_snippet_3>

LANGUAGE: json
CODE:

```
{
  "private": true,
  "sideEffects": false,
  "scripts": {
    "build": "remix build",
    "dev": "remix dev",
    "start": "remix-serve build"
  },
  ...
}
```
