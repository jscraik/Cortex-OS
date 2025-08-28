========================
CODE SNIPPETS
========================
TITLE: Install shadcn-ui Registry Item via CLI
DESCRIPTION: Demonstrates how to install a component from a shadcn-ui registry using the `add` command of the `shadcn` CLI. The command requires the full URL of the registry item to be installed.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_8

LANGUAGE: bash
CODE:

```
npx shadcn@latest add http://localhost:3000/r/hello-world.json
```

---

TITLE: Install shadcn-ui Registry Item via CLI
DESCRIPTION: Demonstrates how to install a component from a shadcn-ui registry using the `add` command of the `shadcn` CLI. The command requires the full URL of the registry item to be installed.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_7

LANGUAGE: bash
CODE:

```
npx shadcn@latest add http://localhost:3000/r/hello-world.json
```

---

TITLE: Install shadcn CLI canary version
DESCRIPTION: Installs the `shadcn` command-line interface, specifically the `canary` version, which includes the `build` command necessary for generating registry JSON files. This step ensures access to the latest development features for registry management.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_3

LANGUAGE: bash
CODE:

```
npm install shadcn@canary
```

---

TITLE: Install shadcn CLI canary version
DESCRIPTION: Installs the canary version of the shadcn CLI using npm. This specific version is required to access the `build` command, which is essential for generating the registry JSON files.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_4

LANGUAGE: bash
CODE:

```
npm install shadcn@canary
```

---

TITLE: Create a basic React component for the registry
DESCRIPTION: Defines a simple React component, `HelloWorld`, using a `Button` from `@/components/ui/button`. This component serves as an example of a UI element that can be added as an item to the `shadcn` component registry.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_1

LANGUAGE: tsx
CODE:

```
import { Button } from "@/components/ui/button"

export function HelloWorld() {
  return <Button>Hello World</Button>
}
```

---

TITLE: Install Resizable Component (CLI)
DESCRIPTION: Installs the Resizable component and its dependencies using the shadcn/ui command-line interface, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/resizable.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add resizable
```

---

TITLE: Serve shadcn registry in development
DESCRIPTION: Starts the development server for your project (e.g., Next.js). Once running, the generated registry JSON files will be served at a local URL, allowing you to test and access your registry components.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_7

LANGUAGE: bash
CODE:

```
npm run dev
```

---

TITLE: Run Initial Project Setup
DESCRIPTION: Runs the `setup` script defined in the project's `package.json`. This script typically handles one-time setup procedures like installing Node.js dependencies, running database migrations, or seeding initial data required for the application to function correctly.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/test/fixtures/frameworks/remix-indie-stack/README.md#_snippet_2

LANGUAGE: sh
CODE:

```
npm run setup
```

---

TITLE: Create a basic React component for shadcn registry
DESCRIPTION: An example React component using a shadcn UI Button. This component demonstrates a simple UI element that can be added to the registry. It's placed in a specific directory structure (`registry/new-york/hello-world/`) for organization.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_1

LANGUAGE: tsx
CODE:

```
import { Button } from "@/components/ui/button"

export function HelloWorld() {
  return <Button>Hello World</Button>
}
```

---

TITLE: Serve registry locally with npm run dev
DESCRIPTION: Starts the local development server, commonly used in frameworks like Next.js, to serve the generated registry JSON files. This allows local testing and access to the registry at a URL like `http://localhost:3000/r/[NAME].json`.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_6

LANGUAGE: bash
CODE:

```
npm run dev
```

---

TITLE: Install Shadcn UI Tooltip Component
DESCRIPTION: This snippet provides two methods for installing the Tooltip component: using the shadcn/ui CLI for quick setup or manually installing the `@radix-ui/react-tooltip` dependency via npm.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/tooltip.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add tooltip
```

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-tooltip
```

---

TITLE: Install shadcn/ui Drawer Component via CLI
DESCRIPTION: Installs the shadcn/ui Drawer component and its dependencies using the `npx shadcn@latest add` command, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/drawer.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add drawer
```

---

TITLE: Install project dependencies with pnpm
DESCRIPTION: Installs all necessary project dependencies using pnpm, which is required before starting the development server or building the project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/blocks.mdx#_snippet_2

LANGUAGE: bash
CODE:

```
pnpm install
```

---

TITLE: Install Shadcn UI Drawer via CLI
DESCRIPTION: Installs the Shadcn UI Drawer component directly into your project using the Shadcn CLI tool, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/drawer.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add drawer
```

---

TITLE: Run shadcn registry build script
DESCRIPTION: Executes the `registry:build` script defined in `package.json`. This command initiates the build process, generating the registry JSON files, typically in the `public/r` directory by default.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_6

LANGUAGE: bash
CODE:

```
npm run registry:build
```

---

TITLE: Initialize registry.json file
DESCRIPTION: Creates the base `registry.json` file in the project root, conforming to the `shadcn` registry schema. This file is essential for the `shadcn` CLI to build the registry, defining the registry's name, homepage, and an array for component items.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_0

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    // ...
  ]
}
```

---

TITLE: Install Context Menu Dependencies Manually
DESCRIPTION: Installs the required `@radix-ui/react-context-menu` dependency for manual setup of the Context Menu component.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/context-menu.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-context-menu
```

---

TITLE: Install Block and Override Primitives
DESCRIPTION: This configuration demonstrates how to install a shadcn/ui block, such as `login-01`, and simultaneously override its default primitive components. It specifies remote URLs for custom `button`, `input`, and `label` components, ensuring that the installed block uses your custom implementations instead of the registry's defaults.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/examples.mdx#_snippet_5

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-login",
  "type": "registry:block",
  "registryDependencies": [
    "login-01",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json"
  ]
}
```

---

TITLE: Add component definition to registry.json
DESCRIPTION: Updates the `registry.json` file to include the `HelloWorld` component as a registry item. It specifies the component's name, type, title, description, and the relative path to its source file, enabling the `shadcn` CLI to process it.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_2

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

---

TITLE: Run shadcn registry build script
DESCRIPTION: Executes the `registry:build` script defined in `package.json` using `npm run`. This command triggers the `shadcn` CLI to generate the registry JSON files, typically outputting them to `public/r` by default.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_5

LANGUAGE: bash
CODE:

```
npm run registry:build
```

---

TITLE: Add registry build script to package.json
DESCRIPTION: Adds a `registry:build` script to the `scripts` section of `package.json`. This script executes the `shadcn build` command, automating the process of generating registry JSON files from the configured `registry.json`.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/getting-started.mdx#_snippet_4

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "registry:build": "shadcn build"
  }
}
```

---

TITLE: Install Input OTP dependency manually
DESCRIPTION: Install the core `input-otp` package using npm for manual setup, which is required if not using the Shadcn UI CLI.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/input-otp.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install input-otp
```

---

TITLE: Install Shadcn UI Accordion Component
DESCRIPTION: Provides commands for installing the Shadcn UI Accordion component. Users can choose between a quick CLI command for automatic setup or manual installation by adding the core Radix UI dependency.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/accordion.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add accordion
```

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-accordion
```

---

TITLE: Install Dialog component via CLI
DESCRIPTION: Installs the Shadcn UI Dialog component using the `npx shadcn@latest add` command-line interface, simplifying the setup process for your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/dialog.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add dialog
```

---

TITLE: Add registry build script to package.json
DESCRIPTION: Adds a `registry:build` script to the `scripts` section of your `package.json` file. This script executes the `shadcn build` command, automating the process of generating the registry's JSON output.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_5

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "registry:build": "shadcn build"
  }
}
```

---

TITLE: Add a component definition to registry.json
DESCRIPTION: This updated `registry.json` demonstrates how to define a component item within the registry. It includes the component's name, type, title, description, and the relative path to its source file, linking it to the registry for discovery and usage.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_3

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

---

TITLE: Install Shadcn UI Toggle Group Component
DESCRIPTION: Provides instructions for installing the Shadcn UI Toggle Group component. This includes both the CLI method for quick setup and the manual method which involves installing the core Radix UI dependency.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/toggle-group.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add toggle-group
```

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-toggle-group
```

---

TITLE: Install Dropdown Menu via Shadcn CLI
DESCRIPTION: Installs the Shadcn UI Dropdown Menu component using the command-line interface, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/dropdown-menu.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add dropdown-menu
```

---

TITLE: Initialize Remix Project and Git Repository
DESCRIPTION: Executes the `remix init` script to perform initial setup tasks specific to the Remix project, such as generating necessary files or configuring environment variables. It then initializes a new Git repository, stages all current files, and creates an initial commit to track the project's starting state.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/test/fixtures/frameworks/remix-indie-stack/README.md#_snippet_1

LANGUAGE: sh
CODE:

```
npx remix init
git init # if you haven't already
git add .
git commit -m "Initialize project"
```

---

