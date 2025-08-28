========================
CODE SNIPPETS
========================

TITLE: Install Turborepo CLI globally
DESCRIPTION: Install the `turbo` CLI globally using npm, yarn, or pnpm to enable convenient execution of Turborepo commands from any directory within your repository.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/index.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
npm install turbo --global
```

LANGUAGE: bash
CODE:

```
yarn global add turbo
```

LANGUAGE: bash
CODE:

```
pnpm add turbo --global
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: This command initiates the Next.js development server. It typically runs on <http://localhost:3000> and provides live reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-tailwind/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: Commands to initiate the local development server for a Next.js application, enabling live reloading and access via `http://localhost:3000`. Multiple package managers are supported.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/basic/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: This command initiates the Next.js development server, typically accessible at <http://localhost:3000>. It enables live reloading and hot module replacement for rapid development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-npm/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
```

---

TITLE: Start Turborepo Documentation Development Server
DESCRIPTION: Executes the command to launch the local development server for the Turborepo documentation. This allows contributors to preview changes to the documentation in real-time. Ensure all project dependencies are installed prior to execution.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
pnpm run docs:dev
```

---

TITLE: Create Turborepo Project with Specific Example
DESCRIPTION: Start a new Turborepo monorepo by specifying a particular example from the Turborepo repository. This allows users to quickly set up projects with predefined configurations, such as a 'kitchen-sink' example featuring Next.js and Remix.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-11-0.mdx#_snippet_2>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e kitchen-sink
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Commands to start the local development server for a Next.js application using various package managers like npm, yarn, pnpm, or bun.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-vitest/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: Commands to initiate the local development server for a Next.js application, compatible with npm, yarn, pnpm, and bun package managers. The server typically runs on <http://localhost:3000>.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/basic/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

---

TITLE: Bootstrap Turborepo from an official example
DESCRIPTION: Start a new Turborepo monorepo pre-configured with an official example by using the `--example` flag and specifying the example name.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/reference/create-turbo.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest --example [example-name]
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest --example [example-name]
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest --example [example-name]
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest --example [example-name]
```

---

TITLE: Initialize Turborepo Project with create-turbo
DESCRIPTION: This set of commands demonstrates how to use the `create-turbo` CLI tool to bootstrap a new Turborepo monorepo. Users can specify an official example name or a direct GitHub repository URL. Commands are provided for pnpm, yarn, npm, and bun package managers.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/examples.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
# Use an example listed below
pnpm dlx create-turbo@latest --example [example-name]

# Use a GitHub repository from the community
pnpm dlx create-turbo@latest --example [github-url]
```

LANGUAGE: bash
CODE:

```
# Use an example listed below
yarn dlx create-turbo@latest --example [example-name]

# Use a GitHub repository from the community
yarn dlx create-turbo@latest --example [github-url]
```

LANGUAGE: bash
CODE:

```
# Use an example listed below
npx create-turbo@latest --example [example-name]

# Use a GitHub repository from the community
npx create-turbo@latest --example [github-url]
```

LANGUAGE: bash
CODE:

```
# Use an example listed below
bunx create-turbo@latest --example [example-name]

# Use a GitHub repository from the community
bunx create-turbo@latest --example [github-url]
```

---

TITLE: Quickstart Turborepo with Vite Example
DESCRIPTION: Use `create-turbo` to quickly scaffold a new Turborepo project pre-configured with Vite. This command initializes a new monorepo with a basic Vite setup.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/frameworks/vite.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest -e with-vite
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest -e with-vite
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e with-vite
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest -e with-vite
```

---

TITLE: Create a new Turborepo project
DESCRIPTION: Initialize a new Turborepo project using the `create-turbo` command. This sets up a basic starter repository with example applications and shared libraries.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/installation.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest
```

---

TITLE: Quickstart: Create Turborepo with SvelteKit Example
DESCRIPTION: This snippet demonstrates how to quickly initialize a new Turborepo project that includes a pre-configured SvelteKit application. It leverages the `create-turbo` CLI tool with the `with-svelte` example, providing commands for pnpm, yarn, npm, and bun package managers.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/frameworks/sveltekit.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest -e with-svelte
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest -e with-svelte
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e with-svelte
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest -e with-svelte
```

---

TITLE: Create Turborepo Project from Official Example
DESCRIPTION: This command uses `create-turbo` to initialize a new Turborepo project based on an official example, such as 'kitchen-sink', simplifying project setup.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-9-0.mdx#_snippet_2>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e kitchen-sink
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Commands to start the local development server for a Next.js application. This server enables hot-reloading and allows you to view your application in a browser, typically at <http://localhost:3000>.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-vitest/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

---

TITLE: Start Development Servers for Turborepo
DESCRIPTION: Run this command from the root of your Turborepo to concurrently start development servers for all applications and packages. This enables live reloading and facilitates simultaneous development across different parts of the monorepo.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-yarn/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd my-turborepo
yarn dev
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: This command starts the Next.js development server, making the application accessible locally. It enables hot-reloading for rapid development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-docker/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Initialize Turborepo with Prisma Example
DESCRIPTION: Use this command to create a new Turborepo project pre-configured with a community-supported Prisma example, allowing for quick setup and exploration of Prisma integration.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/tools/prisma.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e with-prisma
```

---

