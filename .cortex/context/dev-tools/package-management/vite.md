========================
CODE SNIPPETS
========================

TITLE: Vite Getting Started Guide
DESCRIPTION: Introduction for new users to Vite, covering initial setup and basic concepts.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite5.md#_snippet_2>

LANGUAGE: link
CODE:

```
/guide/
```

----------------------------------------

TITLE: Manual Vite Installation
DESCRIPTION: Install Vite as a development dependency using various package managers.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_8>

LANGUAGE: bash
CODE:

```
npm install -D vite
```

LANGUAGE: bash
CODE:

```
yarn add -D vite
```

LANGUAGE: bash
CODE:

```
pnpm add -D vite
```

LANGUAGE: bash
CODE:

```
bun add -D vite
```

LANGUAGE: bash
CODE:

```
deno add -D npm:vite
```

----------------------------------------

TITLE: Run Vite Development Server
DESCRIPTION: Commands to start the Vite development server using different package managers.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_10>

LANGUAGE: bash
CODE:

```
npx vite
```

LANGUAGE: bash
CODE:

```
yarn vite
```

LANGUAGE: bash
CODE:

```
pnpm vite
```

LANGUAGE: bash
CODE:

```
bunx vite
```

LANGUAGE: bash
CODE:

```
deno run -A npm:vite
```

----------------------------------------

TITLE: Scaffold with Degit
DESCRIPTION: Use degit to scaffold a project from a GitHub repository, assuming the default branch is 'main'. Installs dependencies and starts the dev server.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_7>

LANGUAGE: bash
CODE:

```
npx degit user/project#main my-project
cd my-project

npm install
npm run dev
```

----------------------------------------

TITLE: Local Build and Link Vite
DESCRIPTION: Clone the Vite repository, build it locally, and link it globally to use the latest development version. This process requires pnpm for installation and linking.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_13>

LANGUAGE: bash
CODE:

```
git clone https://github.com/vitejs/vite.git
cd vite
pnpm install
cd packages/vite
pnpm run build
pnpm link --global # use your preferred package manager for this step
```

----------------------------------------

TITLE: Scaffolding a Vite Project with npm
DESCRIPTION: Command to create a new Vite project using npm. This command initiates the project setup process, allowing you to choose a template and configure your new Vite application.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm create vite@latest
```

----------------------------------------

TITLE: Scaffolding a Vite + Vue Project with npm
DESCRIPTION: Example of scaffolding a Vite project specifically for Vue.js using npm, by providing the template name as a command-line argument.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_5>

LANGUAGE: bash
CODE:

```
npm create vite@latest --template vue
```

----------------------------------------

TITLE: Scaffolding a Vite Project with Deno
DESCRIPTION: Command to initialize a new Vite project using Deno's init command with npm integration.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_4>

LANGUAGE: bash
CODE:

```
deno init --npm vite
```

----------------------------------------

TITLE: Scaffolding a Vite Project with Yarn
DESCRIPTION: Command to create a new Vite project using Yarn. This is an alternative to npm for initializing a Vite project, following the same interactive setup process.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_1>

LANGUAGE: bash
CODE:

```
yarn create vite
```

----------------------------------------

TITLE: Vite Project Setup and Development
DESCRIPTION: Commands for creating a new Vite project and starting the development server.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/hmr/unicode-path/中文-にほんご-한글-🌕🌖🌗/index.html#_snippet_0>

LANGUAGE: bash
CODE:

```
npm create vite@latest my-vue-app --template vue
cd my-vue-app
npm install
npm run dev
```

----------------------------------------

TITLE: Default npm Scripts in package.json
DESCRIPTION: Standard npm scripts for Vite projects: 'dev' for starting the dev server, 'build' for production builds, and 'preview' for previewing production builds.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_11>

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "dev": "vite", // start dev server, aliases: `vite dev`, `vite serve`
    "build": "vite build", // build for production
    "preview": "vite preview" // locally preview production build
  }
}
```

----------------------------------------

TITLE: Create Vite Project
DESCRIPTION: Scaffold a new Vite project using different package managers. Ensure npm 7+ is used for the `--` flag.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_6>

LANGUAGE: bash
CODE:

```
npm create vite@latest my-vue-app -- --template vue
```

LANGUAGE: bash
CODE:

```
yarn create vite my-vue-app --template vue
```

LANGUAGE: bash
CODE:

```
pnpm create vite my-vue-app --template vue
```

LANGUAGE: bash
CODE:

```
bun create vite my-vue-app --template vue
```

LANGUAGE: bash
CODE:

```
deno init --npm vite my-vue-app --template vue
```

----------------------------------------

TITLE: Scaffolding a Vite Project with Bun
DESCRIPTION: Command to create a new Vite project using Bun. Bun is a fast JavaScript runtime and toolkit that includes a package manager.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_3>

LANGUAGE: bash
CODE:

```
bun create vite
```

----------------------------------------

TITLE: Basic index.html
DESCRIPTION: A minimal HTML file to be served by Vite.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_9>

LANGUAGE: html
CODE:

```
<p>Hello Vite!</p>
```

----------------------------------------

TITLE: Preact Component Example (src/app.tsx)
DESCRIPTION: A basic Preact component written in TypeScript, demonstrating the integration with Vite. This serves as a starting point for building the application UI.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-preact-ts/index.html#_snippet_2>

LANGUAGE: typescript
CODE:

```
import { h } from 'preact';
import { useState } from 'preact/hooks';
import './style/app.css';

export function App() {
 const [count, setCount] = useState(0);

 return (
  <div id="app">
   <h1>Vite + Preact</h1>
   <p>
    <button onClick={() => setCount((count) => count + 1)}>
     count is: {count}
    </button>
   </p>
   <p>
    Edit <code>src/app.tsx</code> and save to test HMR
   </p>
  </div>
 );
}
```

----------------------------------------

TITLE: Link Globally Built Vite in Project
DESCRIPTION: Link the globally built Vite package into your Vite-based project to use the bleeding-edge version. This step requires restarting the development server.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_14>

LANGUAGE: bash
CODE:

```
pnpm link --global vite # or the package manager you used to link vite globally
```

----------------------------------------

TITLE: Setup Vite Monorepo with pnpm
DESCRIPTION: Instructions for setting up the Vite monorepo locally. This involves installing dependencies using pnpm, building the project, and running the core Vite package in development mode. It highlights the necessity of using pnpm as the package manager.

SOURCE: <https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md#_snippet_0>

LANGUAGE: pnpm
CODE:

```
pnpm i
```

LANGUAGE: pnpm
CODE:

```
pnpm run build
```

LANGUAGE: pnpm
CODE:

```
pnpm run dev
```

----------------------------------------

TITLE: Install Project Dependencies
DESCRIPTION: Installs project dependencies using npm, pnpm, or yarn. This is the first step to set up the project locally.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-solid/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm install # or pnpm install or yarn install
```

----------------------------------------

TITLE: Main Entry Point (src/main.tsx)
DESCRIPTION: The main TypeScript entry file that renders the root Preact component into the DOM. This file is the starting point for the application's execution.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-preact-ts/index.html#_snippet_4>

LANGUAGE: typescript
CODE:

```
import { render } from 'preact'
import { App } from './app'

render(<App />, document.getElementById('root') as HTMLElement);
```

----------------------------------------

TITLE: Install Project Dependencies
DESCRIPTION: Installs project dependencies using npm, pnpm, or yarn. This is the first step to set up the project locally.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-solid-ts/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm install # or pnpm install or yarn install
```

----------------------------------------

TITLE: Create Vite Project with Solid + TS
DESCRIPTION: Command to initialize a new Vite project with SolidJS and TypeScript support. This command scaffolds the project structure and installs necessary dependencies.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-solid-ts/index.html#_snippet_0>

LANGUAGE: bash
CODE:

```
npm create vite@latest my-solid-ts-app --template solid-ts
```

----------------------------------------

TITLE: Vite Script Setup Example
DESCRIPTION: Demonstrates how Vite handles importing raw SVG files within a Vue component's script setup. Vite's build process allows treating assets like SVGs as raw strings, enabling dynamic rendering via component props.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/why.md#_snippet_0>

LANGUAGE: JavaScript
CODE:

```
<script setup>
import bundlerSvg from '../images/bundler.svg?raw'
import esmSvg from '../images/esm.svg?raw'
</script>
<svg-image :svg="bundlerSvg" />
<svg-image :svg="esmSvg" />
```

----------------------------------------

TITLE: Install Unreleased Vite Commits
DESCRIPTION: Install a specific commit of Vite using package managers like npm, Yarn, pnpm, or Bun via pkg.pr.new. Replace SHA with a valid commit SHA from Vite's repository. Note that only commits from the last month are supported.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_12>