TITLE: Install Tailwind CSS dependencies
DESCRIPTION: Installs `tailwindcss`, `@tailwindcss/postcss`, and `postcss` using npm. These packages are essential dependencies for integrating Tailwind CSS into a TanStack Start project, enabling PostCSS processing.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/tanstack.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npm install tailwindcss @tailwindcss/postcss postcss
```

---

TITLE: Install Recharts dependency for manual chart setup
DESCRIPTION: Command to manually install the core Recharts library, which is a prerequisite for using shadcn/ui charts when not utilizing the shadcn/ui CLI for installation.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/chart.mdx#_snippet_2

LANGUAGE: bash
CODE:

```
npm install recharts
```

---

TITLE: Install shadcn/ui Form Component
DESCRIPTION: Provides commands for installing the shadcn/ui form component, either through the CLI for quick setup or by manually installing the required npm dependencies.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/form.mdx#_snippet_2

LANGUAGE: bash
CODE:

```
npx shadcn@latest add form
```

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-label @radix-ui/react-slot react-hook-form @hookform/resolvers zod
```

---

TITLE: Install Shadcn UI Carousel via CLI
DESCRIPTION: Installs the Shadcn UI Carousel component using the Shadcn CLI, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/carousel.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add carousel
```

---

TITLE: Install Navigation Menu Manual Dependencies
DESCRIPTION: Installs the core `@radix-ui/react-navigation-menu` dependency required for manual setup of the Navigation Menu component. This step is necessary if you prefer not to use the shadcn/ui CLI.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/navigation-menu.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-navigation-menu
```

---

TITLE: Install Manual Dependencies for Calendar Component
DESCRIPTION: Lists the npm command to install the required external libraries, `react-day-picker` and `date-fns`, for manual setup of the Calendar component.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/calendar.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install react-day-picker date-fns
```

---

TITLE: Install shadcn/ui Avatar via CLI
DESCRIPTION: Installs the Avatar component and its dependencies into your project using the shadcn/ui command-line interface. This is the recommended method for quick setup.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/avatar.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add avatar
```

---

TITLE: Install Shadcn/ui Command Component via CLI
DESCRIPTION: Installs the shadcn/ui Command component into your project using the `npx shadcn@latest add` command. This automates the setup process, including adding necessary files and dependencies for the command menu.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/command.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add command
```

---

TITLE: Define a Universal Registry Item for a Multi-File Starter Template
DESCRIPTION: This JSON configuration defines a universal shadcn/ui registry item named 'my-custom-start-template'. This example demonstrates how a single universal item can install multiple files ('file-01.json' and 'file-02.vue') to different target paths. It also includes a 'dependencies' field, indicating that this item relies on 'better-auth' for proper functionality.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/examples.mdx#_snippet_18

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-custom-start-template",
  "type": "registry:item",
  "dependencies": ["better-auth"],
  "files": [
    {
      "path": "/path/to/file-01.json",
      "type": "registry:file",
      "target": "~/file-01.json",
      "content": "..."
    },
    {
      "path": "/path/to/file-02.vue",
      "type": "registry:file",
      "target": "~/pages/file-02.vue",
      "content": "..."
    }
  ]
}
```

---

TITLE: Configure initial registry.json for shadcn CLI
DESCRIPTION: This JSON configuration file defines the schema, name, homepage, and an empty items array for a shadcn UI component registry. It's required when using the shadcn CLI to build the registry and serves as the central manifest for your components.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/getting-started.mdx#_snippet_0

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    // ...
  ]
}
```

---

TITLE: Manually install Popover dependencies
DESCRIPTION: Installs the core `@radix-ui/react-popover` dependency required for the Popover component when performing a manual setup.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/popover.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-popover
```

---

TITLE: Install shadcn/ui Block with Primitive Overrides
DESCRIPTION: This JSON configuration demonstrates how to install a `login-01` block from the shadcn/ui registry while simultaneously overriding default `button`, `input`, and `label` primitives with custom ones from specified remote URLs. This allows for consistent styling across components.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/examples.mdx#_snippet_5

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-login",
  "type": "registry:block",
  "registryDependencies": [
    "login-01",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json"
  ]
}
```

---

TITLE: Install Input OTP Component
DESCRIPTION: Provides instructions for installing the Input OTP component using either the Shadcn UI CLI or manually via npm, including dependency installation.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/input-otp.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add input-otp
```

LANGUAGE: bash
CODE:

```
npm install input-otp
```

---

TITLE: Install Shadcn UI Avatar via CLI
DESCRIPTION: Installs the Shadcn UI Avatar component using the command-line interface tool, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/avatar.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add avatar
```

---

TITLE: Install manual dependencies for Calendar component
DESCRIPTION: Installs the necessary npm packages, `react-day-picker` and `date-fns`, required for the manual setup of the shadcn/ui Calendar component.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/calendar.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install react-day-picker date-fns
```

---

TITLE: Install Resizable Component via shadcn/ui CLI
DESCRIPTION: This command uses the shadcn/ui CLI to automatically add the Resizable component and its dependencies to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/resizable.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add resizable
```

---

TITLE: Install Shadcn UI Alert Dialog via CLI
DESCRIPTION: This command installs the Shadcn UI Alert Dialog component directly into your project using the `npx shadcn` command-line interface. It automates the setup process, including adding necessary files and configurations.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/alert-dialog.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add alert-dialog
```