TITLE: Start a development server for SolidStart
DESCRIPTION: After installing dependencies, use these commands to start the development server. The second command also automatically opens the application in a new browser tab.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-solid/apps/web/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm run dev

npm run dev -- --open
```

---

TITLE: Initialize Turborepo with Angular Starter
DESCRIPTION: This command uses `npx` to execute the `create-turbo` utility, specifically initializing a new Turborepo project pre-configured with an Angular example. It's the quickest way to get started with this specific setup.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-angular/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-angular
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: This command initiates the Next.js development server, making the application accessible locally. It enables features like hot-reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-berry/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: This command initiates the Next.js development server, making the application accessible locally. It supports hot-reloading for immediate feedback on code changes.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-npm/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm run dev
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: This command initiates the Next.js development server, making the application accessible locally. It enables features like hot-reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-tailwind/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Install Dependencies and Build Shared Configuration
DESCRIPTION: This command sequence installs project dependencies and then builds the shared Vitest configuration package, which is essential for the Turborepo setup.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-vitest/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
pnpm install
pnpm build --filter=@repo/vitest-config
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: Executes the `yarn dev` command to launch the local development server for a Next.js application, typically accessible via <http://localhost:3001>.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-typeorm/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Test Turborepo Example with create-turbo CLI
DESCRIPTION: This command demonstrates how to test a custom Turborepo example by simulating a user's experience. It uses the `create-turbo` CLI with the `--example` flag, pointing to the URL of the example's source code on GitHub. This allows contributors to validate their examples before submission.

SOURCE: <https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md#_snippet_19>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest --example https://github.com/your-org/your-repo/tree/your-branch/...
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: Initiates the Next.js development server, typically accessible at <http://localhost:3000>. This command enables hot-reloading for rapid development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-yarn/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Initialize Turborepo from a custom GitHub example
DESCRIPTION: Use a custom starter or example hosted on GitHub by providing its URL with the `--example` flag. This is useful for personal or community-maintained templates.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/reference/create-turbo.mdx#_snippet_2>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest --example [github-url]
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest --example [github-url]
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest --example [github-url]
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest --example [github-url]
```

---

TITLE: Run Nuxt.js Development Server
DESCRIPTION: Execute this command in your terminal to start the local development server for the Nuxt.js application. The application will typically be accessible at <http://localhost:3001>.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-vue-nuxt/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dev
```

---

TITLE: Define setup tasks to run before dev in turbo.json
DESCRIPTION: This `turbo.json` configuration demonstrates how to use `dependsOn` to ensure a setup task (e.g., `//#dev:setup`) completes before the main `dev` task starts. The setup task can define outputs like `.codegen/**` to manage generated files.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/crafting-your-repository/developing-applications.mdx#_snippet_2>

LANGUAGE: json
CODE:

```
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["//#dev:setup"]
    },
    "//#dev:setup": {
      "outputs": [".codegen/**"]
    }
  }
}
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: Executes the command to launch the local development server for the Next.js application, typically accessible at <http://localhost:3000>. This allows for real-time development and testing.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-berry/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dev
```

---

TITLE: Quickstart: Create Turborepo with Nuxt.js example
DESCRIPTION: Use `create-turbo` to quickly set up a new Turborepo monorepo pre-configured with a Nuxt.js application. This command initializes a new project with the `with-vue-nuxt` example template.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/frameworks/nuxt.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest -e with-vue-nuxt
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest -e with-vue-nuxt
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e with-vue-nuxt
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest -e with-vue-nuxt
```

---

TITLE: Quickstart: Create a new Turborepo with Next.js
DESCRIPTION: This section provides commands to quickly set up a new Turborepo monorepo that includes two Next.js applications. It demonstrates the initial setup using `create-turbo` with different package managers.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/frameworks/nextjs.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: Executes the `yarn dev` command to launch the Next.js development server, typically accessible via a web browser at <http://localhost:3001>. This command enables hot-reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-yarn/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Initiates the Next.js development server using pnpm, making the application accessible locally. This command enables features like hot-reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-rollup/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dev
```

---

TITLE: Initialize Turborepo Project Dependencies
DESCRIPTION: This command installs all necessary project dependencies for Turborepo at the root of the repository. It should be run after cloning the repository to set up the development environment.

SOURCE: <https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md#_snippet_3>

LANGUAGE: Bash
CODE:

```
pnpm install
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Initiates the Next.js development server, making the application accessible locally. This command enables hot-reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-react-native-web/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Initialize Turborepo with NestJS Example
DESCRIPTION: This command quickly sets up a new Turborepo project using the 'with-nestjs' example starter. It leverages the `create-turbo` CLI tool to scaffold the project with pre-configured NestJS and Next.js applications.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-nestjs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e with-nestjs
```

---

TITLE: Create New Turborepo Project
DESCRIPTION: Initialize a new Turborepo monorepo with a default example setup. This command uses `create-turbo@latest` to quickly scaffold a project, typically including a basic configuration with multiple applications like Next.js.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-11-0.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest
```

---

TITLE: Initialize Turborepo Design System Starter
DESCRIPTION: This command initializes a new Turborepo project using the `create-turbo` CLI tool, specifically setting up the design system starter example with Changesets integration. It fetches the latest version of the starter template to ensure a consistent starting point.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-changesets/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-changesets
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Initiates the Next.js development server, making the application accessible locally for development and testing. The server typically runs on port 3000.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-prisma/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Run Turborepo Development Server
DESCRIPTION: This command initiates the development server for a Turborepo project, typically making the application accessible via a local URL like <http://localhost:3000>. It enables live reloading for efficient development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-gatsby/apps/docs/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
turbo dev
```