LANGUAGE: bash
CODE:

```
npm install -D https://pkg.pr.new/vite@SHA
```

LANGUAGE: bash
CODE:

```
yarn add -D https://pkg.pr.new/vite@SHA
```

LANGUAGE: bash
CODE:

```
pnpm add -D https://pkg.pr.new/vite@SHA
```

LANGUAGE: bash
CODE:

```
bun add -D https://pkg.pr.new/vite@SHA
```

----------------------------------------

TITLE: Link to Solid Start Blog Post
DESCRIPTION: A link to the blog post introducing Solid Start, a framework for SolidJS.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite6.md#_snippet_17>

LANGUAGE: html
CODE:

```
<a href="https://www.solidjs.com/blog/introducing-solidstart">Solid Start</a>
```

----------------------------------------

TITLE: Basic Vite Configuration for Solid + TS
DESCRIPTION: Example of a basic Vite configuration file (`vite.config.ts`) for a SolidJS project using TypeScript. It includes necessary plugins and settings for development and building.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-solid-ts/index.html#_snippet_1>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
```

----------------------------------------

TITLE: Library Entry File Example
DESCRIPTION: An example of a library's main entry file, exporting components or functions that users of the library can import.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/build.md#_snippet_8>

LANGUAGE: js
CODE:

```
import Foo from './Foo.vue'
import Bar from './Bar.vue'
export { Foo, Bar }
```

----------------------------------------

TITLE: Install Project Dependencies
DESCRIPTION: Installs all necessary dependencies for the Qwik project using a package manager like npm, pnpm, or yarn. This is a standard first step after cloning or creating a new project.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-qwik/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm install # or pnpm install or yarn install
```

----------------------------------------

TITLE: Initialize Vite Project with Svelte and TypeScript
DESCRIPTION: Command to create a new Vite project with Svelte and TypeScript templates. This command scaffolds the project structure and installs necessary dependencies.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-svelte-ts/index.html#_snippet_0>

LANGUAGE: bash
CODE:

```
npm create vite@latest my-svelte-ts-app --template svelte-ts
cd my-svelte-ts-app
npm install
npm run dev
```

----------------------------------------

TITLE: Scaffolding a Vite Project with pnpm
DESCRIPTION: Command to create a new Vite project using pnpm. pnpm is a performant package manager that can also be used to scaffold Vite projects.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_2>

LANGUAGE: bash
CODE:

```
pnpm create vite
```

----------------------------------------

TITLE: Basic Svelte Component with TypeScript
DESCRIPTION: Example of a simple Svelte component written in TypeScript, demonstrating basic reactivity and props.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-svelte-ts/index.html#_snippet_1>

LANGUAGE: svelte
CODE:

```
<script lang="ts">
  export let name: string;
</script>

<h1>Hello {name}!</h1>

<style>
  h1 {
    color: #ff3e00;
  }
</style>
```

----------------------------------------

TITLE: Vite Legacy Plugin Usage Example
DESCRIPTION: Example configuration for the Vite legacy plugin, demonstrating how to specify polyfills and control chunk rendering.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/plugin-legacy/README.md#_snippet_3>

LANGUAGE: js
CODE:

```
import legacy from '@vitejs/plugin-legacy'

export default {
  plugins: [
    legacy({
      modernPolyfills: [
        /* ... */
      ],
      renderLegacyChunks: false,
    }),
  ],
}
```

LANGUAGE: js
CODE:

```
import legacy from '@vitejs/plugin-legacy'

export default {
  plugins: [
    legacy({
      polyfills: ['es.promise.finally', 'es/map', 'es/set'],
      modernPolyfills: ['es.promise.finally'],
    }),
  ],
}
```

----------------------------------------

TITLE: Vite Profiling Command
DESCRIPTION: Command to start profiling Vite's performance. Allows recording a CPU profile for detailed analysis of bottlenecks using external tools.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/performance.md#_snippet_1>

LANGUAGE: bash
CODE:

```
vite --profile
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/ssr/runtime/__tests__/fixtures/assets/placeholder.txt#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Install Project Dependencies
DESCRIPTION: Installs all necessary dependencies for the Qwik project using a package manager like npm, pnpm, or yarn. This is a standard first step after cloning or creating a new project.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-qwik-ts/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm install # or pnpm install or yarn install
```