---

TITLE: Install Core cmdk Dependency Manually
DESCRIPTION: Manually installs the `cmdk` package, the underlying dependency for the Command component, using npm. This step is required for projects opting for manual setup rather than the CLI installation process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/command.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install cmdk
```

---

TITLE: Initialize shadcn Project Configuration and Dependencies
DESCRIPTION: Use the `init` command to set up a new shadcn project. This command installs necessary dependencies, adds the `cn` utility, and configures CSS variables, preparing your project for component integration.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/cli.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest init
```

---

TITLE: Install Navigation Menu Manual Dependencies
DESCRIPTION: Installs the core Radix UI Navigation Menu dependency required for manual setup. This step is part of the manual installation process, ensuring the foundational package is available before copying the component code.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/navigation-menu.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-navigation-menu
```

---

TITLE: Install Menubar component using Shadcn CLI
DESCRIPTION: This command installs the Menubar component into your project using the Shadcn UI command-line interface. It automates the setup process, including adding necessary files and dependencies.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/menubar.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add menubar
```

---

TITLE: Install Shadcn UI Button Component via CLI
DESCRIPTION: Installs the Shadcn UI Button component using the command-line interface. This command automates the process of adding the necessary files and configurations to your project, simplifying setup.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/button.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add button
```

---

TITLE: Initialize shadcn UI Project
DESCRIPTION: Use the `init` command to set up a new project with shadcn UI. This command handles essential configurations such as installing necessary dependencies, adding the `cn` utility, configuring `tailwind.config.js`, and setting up CSS variables for the project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn init
```

---

TITLE: Install Shadcn UI Radio Group Component
DESCRIPTION: Provides two methods for installing the Radio Group component: using the Shadcn UI CLI for quick setup or manually by installing the underlying Radix UI dependency via npm.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/radio-group.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add radio-group
```

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-radio-group
```

---

TITLE: Install Shadcn UI Dialog via CLI
DESCRIPTION: Instructions to add the Dialog component to a project using the Shadcn UI command-line interface, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/dialog.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add dialog
```

---

TITLE: Install Collapsible component using Shadcn CLI
DESCRIPTION: This command installs the Collapsible component into your project using the Shadcn UI command-line interface, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/collapsible.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add collapsible
```

---

TITLE: Install Shadcn UI Select Component via CLI
DESCRIPTION: This command uses the Shadcn UI CLI to automatically add the Select component and its dependencies to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/select.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add select
```

---

TITLE: Install Shadcn UI Toggle Component via CLI
DESCRIPTION: Installs the Toggle component using the Shadcn UI command-line interface. This command automatically adds the component's code to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/toggle.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add toggle
```

---

TITLE: Install Shadcn UI Switch Component via CLI
DESCRIPTION: This command uses the shadcn/ui CLI to automatically add the Switch component and its dependencies to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/switch.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add switch
```

---

TITLE: Initialize shadcn/ui in Project
DESCRIPTION: Executes the `shadcn` CLI's `init` command to set up shadcn/ui within an existing project, preparing it for component installation.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/remix.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npx shadcn@latest init
```

---

TITLE: Minimal AppSidebar Component Setup
DESCRIPTION: Illustrates the most basic implementation of the `AppSidebar` component, using only the `Sidebar` and `SidebarContent` components. This serves as a starting point for building a simple sidebar.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/sidebar.mdx#_snippet_5

LANGUAGE: tsx
CODE:

```
import { Sidebar, SidebarContent } from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent />
    </Sidebar>
  )
}
```

---

TITLE: Initialize shadcn/ui project
DESCRIPTION: Runs the `shadcn` CLI `init` command to set up the project for `shadcn/ui`. This command automatically creates a `components.json` file in the project root and configures necessary CSS variables within `app/styles/app.css`.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/tanstack.mdx#_snippet_5

LANGUAGE: bash
CODE:

```
npx shadcn@canary init
```

---

TITLE: Install Navigation Menu via CLI
DESCRIPTION: Installs the Navigation Menu component using the shadcn/ui CLI tool. This is the recommended and easiest method for adding the component to your project, automating the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/navigation-menu.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add navigation-menu
```

---

TITLE: Install Sonner Dependencies Manually
DESCRIPTION: Install the core `sonner` package and `next-themes` (often used for theming with shadcn/ui) using npm for a manual setup. This step is necessary if you prefer not to use the shadcn/ui CLI.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/sonner.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install sonner next-themes
```

---