---

TITLE: Run Next.js Development Server with Yarn
DESCRIPTION: This command initiates the Next.js development server, making the application accessible locally for development and testing. It enables features like hot module replacement for a smooth development experience.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-typeorm/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Create a new Turborepo project with Prisma
DESCRIPTION: Command to scaffold a new Turborepo project using `create-turbo` with the Prisma example, followed by navigating into the project directory.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-prisma/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npx create-turbo@latest -e with-prisma
cd ./my-turborepo
```

---

TITLE: Install Turborepo CLI and local dependency
DESCRIPTION: Instructions to install the `turbo` CLI globally and as a development dependency in a repository for various JavaScript package managers. This setup ensures optimal developer experience and leverages Turborepo's features, allowing for incremental adoption.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/add-to-existing-repository.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
# Global install
pnpm add turbo --global
# Install in repository
pnpm add turbo --save-dev --workspace-root
```

LANGUAGE: bash
CODE:

```
# Global install
yarn global add turbo
# Install in repository
yarn add turbo --dev
```

LANGUAGE: bash
CODE:

```
# Global install
npm install turbo --global
# Install in repository
npm install turbo --save-dev
```

LANGUAGE: bash
CODE:

```
# Global install
bun install turbo --global
# Install in repository
bun install turbo --dev
```

---

TITLE: Install Optional Dependencies for Test Execution
DESCRIPTION: This snippet provides commands to install the `jq` and `zstd` utilities, which are required for running tests locally. It includes commands for macOS (Homebrew), Linux (APT), and Windows (Chocolatey).

SOURCE: <https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md#_snippet_0>

LANGUAGE: Bash
CODE:

```
brew install jq zstd
```

LANGUAGE: Bash
CODE:

```
sudo apt update && sudo apt install jq zstd
```

LANGUAGE: Bash
CODE:

```
choco install jq zstandard
```

---

TITLE: Install `turbo` CLI Globally
DESCRIPTION: This command installs the `turbo` command-line interface globally using npm. This makes the `turbo` binary available in your system's PATH, allowing it to be invoked from any directory.

SOURCE: <https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md#_snippet_6>

LANGUAGE: Bash
CODE:

```
npm install -g turbo
```

---

TITLE: Initialize Turborepo Project with Yarn
DESCRIPTION: This command initializes a new Turborepo monorepo project based on the provided example. It uses `npx create-turbo` to scaffold the project, specifically configuring it to use Yarn as the package manager.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-yarn/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-yarn
```

---

TITLE: Install LLVM Linker (lld) on Linux
DESCRIPTION: This command installs the LLVM Linker (`lld`) on Linux distributions using APT. `lld` is necessary as it's not always installed by default and is required for certain build processes.

SOURCE: <https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md#_snippet_1>

LANGUAGE: Bash
CODE:

```
apt install lld
```

---

TITLE: Initialize Turborepo Project with Rollup Example
DESCRIPTION: Command to quickly set up a new Turborepo project using the 'with-rollup' example template, which includes a pre-configured monorepo structure.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-rollup/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-rollup
```

---

TITLE: Start Development Servers for All Turborepo Projects
DESCRIPTION: Run these commands from the Turborepo root to start development servers for all applications and packages configured in the monorepo. This is useful for simultaneous development across multiple projects.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/basic/README.md#_snippet_3>

LANGUAGE: sh
CODE:

```
turbo dev
```

LANGUAGE: sh
CODE:

```
npx turbo dev
```

LANGUAGE: sh
CODE:

```
yarn exec turbo dev
```

LANGUAGE: sh
CODE:

```
pnpm exec turbo dev
```

---

TITLE: Start Development Server for a Specific Turborepo Package
DESCRIPTION: To focus development on a single application or package, use the `--filter` option with the `dev` command. Replace `web` with the name of the specific package you intend to develop.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/basic/README.md#_snippet_4>

LANGUAGE: sh
CODE:

```
turbo dev --filter=web
```

LANGUAGE: sh
CODE:

```
npx turbo dev --filter=web
```

LANGUAGE: sh
CODE:

```
yarn exec turbo dev --filter=web
```

LANGUAGE: sh
CODE:

```
pnpm exec turbo dev --filter=web
```

---

TITLE: Create New Turborepo Project
DESCRIPTION: Start a new Turborepo project quickly by running `npx create-turbo@latest`. This command initializes a new monorepo with the latest Turborepo setup.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-13-0.mdx#_snippet_2>

LANGUAGE: Shell
CODE:

```
npx create-turbo@latest
```

---

TITLE: Start Development Server Across All Packages with Turborepo
DESCRIPTION: Initiate the development process for all packages in a multi-package workspace by running `turbo dev`. This command starts the development tasks defined for each package, streamlining the development workflow.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/add-to-existing-repository.mdx#_snippet_11>

LANGUAGE: bash
CODE:

```
turbo dev
```

---