----------------------------------------

TITLE: Initialize Vite Project
DESCRIPTION: Command to spin up a new Vite-powered application. Requires Node.js version 12 or higher. This command initializes a new project with Vite's default setup, providing a quick start for development.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite2.md#_snippet_3>

LANGUAGE: bash
CODE:

```
npm init @vitejs/app

```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/__tests__/fixtures/watcher/custom-public/foo.txt#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: pnpm Install Command
DESCRIPTION: The command to run after updating pnpm overrides to link the local package.

SOURCE: <https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md#_snippet_8>

LANGUAGE: shell
CODE:

```
pnpm install
```

----------------------------------------

TITLE: Handle Transitive Dependencies
DESCRIPTION: Manage transitive dependencies that use Vite by utilizing npm overrides or pnpm overrides in your project's package.json file.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/index.md#_snippet_15>

LANGUAGE: javascript
CODE:

```
// Example using npm overrides
"overrides": {
  "vite": "link:../path/to/your/local/vite"
}

// Example using pnpm overrides
"pnpm": {
  "overrides": {
    "vite": "link:../path/to/your/local/vite"
  }
}
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/relative-input.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Vite Build Manifest Example
DESCRIPTION: An example of the `.vite/manifest.json` file generated after running `vite build`. This file maps source files to their built output, including CSS and assets.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/backend-integration.md#_snippet_4>

LANGUAGE: json
CODE:

```
{
  "_shared-B7PI925R.js": {
    "file": "assets/shared-B7PI925R.js",
    "name": "shared",
    "css": ["assets/shared-ChJ_j-JJ.css"]
  },
  "_shared-ChJ_j-JJ.css": {
    "file": "assets/shared-ChJ_j-JJ.css",
    "src": "_shared-ChJ_j-JJ.css"
  },
  "logo.svg": {
    "file": "assets/logo-BuPIv-2h.svg",
    "src": "logo.svg"
  },
  "baz.js": {
    "file": "assets/baz-B2H3sXNv.js",
    "name": "baz",
    "src": "baz.js",
    "isDynamicEntry": true
  },
  "views/bar.js": {
    "file": "assets/bar-gkvgaI9m.js",
    "name": "bar",
    "src": "views/bar.js",
    "isEntry": true,
    "imports": ["_shared-B7PI925R.js"],
    "dynamicImports": ["baz.js"]
  },
  "views/foo.js": {
    "file": "assets/foo-BRBmoGS9.js",
    "name": "foo",
    "src": "views/foo.js",
    "isEntry": true,
    "imports": ["_shared-B7PI925R.js"],
    "css": ["assets/foo-5UjPuW-k.css"]
  }
}
```

----------------------------------------

TITLE: Vite CLI Output Example
DESCRIPTION: Demonstrates the typical output of the Vite CLI during development startup, including version, local server address, and network exposure information.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite3.md#_snippet_2>

LANGUAGE: bash
CODE:

```
  <b>VITE</b> <b>v3.0.0</b>  <b>ready in <b>320</b> ms</b>

  <b>➜</b>  <b>Local</b>:   http://127.0.0.1:5173/
  <b>➜</b>  <b>Network</b>: use --host to expose
```

----------------------------------------

TITLE: Vite Configuration (`vite.config.js`)
DESCRIPTION: Example Vite configuration file. Demonstrates common configurations like plugins, server options, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/transform-plugin/index.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    rollupOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    }
  }
})
```

----------------------------------------

TITLE: Profiling Vite Dev Server and Build
DESCRIPTION: Starts the Node.js inspector for profiling Vite's performance during development or build. This helps identify performance bottlenecks by generating CPU profiles.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/troubleshooting.md#_snippet_12>

LANGUAGE: bash
CODE:

```
vite --profile --open
```

LANGUAGE: bash
CODE:

```
vite build --profile
```

----------------------------------------

TITLE: Vite Configuration (vite.config.ts)
DESCRIPTION: Example Vite configuration file for a Preact and TypeScript project. This file allows customization of the build process, plugins, and development server.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-preact-ts/index.html#_snippet_1>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
})
```

----------------------------------------

TITLE: Vite Configuration Example (YAML)
DESCRIPTION: An alternative way to configure Vite using a YAML file.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/scriptMixed.html#_snippet_5>

LANGUAGE: yaml
CODE:

```
server:
  port: 5000
plugins:
  - react