TITLE: Install Shadcn UI Pagination Component (CLI)
DESCRIPTION: Provides the command-line instruction to quickly add the Pagination component to a project using the Shadcn UI CLI. This method automates the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/pagination.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add pagination
```

---

TITLE: Install Aspect Ratio component using shadcn CLI
DESCRIPTION: This command installs the Aspect Ratio component into your project using the shadcn/ui command-line interface. It automates the setup process by adding the component's files and dependencies.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/aspect-ratio.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add aspect-ratio
```

---

TITLE: Install Aspect Ratio component via CLI
DESCRIPTION: Installs the Shadcn UI Aspect Ratio component using the `shadcn` CLI tool. This command automatically adds the component's files to your project, streamlining the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/aspect-ratio.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add aspect-ratio
```

---

TITLE: Install Shadcn UI Alert component via CLI
DESCRIPTION: This command uses the `npx shadcn@latest add` utility to automatically install the Alert component and its dependencies into your project. It simplifies the setup process by handling component file creation and dependency management.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/alert.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add alert
```

---

TITLE: Initialize shadcn/ui Project
DESCRIPTION: This command initializes the shadcn/ui configuration in a new or existing project. It sets up the necessary files and dependencies for using shadcn/ui components.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/(root)/styleguide.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npx shadcn@latest init
```

---

TITLE: Install Tailwind CSS dependencies
DESCRIPTION: Installs `tailwindcss`, `@tailwindcss/postcss`, and `postcss` using npm. These are essential dependencies for integrating Tailwind CSS into a project, enabling its processing capabilities.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/tanstack.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npm install tailwindcss @tailwindcss/postcss postcss
```

---

TITLE: Complete registry.json Schema Example
DESCRIPTION: This code snippet provides a comprehensive example of a `registry.json` file, demonstrating the full structure including the schema reference, registry metadata like name and homepage, and an example `items` array containing a component definition. It serves as a blueprint for setting up a custom component registry.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/registry/registry-json.mdx#_snippet_0

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "shadcn",
  "homepage": "https://ui.shadcn.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

---

TITLE: Install Shadcn UI Switch Component via CLI
DESCRIPTION: Uses the Shadcn UI CLI to add the Switch component. This command automates dependency installation and component setup, simplifying integration into your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/switch.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add switch
```

---

TITLE: Install Shadcn UI Label Component via CLI
DESCRIPTION: Installs the Shadcn UI Label component using the `shadcn` command-line interface tool. This method simplifies the setup process by automatically adding the component's files to your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/label.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add label
```

---

TITLE: Install shadcn/ui chart component via CLI
DESCRIPTION: Command to install the shadcn/ui chart component using the project's command-line interface. This automates the setup process by adding the necessary files and configurations to your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/chart.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npx shadcn@latest add chart
```

---

TITLE: Install Radix UI Dialog dependency manually
DESCRIPTION: Command to install the underlying `@radix-ui/react-dialog` package, which is a prerequisite for manual setup of the Shadcn UI Dialog component. This step ensures all necessary dependencies are available.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/dialog.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-dialog
```

---

TITLE: Install Shadcn UI Dropdown Menu via CLI
DESCRIPTION: Installs the Dropdown Menu component from shadcn/ui using their command-line interface tool. This command automatically adds the component's files to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/dropdown-menu.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add dropdown-menu
```

---

TITLE: Install Shadcn UI Textarea Component via CLI
DESCRIPTION: Installs the Textarea component using the Shadcn UI command-line interface. This command automatically adds the necessary files and dependencies to your project, streamlining the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/textarea.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add textarea
```

---

TITLE: Install Shadcn UI Tooltip component via CLI
DESCRIPTION: This command utilizes the Shadcn UI command-line interface to automatically add the Tooltip component to your project. It handles dependency installation and component file generation, streamlining the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/tooltip.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add tooltip
```

---

TITLE: Install Collapsible component using Shadcn CLI
DESCRIPTION: This command installs the Collapsible UI component into your project using the Shadcn UI command-line interface. It automates the setup process by adding the necessary files and configurations.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/collapsible.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add collapsible
```

---

TITLE: Install Shadcn UI Progress Component via CLI
DESCRIPTION: Installs the Shadcn UI Progress component and its dependencies using the `shadcn` command-line interface tool. This is the recommended and simplest installation method.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/progress.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add progress
```

---

TITLE: Initialize shadcn project configuration and dependencies
DESCRIPTION: This command installs necessary dependencies, adds the `cn` utility, and configures CSS variables for a new project, setting up the foundational structure.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/(root)/cli.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest init
```

---