TITLE: Run Development Server for Vue App
DESCRIPTION: This command starts the local development server for the Vue.js application. It allows you to view and interact with the application in your browser, with hot-reloading enabled for immediate feedback on code changes.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-vue-nuxt/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm dev
```

---

TITLE: Initialize Turborepo project with Docker example
DESCRIPTION: Command to quickly set up a new Turborepo project pre-configured with Docker support using the `create-turbo` CLI. This provides a ready-to-use monorepo structure with Next.js, Express, and shared UI/utility packages.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-docker/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-docker
```

---

TITLE: Nx Configuration (nx.json)
DESCRIPTION: Example configuration for Nx's `nx.json` file, detailing named inputs for production builds, plugins for various tools (Next.js, Playwright, ESLint, Jest), target defaults, and generators. This configuration demonstrates the extensive setup often required in Nx projects.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/migrating-from-nx.mdx#_snippet_1>

LANGUAGE: json
CODE:

```
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/eslint.config.cjs",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/test-setup.[jt]s"
    ],
    "sharedGlobals": ["{workspaceRoot}/.github/workflows/ci.yml"]
  },
  "nxCloudId": "6789ec521d90a2165398f39a",
  "plugins": [
    {
      "plugin": "@nx/next/plugin",
      "options": {
        "startTargetName": "start",
        "buildTargetName": "build",
        "devTargetName": "dev",
        "serveStaticTargetName": "serve-static"
      }
    },
    {
      "plugin": "@nx/playwright/plugin",
      "options": {
        "targetName": "e2e"
      }
    },
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    },
    {
      "plugin": "@nx/jest/plugin",
      "options": {
        "targetName": "test"
      }
    }
  ],
  "targetDefaults": {
    "e2e-ci--**/*": {
      "dependsOn": ["^build"]
    }
  },
  "generators": {
    "@nx/next": {
      "application": {
        "style": "tailwind",
        "linter": "eslint"
      }
    }
  }
}
```

---

TITLE: create-turbo CLI Command Line Options
DESCRIPTION: Available command-line options for the `create-turbo` CLI tool, including package manager selection, installation skipping, transformation skipping, Turborepo version, example selection, and help flags.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/reference/create-turbo.mdx#_snippet_3>

LANGUAGE: txt
CODE:

```
-m, --package-manager to use (choices: "npm", "yarn", "pnpm", "bun")

--skip-install: Do not run a package manager install after creating the project (Default: false)

--skip-transforms: Do not run any code transformation after creating the project (Default: false)

--turbo-version <version>: Use a specific version of turbo (default: latest)

-e, --example [name]|[github-url]: An example to bootstrap the app with. You can use an example name from the official Turborepo repo or a GitHub URL. The URL can use any branch and/or subdirectory

-p, --example-path <path-to-example>: In a rare case, your GitHub URL might contain a branch name with a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar). In this case, you must specify the path to the example separately: --example-path foo/bar

-v, --version:  Output the current version

-h, --help: Display help for command
```

---

TITLE: Build and run Turborepo applications with Docker Compose
DESCRIPTION: Sequence of commands to prepare and deploy the Turborepo applications using Docker Compose. It involves installing project dependencies, establishing an isolated Docker network for inter-container communication, building optimized production images with BuildKit, and starting all services in a detached background mode. Access the running application at `http://localhost:3000`.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-docker/README.md#_snippet_1>

LANGUAGE: sh
CODE:

```
# Install dependencies
yarn install

# Create a network, which allows containers to communicate
# with each other, by using their container name as a hostname
docker network create app_network

# Build prod using new BuildKit engine
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.yml build

# Start prod in detached mode
docker-compose -f docker-compose.yml up -d
```

---

TITLE: Initialize Turborepo Kitchen Sink Starter
DESCRIPTION: Use npx to create a new Turborepo project based on the kitchen-sink example template. This command fetches the latest version of create-turbo and initializes the project structure.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/kitchen-sink/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e kitchen-sink
```

---

TITLE: Start Turborepo Development Server
DESCRIPTION: Use the `turbo dev` command to start the local development server for your Turborepo project. This command enables hot-reloading and real-time updates as you modify your code, typically accessible at `http://localhost:8000`.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-gatsby/apps/web/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
turbo dev
```

---

TITLE: Initialize New Turborepo Starter Project
DESCRIPTION: Use this command to quickly set up a new Turborepo project based on the official starter template. This command scaffolds the basic monorepo structure with pre-configured applications and packages.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/basic/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest
```

---

TITLE: Start a SolidStart development server
DESCRIPTION: Commands to start the development server for a SolidStart project. An option is provided to automatically open the application in a new browser tab upon server startup.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-solid/apps/docs/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

---

TITLE: Build All Applications and Packages in Turborepo
DESCRIPTION: Execute this command from the root directory of your Turborepo to build all applications and packages defined within the monorepo. It leverages Yarn to run the build scripts for each component, preparing them for deployment or production use.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-yarn/README.md#_snippet_1>

LANGUAGE: sh
CODE:

```
cd my-turborepo
yarn build
```

---