build:
  outDir: dist
```

----------------------------------------

TITLE: Rolldown Migration Guide Link
DESCRIPTION: Link to the migration guide for switching to the Rolldown-powered Vite package.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite7.md#_snippet_15>

LANGUAGE: markdown
CODE:

```
[migration guide](https://vite.dev/rolldown)
```

----------------------------------------

TITLE: Vite Production HTML Output Example
DESCRIPTION: Examples of the HTML tags that should be included in production for specific entry points (`views/foo.js` and `views/bar.js`) based on the Vite manifest structure.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/backend-integration.md#_snippet_7>

LANGUAGE: html
CODE:

```
For views/foo.js:
<link rel="stylesheet" href="assets/foo-5UjPuW-k.css" />
<link rel="stylesheet" href="assets/shared-ChJ_j-JJ.css" />
<script type="module" src="assets/foo-BRBmoGS9.js"></script>
<!-- optional -->
<link rel="modulepreload" href="assets/shared-B7PI925R.js" />

For views/bar.js:
<link rel="stylesheet" href="assets/shared-ChJ_j-JJ.css" />
<script type="module" src="assets/bar-gkvgaI9m.js"></script>
<!-- optional -->
<link rel="modulepreload" href="assets/shared-B7PI925R.js" />
```

----------------------------------------

TITLE: Installing Trusted SSL Certificate on macOS
DESCRIPTION: Details the command-line method for installing a trusted SSL certificate on macOS to resolve caching issues with Chrome when using self-signed certificates.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/troubleshooting.md#_snippet_3>

LANGUAGE: bash
CODE:

```
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db your-cert.cer
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/dynamic-import-inline/index.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Install CSS Pre-processors
DESCRIPTION: Commands to install necessary pre-processor dependencies for Sass, Less, and Stylus.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/features.md#_snippet_12>

LANGUAGE: bash
CODE:

```
# .scss and .sass
npm add -D sass-embedded # or sass

# .less
npm add -D less

# .styl and .stylus
npm add -D stylus
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/inline/shared-1.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/inline/shared-2.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Vite Development Server Configuration (vite.config.js)
DESCRIPTION: Example configuration file for Vite, showing how to set up plugins and server options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/scriptMixed.html#_snippet_1>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

----------------------------------------

TITLE: Initialize Vite Project
DESCRIPTION: Command to create a new Vite project with a Preact and TypeScript template.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-preact-ts/index.html#_snippet_0>

LANGUAGE: bash
CODE:

```
npm create vite@latest my-preact-ts-app --template preact-ts
cd my-preact-ts-app
npm install
npm run dev
```

----------------------------------------

TITLE: Vite Migration Guide Link
DESCRIPTION: Link to the official Vite migration guide, useful for upgrading existing projects to newer versions.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite7.md#_snippet_2>

LANGUAGE: markdown
CODE:

```
[Migration Guide](/guide/migration)
```

----------------------------------------

TITLE: Install Lightning CSS
DESCRIPTION: Command to install the optional lightningcss dependency for experimental support.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/features.md#_snippet_14>

LANGUAGE: bash
CODE:

```
npm add -D lightningcss
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/inline/unique.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Vite Features Guide
DESCRIPTION: Overview of Vite's core features and functionalities for users new to the tool.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite5.md#_snippet_3>

LANGUAGE: link
CODE:

```
/guide/features
```

----------------------------------------

TITLE: Vite Migration Guide
DESCRIPTION: Guide for migrating existing Vite projects to version 5.0, detailing breaking changes and necessary adjustments.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite5.md#_snippet_1>

LANGUAGE: link
CODE:

```
/guide/migration
```

----------------------------------------

TITLE: VS Code Debugging Setup
DESCRIPTION: Instructions for setting up breakpoints and debugging Vite code execution within VS Code. This involves adding a 'debugger' statement and using the JavaScript Debug Terminal.

SOURCE: <https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md#_snippet_3>

LANGUAGE: javascript
CODE:

```
debugger;
```

LANGUAGE: shell
CODE:

```
pnpm run dev
```

----------------------------------------

TITLE: Start Vite Preview Server
DESCRIPTION: Starts a Vite preview server to serve the built application. It accepts an optional inline configuration object and returns a `PreviewServer` instance.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/api-javascript.md#_snippet_5>

LANGUAGE: ts
CODE:

```
async function preview(inlineConfig?: InlineConfig): Promise<PreviewServer>
```

LANGUAGE: javascript
CODE:

```
import { preview } from 'vite'

const previewServer = await preview({
  // any valid user config options, plus `mode` and `configFile`
  preview: {
    port: 8080,
    open: true,
  },
})

previewServer.printUrls()
previewServer.bindCLIShortcuts({ print: true })
```

----------------------------------------

TITLE: Vite Development Server Command
DESCRIPTION: The command to start the Vite development server.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/scriptMixed.html#_snippet_3>

LANGUAGE: bash
CODE:

```
npm run dev
```

----------------------------------------

TITLE: Vite Release Process Commands
DESCRIPTION: Commands to execute locally for cutting a release. This includes updating the project, installing dependencies, building the project, and initiating the release process. The `--dry` flag can be used to test the release without making changes.

SOURCE: <https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md#_snippet_12>

LANGUAGE: bash
CODE:

```
git pull
pnpm i
pnpm build
pnpm release
pnpm release --dry
```

----------------------------------------

TITLE: Vite Contributing Guide Link
DESCRIPTION: Link to the Vite project's contributing guide, encouraging community involvement in development and maintenance.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite7.md#_snippet_4>

LANGUAGE: markdown
CODE:

```
[Contributing Guide](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md)
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/invalid.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Glob Import from node_modules with Vite
DESCRIPTION: Illustrates importing modules located within `node_modules` using `import.meta.glob`. This can be used to dynamically load packages or specific files from installed dependencies.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/glob-import/index.html#_snippet_2>

LANGUAGE: javascript
CODE:

```
const nodeModules = import.meta.glob('/dir/node_modules/**/*')
useImports(nodeModules, '.result-node_modules')
```

----------------------------------------

TITLE: Rollup Configuration Import Example
DESCRIPTION: Demonstrates how to link to a Rollup import within the Vite project configuration.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/link.html#_snippet_0>

LANGUAGE: markdown
CODE:

```
Link to rollup config [A Link to a Rollup Import](/link/target)
```

----------------------------------------

TITLE: Vite TypeScript Configuration
DESCRIPTION: Example Vite configuration file for a TypeScript project, including necessary plugins and build settings.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/__tests__/fixtures/watcher/custom-public/foo.txt#_snippet_5>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

----------------------------------------

TITLE: Link to TanStack Start
DESCRIPTION: A link to TanStack Start, a new framework for building web applications.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/blog/announcing-vite6.md#_snippet_11>

LANGUAGE: html
CODE:

```
<a href="https://tanstack.com/start">TanStack Start</a>
```

----------------------------------------

TITLE: Vite Configuration (`vite.config.js`)
DESCRIPTION: Example Vite configuration file. Demonstrates common configurations like plugins, server options, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/hmr/accept-exports/export-from/index.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    rollupOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    }
  }
})
```

----------------------------------------

TITLE: Lazy Importing Dependencies in ESM
DESCRIPTION: Demonstrates the recommended pattern for lazy-requiring dependencies within an ESM (ECMAScript Modules) environment. This approach is used to improve start-up performance and is necessary when dependencies are installed as devDependencies.

SOURCE: <https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md#_snippet_2>

LANGUAGE: javascript
CODE:

```
(await import('somedep')).default
```

----------------------------------------

TITLE: Vite TypeScript Configuration
DESCRIPTION: Example Vite configuration file for a TypeScript project, including necessary plugins and build settings.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/ssr/runtime/__tests__/fixtures/assets/placeholder.txt#_snippet_5>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

----------------------------------------

TITLE: Avoid Barrel Files Example
DESCRIPTION: Demonstrates a common barrel file pattern in JavaScript that can lead to slower page loads by forcing the import of unused modules. It suggests importing individual APIs directly to mitigate this.

SOURCE: <https://github.com/vitejs/vite/blob/main/docs/guide/performance.md#_snippet_4>

LANGUAGE: javascript
CODE:

```
export * from './color.js'
export * from './dom.js'
export * from './slash.js'
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/tailwind-v3/index.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Playwright Test with Vitest Page Helper
DESCRIPTION: Example of a Vitest test case utilizing the Playwright 'page' object imported from '~utils'. This object provides access to the served page for interaction and assertions.

SOURCE: <https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md#_snippet_9>

LANGUAGE: js
CODE:

```
import { page } from '~utils'

test('should work', async () => {
  expect(await page.textContent('.foo')).toMatch('foo')
})
```

----------------------------------------

TITLE: CSS Styling Example
DESCRIPTION: Demonstrates basic CSS styling concepts as presented in Vite's context. This example shows how text content can be associated with styling rules.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/css/postcss-caching/green-app/index.html#_snippet_0>

LANGUAGE: css
CODE:

```
This should be black

This should be green
```

----------------------------------------

TITLE: Vite Worker Import Syntax
DESCRIPTION: Shows Vite's specific import syntax for workers, allowing for query parameters like `?worker` to enable worker loading. Includes examples of importing and instantiating workers.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/worker/index.html#_snippet_1>

LANGUAGE: javascript
CODE:

```
import myWorker from '../my-worker?worker'

// Example usage with options
// new myWorker({ name: "named-worker" })

```

----------------------------------------

TITLE: Mermaid: Cyclic Import Example 2
DESCRIPTION: Shows another cyclic import scenario involving `dep1.js` and `dep2.js` with a central `index.js` file, visualized with a Mermaid flowchart. This highlights a different dependency structure leading to a cycle.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/ssr/runtime/__tests__/fixtures/cyclic2/README.md#_snippet_1>

LANGUAGE: mermaid
CODE:

```
flowchart TD
    A(dep1.js) -->|dep1| B
    B(dep2.js) -->|dep2| A
    A -->|dep1| C(index.js)
```

----------------------------------------

TITLE: Vite Preview
DESCRIPTION: Locally previews the production build using a simple static server.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/__tests__/fixtures/watcher/custom-public/foo.txt#_snippet_3>

LANGUAGE: bash
CODE:

```
npm run preview
```

----------------------------------------

TITLE: Vite Configuration (`vite.config.js`)
DESCRIPTION: Example Vite configuration file. Demonstrates common configurations like plugins, server options, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/hmr/accept-exports/main-accepted/index.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    rollupOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    }
  }
})
```

----------------------------------------

TITLE: Vite Preview
DESCRIPTION: Locally previews the production build using a simple static server.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/vite/src/node/ssr/runtime/__tests__/fixtures/assets/placeholder.txt#_snippet_3>

LANGUAGE: bash
CODE:

```
npm run preview
```

----------------------------------------

TITLE: Vite Configuration (`vite.config.js`)
DESCRIPTION: Example Vite configuration file. Demonstrates common configurations like plugins, server options, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/hmr-ssr/accept-exports/reexports.bak/index.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    rollupOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    }
  }
})
```

----------------------------------------

TITLE: Worker Import with `.href`
DESCRIPTION: Example of importing a worker and accessing its URL via `.href`.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/worker/index.html#_snippet_12>

LANGUAGE: javascript
CODE:

```
new Worker(new URL('../simple-worker.js', import.meta.url).href)
```

----------------------------------------

TITLE: Vite TypeScript Configuration
DESCRIPTION: Example Vite configuration file for a TypeScript project, including necessary plugins and build settings.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/relative-input.html#_snippet_5>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

----------------------------------------

TITLE: Classic Worker Initialization
DESCRIPTION: Shows how to initialize a Web Worker using the classic script type.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/worker/index.html#_snippet_10>

LANGUAGE: javascript
CODE:

```
new Worker(new URL('./classic-worker.js', import.meta.url))
```

----------------------------------------

TITLE: Vite Configuration (vite.config.js)
DESCRIPTION: Example Vite configuration file demonstrating common options like plugins, server settings, and build options.

SOURCE: <https://github.com/vitejs/vite/blob/main/playground/html/invalidEscape.html#_snippet_4>

LANGUAGE: javascript
CODE:

```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // string shorthand: '/api': 'http://jsonplaceholder.org'
      '/api': {
        target: 'http://jsonplaceholder.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('^/api', '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'nested/index.html')
      },
      output: {
        entryFileNames: `assets/[name].${timestamp}.js`,
        chunkFileNames: `assets/[name].${timestamp}.js`,
        assetFileNames: `assets/[name].${timestamp}[extname]`
      }
    }
  }
})
```

----------------------------------------

TITLE: Build for Production
DESCRIPTION: Builds the application for production, optimizing it for performance and creating a `dist` folder. The output is minified and includes content hashes for caching.

SOURCE: <https://github.com/vitejs/vite/blob/main/packages/create-vite/template-solid/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npm run build
```