TITLE: Complete registry.json Schema Example
DESCRIPTION: This code snippet provides a comprehensive example of a `registry.json` file, demonstrating the full structure including the schema reference, registry metadata like name and homepage, and an example `items` array containing a component definition. It serves as a blueprint for setting up a custom component registry.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/registry-json.mdx#_snippet_0

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "shadcn",
  "homepage": "https://ui.shadcn.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

---

TITLE: Initialize shadcn/ui Monorepo Project with CLI
DESCRIPTION: This snippet shows the command to start a new monorepo project using the `shadcn/ui` CLI. It includes the interactive prompt output where `Next.js (Monorepo)` is selected, setting up a project with `web` and `ui` workspaces and Turborepo.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/monorepo.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@canary init
? Would you like to start a new project?
    Next.js
❯   Next.js (Monorepo)
```

---

TITLE: Install Sonner Component via CLI
DESCRIPTION: This command uses the shadcn/ui CLI to automatically add the Sonner toast component and its dependencies to your project. It simplifies the setup process by handling package installation and configuration.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/sonner.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add sonner
```

---

TITLE: Install Toggle Component via CLI
DESCRIPTION: Installs the Shadcn UI Toggle component using the `npx shadcn@latest add` command. This is the recommended and easiest way to add the component to your project, handling dependencies and file setup automatically.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/toggle.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add toggle
```

---

TITLE: Start shadcn/ui development server
DESCRIPTION: Starts the local development server for the shadcn/ui project, allowing developers to view and test their changes in real-time.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/blocks.mdx#_snippet_3

LANGUAGE: bash
CODE:

```
pnpm www:dev
```

---

TITLE: Initialize shadcn/ui project
DESCRIPTION: Runs the `shadcn/ui` initialization command (`npx shadcn@canary init`). This command sets up the `components.json` configuration file in the project root and automatically injects necessary CSS variables into `app/styles/app.css` for theming.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/tanstack.mdx#_snippet_5

LANGUAGE: bash
CODE:

```
npx shadcn@canary init
```

---

TITLE: Install Menubar component using Shadcn CLI
DESCRIPTION: This command utilizes the Shadcn UI CLI to automatically add the Menubar component and its required dependencies to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/menubar.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add menubar
```

---

TITLE: shadcn init command options
DESCRIPTION: Detailed options for initializing a shadcn project, covering aspects like template selection, base color, confirmation prompts, working directory, and CSS variable configuration for theming.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/(root)/cli.mdx#_snippet_4

LANGUAGE: APIDOC
CODE:

```
Usage: shadcn init [options] [components...]

initialize your project and install dependencies

Arguments:
  components         name, url or local path to component

Options:
  -t, --template <template>      the template to use. (next, next-monorepo)
  -b, --base-color <base-color>  the base color to use. (neutral, gray, zinc, stone, slate)
  -y, --yes                      skip confirmation prompt. (default: true)
  -f, --force                    force overwrite of existing configuration. (default: false)
  -c, --cwd <cwd>                the working directory. defaults to the current directory.
  -s, --silent                   mute output. (default: false)
  --src-dir                      use the src directory when creating a new project. (default: false)
  --no-src-dir                   do not use the src directory when creating a new project.
  --css-variables                use css variables for theming. (default: true)
  --no-css-variables             do not use css variables for theming.
  -h, --help                     display help for command
```

---

TITLE: Install Radio Group component via CLI
DESCRIPTION: Installs the Radio Group component using the shadcn/ui CLI tool. This command adds the necessary files to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/radio-group.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add radio-group
```

---

TITLE: Install Node.js Package
DESCRIPTION: This command installs a specified Node.js package globally or locally within a project. It's a fundamental operation for managing project dependencies.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/(root)/styleguide.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npm install foo
```

---

TITLE: Add shadcn/ui component
DESCRIPTION: Uses the `shadcn` CLI `add` command to install a specific component, such as the `Button` component, into the project. This command fetches the component's code and integrates it into the configured components directory.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/tanstack.mdx#_snippet_6

LANGUAGE: bash
CODE:

```
npx shadcn@canary add button
```

---

TITLE: Install Resizable Dependencies (Manual)
DESCRIPTION: Manually installs the core `react-resizable-panels` dependency required for the Resizable component, providing an alternative to CLI installation.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/resizable.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install react-resizable-panels
```

---

TITLE: Install Checkbox Component Manual Dependencies
DESCRIPTION: Installs the core `@radix-ui/react-checkbox` dependency required for the manual setup of the Checkbox component. This step ensures the necessary React component library is available in your project's node_modules.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/checkbox.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-checkbox
```

---

TITLE: Install Context Menu via CLI
DESCRIPTION: Installs the Shadcn UI Context Menu component using the command-line interface.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/context-menu.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add context-menu
```

---

TITLE: Install Shadcn UI Input Component via CLI
DESCRIPTION: This command adds the Input component to your project using the Shadcn UI CLI. It automates the setup process, including dependencies and component files, making integration straightforward.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/input.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add input
```