TITLE: Start Development Servers for Turborepo Applications
DESCRIPTION: Change the current directory to the Turborepo root (`with-solid`) and run `pnpm run dev`. This command initiates the development servers for all configured applications and packages, enabling live reloading and local development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-solid/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd with-solid
pnpm run dev
```

---

TITLE: Copy environment variables for Prisma connection
DESCRIPTION: Copy the example environment file to the database and web application directories, ensuring Prisma can connect to the database.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-prisma/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
cp .env.example ./packages/database/.env
cp .env.example ./apps/web/.env
```

---

TITLE: Start development servers for all Turborepo apps and packages
DESCRIPTION: Navigate into your Turborepo directory and execute this command to start the development servers for all applications and packages. This enables live development with hot-reloading across your monorepo workspaces.

SOURCE: <https://github.com/vercel/turborepo/blob/main/turborepo-tests/integration/fixtures/turbo_trace/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd my-turborepo
pnpm dev
```

---

TITLE: Start development server for Turborepo
DESCRIPTION: Navigate into the Turborepo directory and run the Yarn development command to start development servers for all applications and packages, enabling concurrent development across the monorepo.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-berry/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd my-turborepo
yarn dev
```

---

TITLE: Install Turborepo CLI globally
DESCRIPTION: Install the `turbo` command-line interface globally on your system. This enables quick execution of `turbo` commands from any directory and provides flexibility for local development workflows.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/installation.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
pnpm add turbo --global
```

LANGUAGE: bash
CODE:

```
yarn global add turbo
```

LANGUAGE: bash
CODE:

```
npm install turbo --global
```

LANGUAGE: bash
CODE:

```
bun install turbo --global
```

---

TITLE: Initialize Turborepo with Vue and Nuxt Example
DESCRIPTION: Use this command to quickly set up a new Turborepo monorepo project pre-configured with a Vue and Nuxt example. This leverages the `create-turbo` CLI to scaffold the project with recommended best practices.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-11-0.mdx#_snippet_3>

LANGUAGE: Shell
CODE:

```
npx create-turbo@latest -e with-vue-nuxt
```

---

TITLE: Build All Applications and Packages in Turborepo
DESCRIPTION: Execute these commands from the root of your Turborepo to build all applications and packages defined within the monorepo. Options are provided for users with a global `turbo` installation or those preferring to use their package manager's `dlx`/`exec` command.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/basic/README.md#_snippet_1>

LANGUAGE: sh
CODE:

```
turbo build
```

LANGUAGE: sh
CODE:

```
npx turbo build
```

LANGUAGE: sh
CODE:

```
yarn dlx turbo build
```

LANGUAGE: sh
CODE:

```
pnpm exec turbo build
```

---

TITLE: Install ESLint and `eslint-plugin-turbo`
DESCRIPTION: Instructions for installing ESLint and `eslint-plugin-turbo` as development dependencies using npm, which are prerequisite steps for using the plugin.

SOURCE: <https://github.com/vercel/turborepo/blob/main/packages/eslint-plugin-turbo/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npm install eslint --save-dev
npm install eslint-plugin-turbo --save-dev
```

---

TITLE: Turborepo API: Related Packages Reference
DESCRIPTION: Describes official packages and utilities that extend Turborepo's functionality, such as `create-turbo` for getting started, `eslint-config-turbo`, `turbo-ignore`, and `@turbo/gen` for type definitions.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/reference/index.mdx#_snippet_2>

LANGUAGE: APIDOC
CODE:

```
Packages:
  - create-turbo: Get started with Turborepo using an example.
  - eslint-config-turbo: Find environment variables not listed in `turbo.json`.
  - turbo-ignore: Skip work using `turbo-ignore`.
  - @turbo/gen: Type definitions for Turborepo generators.
```

---

TITLE: Root package.json Configuration for Turborepo
DESCRIPTION: Illustrates a typical root 'package.json' setup for a Turborepo monorepo, including the 'private' flag, common 'scripts' (build, dev, lint), 'devDependencies' for 'turbo', and 'packageManager' specification. Yarn, npm, and Bun examples also include 'workspaces' declaration if not handled by a separate file like 'pnpm-workspace.yaml'.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/crafting-your-repository/structuring-a-repository.mdx#_snippet_2>

LANGUAGE: json
CODE:

```
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "pnpm@9.0.0"
}
```

LANGUAGE: json
CODE:

```
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "yarn@1.22.19",
  "workspaces": ["apps/*", "packages/*"]
}
```

LANGUAGE: json
CODE:

```
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "npm@10.0.0",
  "workspaces": ["apps/*", "packages/*"]
}
```

LANGUAGE: json
CODE:

```
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "bun@1.2.0",
  "workspaces": ["apps/*", "packages/*"]
}
```

---

TITLE: Alias and Run Turborepo Debug Binary
DESCRIPTION: Sets up a shell alias for the debug build of `turbo` and demonstrates running a build command with `--skip-infer` to prevent using a locally installed binary. This is crucial for testing changes to the `turbo` binary itself.

SOURCE: <https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md#_snippet_15>

LANGUAGE: bash
CODE:

```
alias devturbo='~/projects/turbo/target/debug/turbo'
devturbo run build --skip-infer
```

---

TITLE: Configure turbo.json for sequential task dependencies
DESCRIPTION: Defines task dependencies in `turbo.json` to ensure scripts like database setup and seeding run in a specific order before the main development server starts, enabling complex workflows.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/single-package-workspaces.mdx#_snippet_2>

LANGUAGE: json
CODE:

```
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "dev": {
      "dependsOn": ["db:seed"],
      "cache": false,
      "persistent": true
    },
    "db:seed": {
      "dependsOn": ["db:push"],
      "cache": false
    },
    "db:push": {
      "dependsOn": ["db:up"],
      "cache": false
    },
    "db:up": {
      "cache": false
    }
  }
}
```

---

TITLE: Install Turborepo as a repository dev dependency
DESCRIPTION: Add `turbo` as a development dependency to your project's `package.json`. This ensures a consistent version of `turbo` across all developers collaborating on the repository and allows global installations to defer to the local version.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/getting-started/installation.mdx#_snippet_2>

LANGUAGE: bash
CODE:

```
pnpm add turbo --save-dev --ignore-workspace-root-check
```

LANGUAGE: bash
CODE:

```
yarn add turbo --dev --ignore-workspace-root-check
```

LANGUAGE: bash
CODE:

```
npm install turbo --save-dev
```

LANGUAGE: bash
CODE:

```
bun install turbo --dev
```

---

TITLE: Install Project Dependencies with Package Manager
DESCRIPTION: Execute your chosen package manager's install command to update the lockfile and ensure all project dependencies are correctly installed after workspace and `packageManager` field configurations.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/migrating-from-nx.mdx#_snippet_9>

LANGUAGE: bash
CODE:

```
pnpm install
```

LANGUAGE: bash
CODE:

```
yarn install
```

LANGUAGE: bash
CODE:

```
npm install
```

LANGUAGE: bash
CODE:

```
bun install
```

---

TITLE: Start Turborepo Development Server
DESCRIPTION: Commands to initiate the development server for a Turborepo project, supporting `yarn`, `pnpm`, and `bun` package managers. The application typically runs on `http://localhost:3000`.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-prisma/README.md#_snippet_6>

LANGUAGE: bash
CODE:

```
yarn run dev
```

LANGUAGE: bash
CODE:

```
# Using yarn
yarn run dev
```

LANGUAGE: bash
CODE:

```
# Using pnpm
pnpm run dev
```

LANGUAGE: bash
CODE:

```
# Using bun
bun run dev
```

---

TITLE: Run Turborepo Development Server
DESCRIPTION: Starts the local development server for the application. This command enables live reloading and provides an environment for testing and iterating on features during development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/non-monorepo/README.md#_snippet_4>

LANGUAGE: Shell
CODE:

```
pnpm turbo dev
```

---

TITLE: Start Development Servers for Turborepo
DESCRIPTION: Change directory to the Turborepo's root. Running `npm run dev` will concurrently start development servers for all configured applications and packages, enabling live development across the monorepo.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-npm/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd my-turborepo
npm run dev
```

---

TITLE: Build All Applications and Packages in Turborepo
DESCRIPTION: Navigate into the root directory of the newly created Turborepo (`with-solid`) and execute the `pnpm run build` command. This triggers the build process for all applications and packages within the monorepo, preparing them for deployment.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-solid/README.md#_snippet_1>

LANGUAGE: sh
CODE:

```
cd with-solid
pnpm run build
```

---

TITLE: Install Project Dependencies for Remix
DESCRIPTION: Installs all necessary local dependencies for the Remix project. This command should be run after cloning the repository to ensure all required packages are available for development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/kitchen-sink/apps/blog/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
npm install
```

---

TITLE: Start local MySQL database with Docker Compose
DESCRIPTION: Use Docker Compose to start a local MySQL server in detached mode, providing the database for the Turborepo project.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-prisma/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
docker-compose up -d
```

---

TITLE: Initialize Turborepo Design System Starter Project
DESCRIPTION: This command uses `create-turbo` to scaffold a new monorepo project based on the `design-system` example. It sets up the initial project structure with all pre-configured tools and packages.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/design-system/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e design-system
```

---

TITLE: Run Development Server for All Apps and Packages
DESCRIPTION: Starts the development server for all applications and packages that have a 'dev' script configured in the Turborepo. This allows for concurrent development across the monorepo.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-nestjs/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
pnpm run dev
```

---

TITLE: Create Remix Project with Vercel Template
DESCRIPTION: Initializes a new Remix project using the Vercel example template via the `create-remix` CLI tool. This command sets up the basic project structure ready for deployment on Vercel.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/kitchen-sink/apps/blog/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-remix@latest --template vercel/vercel/examples/remix
```

---

TITLE: Start Svelte Development Server
DESCRIPTION: These commands start the development server for a Svelte application. The `--open` flag automatically opens the application in a new browser tab.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-svelte/apps/web/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm run dev
```

LANGUAGE: bash
CODE:

```
# or start the server and open the app in a new browser tab
npm run dev -- --open
```

---

TITLE: Initialize Turborepo project with create-turbo
DESCRIPTION: This command uses `npx` to execute the `create-turbo` package, which interactively sets up a new Turborepo monorepo. It's the recommended way to start a new Turborepo project.

SOURCE: <https://github.com/vercel/turborepo/blob/main/packages/create-turbo/README.md#_snippet_0>

LANGUAGE: Shell
CODE:

```
npx create-turbo@latest
```

---

TITLE: Install Turborepo CLI Globally
DESCRIPTION: Provides commands for installing the Turborepo CLI globally using npm, Yarn, or pnpm. A global installation allows the `turbo` command to be executed from any directory, improving accessibility across projects.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-7-0.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
npm install turbo --global
```