---

TITLE: Install Shadcn UI Alert Dialog via CLI
DESCRIPTION: This command-line interface instruction adds the Alert Dialog component to your Shadcn UI project, automating the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/alert-dialog.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add alert-dialog
```

---

TITLE: Install Shadcn UI Input Component via CLI
DESCRIPTION: This command uses the Shadcn UI CLI to automatically add the Input component to your project. It handles the creation of necessary files and dependencies, streamlining the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/input.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add input
```

---

TITLE: Install Slider Component using Shadcn CLI
DESCRIPTION: This command installs the Slider component into your project using the Shadcn UI command-line interface, simplifying the setup process by automatically adding necessary files and configurations.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/slider.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add slider
```

---

TITLE: Install Shadcn UI Alert component via CLI
DESCRIPTION: This command uses the Shadcn UI CLI to automatically add the Alert component and its dependencies to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/alert.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add alert
```

---

TITLE: Start Development Server
DESCRIPTION: Starts the local development server for the shadcn/ui website, allowing contributors to preview their changes and new blocks.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/(root)/blocks.mdx#_snippet_3

LANGUAGE: bash
CODE:

```
pnpm www:dev
```

---

TITLE: Install Shadcn UI Badge Component via CLI
DESCRIPTION: Installs the Badge component into your project using the shadcn/ui CLI tool. This command automatically adds the necessary files and dependencies, streamlining the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/badge.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add badge
```

---

TITLE: Initialize a new shadcn/ui monorepo project
DESCRIPTION: Run this command to start a new shadcn/ui project. The CLI will prompt you to select the project type, where you should choose 'Next.js (Monorepo)' to set up a monorepo with 'web' and 'ui' workspaces and Turborepo.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/(root)/monorepo.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@canary init
```

LANGUAGE: bash
CODE:

```
? Would you like to start a new project?
    Next.js
❯   Next.js (Monorepo)
```

---

TITLE: Create Gatsby project
DESCRIPTION: Initializes a new Gatsby project using the `create-gatsby` CLI tool. This command starts an interactive process to set up the basic project structure.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/gatsby.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npm init gatsby
```

---

TITLE: Install Context Menu component using Shadcn CLI
DESCRIPTION: This command utilizes the Shadcn UI command-line interface to automatically add the Context Menu component and its required dependencies to your project, simplifying the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/context-menu.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add context-menu
```

---

TITLE: Install `react-resizable-panels` Dependency Manually
DESCRIPTION: This command installs the core `react-resizable-panels` library, which is a prerequisite for manually setting up the Resizable component in your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/resizable.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install react-resizable-panels
```

---

TITLE: Install Shadcn UI Select component via CLI
DESCRIPTION: Installs the Shadcn UI Select component using the `npx shadcn@latest add` command, which automatically adds the component to your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/select.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add select
```

---

TITLE: Install Shadcn UI Skeleton Component via CLI
DESCRIPTION: This command adds the Skeleton component to your project using the Shadcn UI CLI, automating the setup process and integrating it into your component library.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/skeleton.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add skeleton
```

---

TITLE: Install Shadcn UI Toggle Group via CLI
DESCRIPTION: This command installs the Toggle Group component into your project using the Shadcn UI command-line interface. It automates the setup process, including adding necessary dependencies and component files.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/toggle-group.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add toggle-group
```

---

TITLE: Configure shadcn/ui components.json
DESCRIPTION: Illustrates the interactive prompts presented by the `shadcn` CLI during initialization, guiding the user through selecting styling preferences like base color and CSS variable usage for `components.json`.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/remix.mdx#_snippet_2

LANGUAGE: txt
CODE:

```
Which style would you like to use? › New York
Which color would you like to use as base color? › Zinc
Do you want to use CSS variables for colors? › no / yes
```

---

TITLE: Use shadcn/ui Button component in React
DESCRIPTION: Demonstrates how to import and use the `Button` component from `shadcn/ui` within a TanStack Start React component. This example shows a basic functional component (`Home`) rendering the `Button` after it has been added to the project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/tanstack.mdx#_snippet_7

LANGUAGE: tsx
CODE:

```
import { Button } from "@/components/ui/button"

function Home() {
  const router = useRouter()
  const state = Route.useLoaderData()

  return (
    <div>
      <Button>Click me</Button>
    </div>
  )
}
```

---