LANGUAGE: bash
CODE:

```
yarn global add turbo
```

LANGUAGE: bash
CODE:

```
pnpm add turbo --global
```

---

TITLE: Start Remix Development Server
DESCRIPTION: Starts the local development server for the Remix application. After running this command, the application will typically be accessible in a web browser at `http://localhost:5173` for local testing and development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/kitchen-sink/apps/blog/README.md#_snippet_3>

LANGUAGE: sh
CODE:

```
npm run dev
```

---

TITLE: Install Turborepo CLI
DESCRIPTION: Instructions to install the Turborepo command-line interface as a development dependency using npm, Yarn, or pnpm.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-1-6-0.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
npm install turbo --save-dev
```

LANGUAGE: bash
CODE:

```
yarn add turbo --dev
```

LANGUAGE: bash
CODE:

```
pnpm add turbo --save-dev
```

---

TITLE: Start Development Servers for Turborepo Applications
DESCRIPTION: From the root of your Turborepo, run this command to concurrently start the development servers for all configured applications and packages. This enables live reloading and facilitates local development workflows.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-gatsby/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd my-turborepo
pnpm dev
```

---

TITLE: Start Development Servers for Turborepo Monorepo
DESCRIPTION: Command to navigate into the Turborepo directory and then start the development servers for all applications and packages, enabling concurrent development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-rollup/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
cd my-turborepo
pnpm run dev
```

---

TITLE: Travis CI Configuration for Turborepo with Various Package Managers
DESCRIPTION: Provides `.travis.yml` examples for integrating Turborepo with Travis CI, showcasing configurations for pnpm, Yarn, npm, and Bun, including package manager setup, caching, and script execution.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/ci-vendors/travis-ci.mdx#_snippet_1>

LANGUAGE: yaml
CODE:

```
language: node_js
node_js:
  - lts/*
cache:
  npm: false
  directories:
    - "~/.pnpm-store"
before_install:
  - curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm@6.32.2
  - pnpm config set store-dir ~/.pnpm-store
install:
  - pnpm install
script:
  - pnpm build
script:
  - pnpm test
```

LANGUAGE: yaml
CODE:

```
language: node_js
node_js:
  - lts/*
install:
  - yarn
script:
  - yarn build
script:
  - yarn test
```

LANGUAGE: yaml
CODE:

```
language: node_js
node_js:
  - lts/*
install:
  - npm install
script:
  - npm run build
script:
  - npm run test
```

LANGUAGE: yaml
CODE:

```
language: node_js
node_js:
  - lts/*
cache:
  npm: false
  directories:
    - "~/.pnpm-store"
before_install:
  - curl -fsSL https://bun.sh/install | bash
install:
  - bun install
script:
  - bun run build
script:
  - bun run test
```

---

TITLE: Initialize a new Turborepo project with `create-turbo`
DESCRIPTION: This command initializes a new Turborepo project using the latest `create-turbo` CLI tool. It sets up the basic monorepo structure, including example apps and packages, ready for development.

SOURCE: <https://github.com/vercel/turborepo/blob/main/turborepo-tests/integration/fixtures/turbo_trace/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest
```

---

TITLE: Test create-turbo basic example updates
DESCRIPTION: This command is used by contributors to test the end-to-end workflow for updates to the `basic` example used by `create-turbo`. It requires pushing code updates to a GitHub branch first.

SOURCE: <https://github.com/vercel/turborepo/blob/main/packages/create-turbo/README.md#_snippet_1>

LANGUAGE: Shell
CODE:

```
./dist/cli.js -e [GITHUB_BRANCH]/examples/basic
```

---

TITLE: Initialize Turborepo starter template
DESCRIPTION: Use `npx create-turbo` to quickly set up a new Turborepo project based on the 'with-shell-commands' example. This command is ideal for creating a minimal reproduction environment or exploring basic Turborepo task graph features.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-shell-commands/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-shell-commands
```

---

TITLE: Initialize Turborepo with React Native Web Example
DESCRIPTION: This command initializes a new Turborepo project using the `with-react-native-web` example template. It sets up a monorepo structure, including configurations for React Native applications and Next.js web applications, enabling code sharing between platforms.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-react-native-web/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest -e with-react-native-web
```

---

TITLE: Basic Dockerfile for Next.js Frontend
DESCRIPTION: This simple Dockerfile snippet demonstrates a basic setup for starting a Next.js frontend application within a Docker container. It exposes port 3000 and runs the application using yarn. The surrounding text highlights its inefficiencies regarding monorepo dependencies and lockfile handling.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/blog/turbo-0-4-0.mdx#_snippet_1>

LANGUAGE: dockerfile
CODE:

```
# Start the Frontend Next.js application
EXPOSE 3000
RUN ['yarn', '--cwd', 'packages/frontend', 'start']
```

---

TITLE: Start Svelte Development Server
DESCRIPTION: Commands to start the development server for a Svelte project. It includes an option to automatically open the application in a new browser tab.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-svelte/apps/docs/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

---

TITLE: Install Turborepo CLI Globally
DESCRIPTION: Optionally install the Turborepo CLI globally to make the `turbo` command accessible from any directory on your system, providing convenience for general Turborepo operations.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/migrating-from-nx.mdx#_snippet_11>

LANGUAGE: bash
CODE:

```
pnpm add turbo --global
```

LANGUAGE: bash
CODE:

```
yarn global add turbo
```

LANGUAGE: bash
CODE:

```
npm install turbo --global
```

LANGUAGE: bash
CODE:

```
bun install turbo --global
```

---

TITLE: Initialize a new Turborepo monorepo
DESCRIPTION: Start a new Turborepo project from scratch using the `create-turbo` command with various package managers.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/tools/tailwind.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
pnpm dlx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
yarn dlx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
npx create-turbo@latest
```

LANGUAGE: bash
CODE:

```
bunx create-turbo@latest
```

---

TITLE: Initialize New Turborepo Project with Solid.js Starter
DESCRIPTION: This command uses `create-turbo` to scaffold a new monorepo project, pre-configured with the Solid.js starter template, setting up the basic structure for a Solid-Turborepo application.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-solid/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npx create-turbo@latest
```

---

TITLE: Node.js API for @turbo/workspaces - Convert Project
DESCRIPTION: This example demonstrates how to use the `@turbo/workspaces` Node.js API to programmatically detect the current package manager and conditionally convert a project to pnpm if it's not already using it. It showcases the `getWorkspaceDetails` and `convert` functions, including options for dry run and installation.

SOURCE: <https://github.com/vercel/turborepo/blob/main/packages/turbo-workspaces/README.md#_snippet_1>

LANGUAGE: js
CODE:

```
import { convert, getWorkspaceDetails } from "@turbo/workspaces";

// detect the package manager
const project = getWorkspaceDetails({
  root: process.cwd(),
});

// if the package manager is not pnpm, convert to pnpm
if (project.packageManager !== "pnpm") {
  await convert({
    root: process.cwd(),
    to: "pnpm",
    options: {
      dry: false,
      install: true,
    },
  });
}
```

---

TITLE: Reference internal package in package.json dependencies
DESCRIPTION: Demonstrates how to reference an internal package, such as `@repo/ui`, in the `dependencies` section of a `package.json` file. Examples are provided for pnpm, Yarn, npm, and Bun, showcasing their respective workspace installation syntaxes.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/core-concepts/internal-packages.mdx#_snippet_0>

LANGUAGE: json
CODE:

```
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

LANGUAGE: json
CODE:

```
{
  "dependencies": {
    "@repo/ui": "*"
  }
}
```

LANGUAGE: json
CODE:

```
{
  "dependencies": {
    "@repo/ui": "*"
  }
}
```

LANGUAGE: json
CODE:

```
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

---

TITLE: Next.js API Route Structure
DESCRIPTION: This section describes the convention for creating API endpoints in Next.js applications using file-based routing. API routes are defined by creating an `api/` directory within the `app/` directory, with `route.ts` files defining the endpoint logic.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-tailwind/apps/web/README.md#_snippet_1>

LANGUAGE: APIDOC
CODE:

```
API Route Structure:
  Base Directory: `app/api/`
  Endpoint Definition:
    - `route.ts` file within an API directory.
    - Example: `app/api/hello/route.ts` maps to `/api/hello`.
```

---

TITLE: Define package.json scripts for sequential tasks
DESCRIPTION: Example `package.json` demonstrating various scripts, including development, build, linting, and database operations, which will be orchestrated by Turborepo to run sequentially.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/guides/single-package-workspaces.mdx#_snippet_1>

LANGUAGE: json
CODE:

```
{
  "name": "@acme/my-app",
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "check-types": "tsc --noEmit",
    "db:up": "docker-compose up -d",
    "db:push": "your-orm-tool schema-push",
    "db:seed": "node ./db-seed.js"
  }
}
```

---

TITLE: Turborepo File Glob Pattern Usage Examples
DESCRIPTION: Illustrates common usage examples of file glob patterns in Turborepo, demonstrating how different patterns match files and directories. These examples provide practical guidance for configuring file sets.

SOURCE: <https://github.com/vercel/turborepo/blob/main/docs/site/content/docs/reference/globs.mdx#_snippet_1>

LANGUAGE: APIDOC
CODE:

```
Glob Pattern Examples:
  dist/**: Match all files in the dist directory, its contents, and all sub-directories
  dist/: Match the dist directory and its contents
  dist: Match a file named dist or a dist directory, its contents, and all sub-directories
  dist/some-dir/**: Match all files in the dist/some-dir directory and all sub-directories in the current directory
  !dist: Ignore the dist directory and all of its contents
  dist*: Match files and directories that start with dist
  dist/*.js: Match all .js files in the dist directory
  !dist/*.js: Ignore all .js files in the dist directory
  dist/**/*.js: Recursively match all .js files in the dist directory and its sub-directories
  ../scripts/**: Up one directory, match all files and sub-directories in the scripts directory
```

---

TITLE: Run tests for a SolidStart project
DESCRIPTION: Command to execute tests for a SolidStart project. The testing setup utilizes `vitest`, `@solidjs/testing-library`, and `@testing-library/jest-dom` for extended matchers.

SOURCE: <https://github.com/vercel/turborepo/blob/main/examples/with-solid/apps/docs/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
npm test
```