TITLE: Install Sonner via shadcn/ui CLI
DESCRIPTION: Run this command in your terminal to automatically add the Sonner component and its dependencies using the shadcn/ui command-line interface. This method simplifies the setup process.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/sonner.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add sonner
```

---

TITLE: Define a complex shadcn/ui registry component
DESCRIPTION: This JSON configuration defines a complex `shadcn/ui` registry item named 'hello-world'. It specifies multiple file types including a page, components, a hook, a utility file, and a configuration file, along with their target paths within a project. This demonstrates how to bundle various assets into a single installable component.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/registry/faq.mdx#_snippet_0

LANGUAGE: json
CODE:

```
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "hello-world",
  "title": "Hello World",
  "type": "registry:block",
  "description": "A complex hello world component",
  "files": [
    {
      "path": "registry/new-york/hello-world/page.tsx",
      "type": "registry:page",
      "target": "app/hello/page.tsx"
    },
    {
      "path": "registry/new-york/hello-world/components/hello-world.tsx",
      "type": "registry:component"
    },
    {
      "path": "registry/new-york/hello-world/components/formatted-message.tsx",
      "type": "registry:component"
    },
    {
      "path": "registry/new-york/hello-world/hooks/use-hello.ts",
      "type": "registry:hook"
    },
    {
      "path": "registry/new-york/hello-world/lib/format-date.ts",
      "type": "registry:utils"
    },
    {
      "path": "registry/new-york/hello-world/hello.config.ts",
      "type": "registry:file",
      "target": "~/hello.config.ts"
    }
  ]
}
```

---

TITLE: Create Gatsby Project
DESCRIPTION: Initializes a new Gatsby project using the `create-gatsby` command, setting up the basic project structure.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/gatsby.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npm init gatsby
```

---

TITLE: Install Shadcn UI Form Component via CLI
DESCRIPTION: Provides the command-line interface command to add the Shadcn UI form component to a project, simplifying the installation process by automating dependency management and file setup.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/form.mdx#_snippet_2

LANGUAGE: bash
CODE:

```
npx shadcn@latest add form
```

---

TITLE: Install Shadcn UI Pagination Component via CLI
DESCRIPTION: This command provides the quickest way to add the Pagination component to your Shadcn UI project using the command-line interface. It automates the setup process by fetching and configuring the necessary files.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/pagination.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add pagination
```

---

TITLE: Install Radix UI Avatar Dependency Manually
DESCRIPTION: Installs the core Radix UI Avatar dependency required for manual setup of the Shadcn UI Avatar component. This step is necessary before copying the component's source code.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/avatar.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-avatar
```

---

TITLE: Initialize shadcn/ui in Next.js project
DESCRIPTION: This command initializes the shadcn/ui setup in a new or existing Next.js project. It prompts the user to choose between a standard Next.js project configuration or a Monorepo setup, preparing the environment for component integration.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/next.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest init
```

---

TITLE: Install Radix UI Select dependencies manually
DESCRIPTION: Installs the `@radix-ui/react-select` package, a prerequisite for manual integration of the Shadcn UI Select component.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/select.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
npm install @radix-ui/react-select
```

---

TITLE: Initialize shadcn/ui CLI in project
DESCRIPTION: Runs the `shadcn` initialization command to set up the project for shadcn/ui components. This command interactively prompts the user for configuration details, such as base color and component directory.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/vite.mdx#_snippet_7

LANGUAGE: bash
CODE:

```
npx shadcn@latest init
```

---

TITLE: Install Shadcn UI Textarea Component via CLI
DESCRIPTION: Installs the Shadcn UI Textarea component using the `npx shadcn` command-line interface. This is the recommended method for quickly adding the component to your project.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/textarea.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add textarea
```

---

TITLE: Install Shadcn UI Sheet component via CLI
DESCRIPTION: This command adds the Sheet component to your project using the Shadcn UI CLI. It automates the setup process, including adding necessary files and configurations.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/components/sheet.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx shadcn@latest add sheet
```

---

TITLE: Install Shadcn-UI Core Dependencies with npm
DESCRIPTION: Installs essential npm packages for shadcn-ui components, including styling utilities like `class-variance-authority`, `clsx`, `tailwind-merge`, the `lucide-react` icon library, and `tw-animate-css` for animations. These dependencies are crucial for the proper functioning and styling of the UI components.

SOURCE: https://github.com/shadcn-ui/ui/blob/main/apps/www/content/docs/installation/manual.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npm install class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```

---

TITLE: Create Remix Indie Stack Project
DESCRIPTION: Initializes a new Remix project using the official Indie Stack template. This command sets up the project structure with pre-configured tools for deployment (Fly, Docker), database (SQLite, Prisma), authentication (cookie-based sessions), styling (Tailwind), and testing (Cypress, Vitest).

SOURCE: https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/test/fixtures/frameworks/remix-indie-stack/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
npx create-remix@latest --template remix-run/indie-stack
```
