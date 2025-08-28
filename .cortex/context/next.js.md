========================
CODE SNIPPETS
========================
TITLE: Initializing Next.js Project with an Example (CLI)
DESCRIPTION: This snippet demonstrates how to initialize a Next.js project using a specific example from the official Next.js examples collection. The `--example` flag allows users to bootstrap their application with pre-configured setups, such as `route-handlers`, accelerating development by providing a functional starting point.

SOURCE: https://github.com/vercel/next.js/blob/canary/packages/create-next-app/README.md#_snippet_3

LANGUAGE: bash
CODE:

```
npx create-next-app --example route-handlers
```

---

TITLE: Bootstrap Next.js Example with create-next-app
DESCRIPTION: These commands demonstrate how to initialize a new Next.js project using the `with-graphql-react` example. They utilize `create-next-app` with different package managers (npm, Yarn, pnpm) to set up the project directory and its dependencies, providing a quick way to get started with the example.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-graphql-react/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-graphql-react with-graphql-react-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-graphql-react with-graphql-react-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-graphql-react with-graphql-react-app
```

---

TITLE: Set up and run Next.js and Tigris locally
DESCRIPTION: Instructions for setting up the Tigris Next.js example application for local development. This involves cloning the repository, installing Node.js dependencies, starting the Tigris local development environment, and running the Next.js server. Prerequisites include Tigris CLI and Node.js 16+.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-tigris/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
git clone https://github.com/tigrisdata/tigris-vercel-starter
cd tigris-vercel-starter
npm install
tigris dev start
npm run dev
```

---

TITLE: Umbraco CMS Project Setup and Data Installation
DESCRIPTION: Commands for the .NET CLI to install Umbraco templates, create a new Umbraco project, add sample blog data, and run the Umbraco CMS locally.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-umbraco/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
dotnet new install Umbraco.Templates::13.*
```

LANGUAGE: bash
CODE:

```
dotnet new umbraco
```

LANGUAGE: bash
CODE:

```
dotnet add package Umbraco.Sample.Headless.Blog
```

LANGUAGE: bash
CODE:

```
dotnet run
```

---

TITLE: Install Dependencies and Run Next.js Development Server
DESCRIPTION: This snippet provides the necessary shell commands to set up the Next.js project. It first installs all required npm dependencies and then starts the local development server, making the application accessible at `localhost:3000`.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-formspree/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
# Install dependencies
npm install

# Run next locally at localhost:3000
npm run dev
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Installs project dependencies and starts the Next.js development server, making the application accessible locally, typically at `http://localhost:3000`.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-kontent-ai/README.md#_snippet_7

LANGUAGE: bash
CODE:

```
npm install
npm run dev

# or

yarn
yarn dev
```

---

TITLE: Bootstrap Next.js App with api.video Example
DESCRIPTION: Commands to initialize a new Next.js project using the `with-apivideo` example template. This sets up the basic project structure and dependencies, allowing you to quickly get started with the api.video integration.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-apivideo/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-apivideo with-apivideo-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-apivideo with-apivideo-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-apivideo with-apivideo-app
```

---

TITLE: Start Home Next.js Application
DESCRIPTION: Commands to navigate into the `home` application directory, install its dependencies, and then start the development server. The `home` app typically serves as the main entry point for the multi-zone setup.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-zones/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
cd home
npm install && npm run dev
```

LANGUAGE: bash
CODE:

```
cd home
yarn && yarn dev
```

LANGUAGE: bash
CODE:

```
cd home
pnpm install && pnpm dev
```

---

TITLE: Install Dependencies and Run Next.js Development Server
DESCRIPTION: These commands are used to set up and run the Next.js application in development mode. `npm install` or `yarn install` fetches project dependencies, while `npm run dev` or `yarn dev` starts the local development server, typically accessible at `http://localhost:3000`.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-datocms/README.md#_snippet_3

LANGUAGE: bash
CODE:

```
npm install
npm run dev

# or

yarn install
yarn dev
```

---

TITLE: Create Next.js App with Route-as-Modal Example
DESCRIPTION: Bootstrap a new Next.js application pre-configured with the 'with-route-as-modal' example. These commands utilize `create-next-app` to set up the project directory and install necessary dependencies, allowing users to quickly get started with the modal routing pattern. The `--example` flag specifies the template to use, and the last argument defines the new project's directory name.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-route-as-modal/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-route-as-modal with-route-as-modal-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-route-as-modal with-route-as-modal-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-route-as-modal with-route-as-modal-app
```

---

TITLE: Create Next.js App with Neo4j Example
DESCRIPTION: This snippet demonstrates how to bootstrap a new Next.js application pre-configured with the Neo4j example using `create-next-app`. It provides commands for npm, Yarn, and pnpm, allowing users to quickly set up the project.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-neo4j/README.md#_snippet_0

LANGUAGE: Bash
CODE:

```
npx create-next-app --example with-neo4j with-neo4j-app
```

LANGUAGE: Bash
CODE:

```
yarn create next-app --example with-neo4j with-neo4j-app
```

LANGUAGE: Bash
CODE:

```
pnpm create next-app --example with-neo4j with-neo4j-app
```

---

TITLE: Bootstrap Next.js Sanity Blog Example
DESCRIPTION: Use `create-next-app` with npm, Yarn, or pnpm to initialize a new Next.js project based on the Sanity CMS example. This command sets up the project structure and dependencies, allowing you to quickly get started with the blog starter.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-sanity/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example cms-sanity next-sanity-blog
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example cms-sanity next-sanity-blog
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example cms-sanity next-sanity-blog
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Instructions to install project dependencies and start the local development server for a Next.js application using Yarn. Once started, the blog will be accessible in your browser at http://localhost:3000.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-webiny/README.md#_snippet_3

LANGUAGE: Shell
CODE:

```
yarn install
yarn dev
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: Commands to install project dependencies and start the Next.js development server. These steps are executed within the Next.js application directory after the Webiny project and environment variables have been properly configured.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-webiny/README.md#_snippet_2

LANGUAGE: Bash
CODE:

```
npm install
```

LANGUAGE: Bash
CODE:

```
npm run dev
```

---

TITLE: Bootstrap Next.js project with Prepr example
DESCRIPTION: Commands to initialize a new Next.js application using the `create-next-app` utility, pre-configured with the Prepr CMS example. This allows for quick setup of the project structure and initial files.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-prepr/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example cms-prepr cms-prepr-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example cms-prepr cms-prepr-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example cms-prepr cms-prepr-app
```

---

TITLE: Bootstrap Next.js blog starter project
DESCRIPTION: Instructions to initialize a new Next.js project using the `blog-starter` example. This command sets up the project structure and dependencies, allowing users to quickly get a local development environment running.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/blog-starter/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example blog-starter blog-starter-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example blog-starter blog-starter-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example blog-starter blog-starter-app
```

---

TITLE: Bootstrap Next.js Apollo Redux Example Project
DESCRIPTION: These commands demonstrate how to initialize a new Next.js project using the `create-next-app` utility, specifically bootstrapping the `with-apollo-and-redux` example. Users can choose their preferred package manager (npm, Yarn, or pnpm) to set up the project directory `with-apollo-and-redux-app`. This allows for quick setup and exploration of the integrated Apollo and Redux setup.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-apollo-and-redux/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-apollo-and-redux with-apollo-and-redux-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-apollo-and-redux with-apollo-and-redux-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-apollo-and-redux with-apollo-and-redux-app
```

---

TITLE: Run Next.js Development Server with npm
DESCRIPTION: Installs project dependencies using npm and then starts the Next.js development server, making the application accessible locally.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-enterspeed/README.md#_snippet_7

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

---

TITLE: Running Next.js Development Server (npm)
DESCRIPTION: These commands first install all project dependencies using npm, then start the Next.js development server. This allows you to view your application locally at `http://localhost:3000` and enables hot-reloading for development.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-builder-io/README.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

---

TITLE: Run Next.js development server
DESCRIPTION: Commands to install project dependencies and start the Next.js development server. This makes the application accessible locally, typically at `http://localhost:3000`, for development and testing purposes.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-builder-io/README.md#_snippet_4

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Bootstrapping Next.js Project with pnpm
DESCRIPTION: This command initializes a new Next.js application using `create-next-app` and the provided Temporal example template via pnpm. It sets up the project structure and dependencies required to start development.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-temporal/README.md#_snippet_3

LANGUAGE: Bash
CODE:

```
pnpm create next-app --example with-temporal next-temporal-app
```

---

TITLE: Install Dependencies and Run Next.js Development Server
DESCRIPTION: Executes `npm install` to download and set up all project dependencies defined in `package.json`. Subsequently, `npm run dev` starts the Next.js development server, allowing for local testing and development of the application with hot-reloading capabilities.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-agilitycms/README.md#_snippet_9

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

---

TITLE: Run Next.js Development Server with Yarn
DESCRIPTION: Installs project dependencies using Yarn and then starts the Next.js development server, making the application accessible locally.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-enterspeed/README.md#_snippet_8

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Run Next.js Development Server for Partytown Setup
DESCRIPTION: Execute this command in the terminal to start the Next.js development server. After enabling `nextScriptWorkers`, Next.js will guide you through installing necessary Partytown packages to complete the web worker setup.

SOURCE: https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/scripts.mdx#_snippet_5

LANGUAGE: bash
CODE:

```
npm run dev
```

---

TITLE: Run Next.js Application in Development Mode
DESCRIPTION: After installing project dependencies, use these commands to start the Next.js development server. This will make your blog accessible locally, typically at `http://localhost:3000`.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-sitefinity/README.md#_snippet_2

LANGUAGE: Shell
CODE:

```
npm install
npm run dev
```

LANGUAGE: Shell
CODE:

```
yarn
yarn dev
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: After bootstrapping the project, install the necessary dependencies and start the Next.js development server. This will make the blog accessible locally, sourcing content from a demo Ghost CMS by default.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-ghost/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Run Sanity Project Setup for Next.js
DESCRIPTION: These commands execute the Sanity setup script, which guides you through connecting your Next.js project to a Sanity project and dataset. It interactively prompts for project and dataset selection, and configures relevant environment variables like `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-sanity/README.md#_snippet_4

LANGUAGE: bash
CODE:

```
npm run setup
```

LANGUAGE: bash
CODE:

```
yarn setup
```

LANGUAGE: bash
CODE:

```
pnpm run setup
```

---

TITLE: Sanity CLI Interactive Setup Process Example
DESCRIPTION: This code block displays a typical interactive session when running the Sanity setup command. It illustrates the questions asked by the CLI, such as project and dataset selection, and highlights the crucial step of declining to add new configuration files if they already exist.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-sanity/README.md#_snippet_5

LANGUAGE: bash
CODE:

```
Need to install the following packages:
sanity@3.30.1
Ok to proceed? (y) y
You're setting up a new project!
We'll make sure you have an account with Sanity.io.
Press ctrl + C at any time to quit.

Prefer web interfaces to terminals?
You can also set up best practice Sanity projects with
your favorite frontends on https://www.sanity.io/templates

Looks like you already have a Sanity-account. Sweet!

✔ Fetching existing projects
? Select project to use Templates [r0z1eifg]
? Select dataset to use blog-vercel
? Would you like to add configuration files for a Sanity project in this Next.js folder? No

Detected framework Next.js, using prefix 'NEXT_PUBLIC_'
Found existing NEXT_PUBLIC_SANITY_PROJECT_ID, replacing value.
Found existing NEXT_PUBLIC_SANITY_DATASET, replacing value.
```

---

TITLE: Bootstrap Next.js DatoCMS Example
DESCRIPTION: Use `create-next-app` with npm, Yarn, or pnpm to quickly set up a new Next.js project based on the DatoCMS blog example. This command initializes a new directory with the necessary project structure and dependencies.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-datocms/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example cms-datocms cms-datocms-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example cms-datocms cms-datocms-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example cms-datocms cms-datocms-app
```

---

TITLE: Bootstrap Next.js Enterspeed Blog Example
DESCRIPTION: Instructions to quickly set up the Next.js blog example integrated with Enterspeed using different package managers. These commands initialize a new Next.js project pre-configured with the Enterspeed CMS example, creating a local directory named 'enterspeed-app'.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-enterspeed/README.md#_snippet_0

LANGUAGE: Bash
CODE:

```
npx create-next-app --example cms-enterspeed enterspeed-app
```

LANGUAGE: Bash
CODE:

```
yarn create next-app --example cms-enterspeed enterspeed-app
```

LANGUAGE: Bash
CODE:

```
pnpm create next-app -- --example cms-enterspeed enterspeed-app
```

---

TITLE: Install dependencies and start Stencil development server
DESCRIPTION: Installs all necessary project dependencies using npm and then starts the development server for the Stencil component, enabling live reloading and local testing during development.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-stencil/packages/test-component/readme.md#_snippet_1

LANGUAGE: bash
CODE:

```
npm install
npm start
```

---

TITLE: Run Next.js Development Server
DESCRIPTION: These commands are used to install project dependencies and subsequently start the Next.js development server. After successful execution, the application will typically be accessible in your web browser at `http://localhost:3000`, allowing for local development and testing.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-userbase/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
npm install
```

LANGUAGE: bash
CODE:

```
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
```

LANGUAGE: bash
CODE:

```
yarn dev
```

LANGUAGE: bash
CODE:

```
pnpm install
```

LANGUAGE: bash
CODE:

```
pnpm dev
```

---

TITLE: Bootstrap Next.js app with React Context API example
DESCRIPTION: These commands initialize a new Next.js project using the `create-next-app` utility. They specifically bootstrap the 'with-context-api' example, setting up a pre-configured application demonstrating React Context API usage for state management. This allows developers to quickly start with a functional example without manual setup, using their preferred package manager.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-context-api/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-context-api with-context-api-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-context-api with-context-api-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-context-api with-context-api-app
```

---

TITLE: Run Next.js ESLint Configuration
DESCRIPTION: Executes the `npm run lint` command to initiate the interactive ESLint installation and configuration process in a Next.js project. This command guides the user through selecting a strict or base ESLint setup.

SOURCE: https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/01-installation.mdx#_snippet_10

LANGUAGE: bash
CODE:

```
npm run lint
```

---

TITLE: Create Next.js App with Hello World Example
DESCRIPTION: These commands demonstrate how to bootstrap a minimal Next.js project using the 'hello-world' example. They utilize different package managers: 'npx' (Node.js package runner), 'yarn create' (Yarn's project creation command), and 'pnpm create' (pnpm's project creation command). Each command creates a new directory named 'hello-world-app' pre-configured with the example.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/hello-world/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example hello-world hello-world-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example hello-world hello-world-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example hello-world hello-world-app
```

---

TITLE: Bootstrap Next.js Agility CMS Example Project
DESCRIPTION: Use `create-next-app` with your preferred package manager (npm, Yarn, or pnpm) to quickly set up a new Next.js project pre-configured with the Agility CMS example. This command clones the example repository and initializes a new application directory, providing a ready-to-use starting point.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-agilitycms/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example cms-agilitycms cms-agilitycms-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example cms-agilitycms cms-agilitycms-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example cms-agilitycms cms-agilitycms-app
```

---

TITLE: Local Development Setup for Next.js Payload Application
DESCRIPTION: This section outlines the essential steps to set up and run the Next.js and Payload CMS application locally. It covers cloning the repository, installing project dependencies using either Yarn or npm, configuring environment variables from an example file, and starting the development server for local access.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-payload/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
git clone https://github.com/vercel/next.js/tree/canary/examples/cms-payload
```

LANGUAGE: bash
CODE:

```
yarn
# OR
npm install
```

LANGUAGE: bash
CODE:

```
cp .env.example .env
```

LANGUAGE: bash
CODE:

```
yarn dev
```

---

TITLE: Create Next.js app automatically with create-next-app
DESCRIPTION: Use `create-next-app` to quickly set up a new Next.js project with interactive prompts for configuration, automating the initial setup process.

SOURCE: https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/01-installation.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app@latest
```

---

TITLE: Create Next.js App with Reactstrap Example
DESCRIPTION: These commands initialize a new Next.js project by cloning the 'with-reactstrap' example from the Next.js repository. They set up a new directory named 'with-reactstrap-app' and install all required dependencies, allowing users to quickly start developing with reactstrap in Next.js.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-reactstrap/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-reactstrap with-reactstrap-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-reactstrap with-reactstrap-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-reactstrap with-reactstrap-app
```

---

TITLE: Start Next.js Development Server Locally
DESCRIPTION: These commands are used to install project dependencies and then launch the Next.js development server. Running these will make your blog accessible locally, typically at `http://localhost:3000`, allowing for local development and testing.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-sanity/README.md#_snippet_8

LANGUAGE: bash
CODE:

```
npm install && npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install && yarn dev
```

LANGUAGE: bash
CODE:

```
pnpm install && pnpm dev
```

---

TITLE: Install Dependencies and Run Next.js Development Server
DESCRIPTION: This snippet provides commands to install project dependencies and start the Next.js development server. After running these commands, the application will be accessible locally, typically at `http://localhost:3000`, allowing for local development and testing.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-graphcms/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Install dependencies and run Next.js in development mode
DESCRIPTION: These commands demonstrate how to install project dependencies and start the Next.js development server. Developers can choose between `npm` or `yarn` package managers to set up and run the application locally for testing and development.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-contentful/README.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Running Next.js Development Server (Yarn)
DESCRIPTION: These commands first install all project dependencies using Yarn, then start the Next.js development server. This allows you to view your application locally at `http://localhost:3000` and enables hot-reloading for development.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-builder-io/README.md#_snippet_7

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Bootstrap Next.js Application with create-next-app
DESCRIPTION: These commands demonstrate how to quickly set up a new Next.js project using the `create-next-app` utility, specifically for the `cms-sitefinity` example. Choose your preferred package manager: npm, Yarn, or pnpm.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-sitefinity/README.md#_snippet_0

LANGUAGE: Shell
CODE:

```
npx create-next-app --example cms-sitefinity cms-sitefinity-app
```

LANGUAGE: Shell
CODE:

```
yarn create next-app --example cms-sitefinity cms-sitefinity-app
```

LANGUAGE: Shell
CODE:

```
pnpm create next-app --example cms-sitefinity cms-sitefinity-app
```

---

TITLE: Bootstrap Next.js MQTT Example Project
DESCRIPTION: Use these commands with `npx`, `yarn`, or `pnpm` to quickly initialize a new Next.js application pre-configured with the MQTT.js example. This sets up the basic project structure and dependencies.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-mqtt-js/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-mqtt-js with-mqtt-js-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-mqtt-js with-mqtt-js-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-mqtt-js with-mqtt-js-app
```

---

TITLE: Bootstrap Next.js Application with create-next-app
DESCRIPTION: Commands to initialize a new Next.js project using the `cms-cosmic` example template. This process leverages `create-next-app` with npm, Yarn, or pnpm to quickly set up the project structure and dependencies, ensuring a consistent starting point.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-cosmic/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example cms-cosmic cms-cosmic-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example cms-cosmic cms-cosmic-app
```

LANGUAGE: bash
CODE:

```
pnpm create-next-app --example cms-cosmic cms-cosmic-app
```

---

TITLE: Create Next.js App with urql Example
DESCRIPTION: This set of commands initializes a new Next.js project using the `create-next-app` utility. It specifically bootstraps the `with-urql` example, setting up a project ready for urql integration with Server-Side Generation (SSG). Users can choose their preferred package manager: npm (via npx), Yarn, or pnpm.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-urql/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-urql with-urql-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-urql with-urql-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-urql with-urql-app
```

---

TITLE: Install and Authenticate Firebase CLI
DESCRIPTION: These commands guide users through installing the Firebase command-line tools globally, logging into their Firebase account, and listing available projects to retrieve the project ID. This is a prerequisite for deploying Next.js applications to Firebase Hosting.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-firebase-hosting/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npm i -g firebase-tools
```

LANGUAGE: bash
CODE:

```
firebase login
```

LANGUAGE: bash
CODE:

```
firebase projects:list
```

---

TITLE: Run Next.js Application in Development Mode
DESCRIPTION: These commands install the project dependencies and then start the Next.js development server. After execution, the application will typically be accessible at `http://localhost:3000`. Ensure all environment variables are correctly configured before running.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-nhost-auth-realtime-graphql/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
npm install
```

LANGUAGE: bash
CODE:

```
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
```

LANGUAGE: bash
CODE:

```
yarn dev
```

LANGUAGE: bash
CODE:

```
pnpm install
```

LANGUAGE: bash
CODE:

```
pnpm dev
```

---

TITLE: Start Next.js Development Server
DESCRIPTION: This command initiates the Next.js development server, making the application accessible locally. It can be executed using npm, yarn, pnpm, or bun, depending on the preferred package manager. The server typically runs on `http://localhost:3000`.

SOURCE: https://github.com/vercel/next.js/blob/canary/packages/create-next-app/templates/default-empty/ts/README-template.md#_snippet_0

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

TITLE: Run Next.js Development Server
DESCRIPTION: After configuring environment variables, these commands allow you to install project dependencies and start the Next.js development server. The application will then be accessible locally for development and testing.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/cms-umbraco-heartcore/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
npm install
npm run dev
```

LANGUAGE: bash
CODE:

```
yarn install
yarn dev
```

---

TITLE: Install MDX dependencies for Next.js App Router
DESCRIPTION: Instructions to install the `@next/mdx` package using npm or yarn specifically for projects built with the Next.js App Router, which requires a slightly different setup.

SOURCE: https://github.com/vercel/next.js/blob/canary/packages/next-mdx/readme.md#_snippet_6

LANGUAGE: Shell
CODE:

```
npm install @next/mdx
```

LANGUAGE: Shell
CODE:

```
yarn add @next/mdx
```

---

TITLE: Bootstrap Next.js App with Prefetching Example
DESCRIPTION: This snippet demonstrates how to quickly set up a new Next.js application pre-configured with the prefetching example. It utilizes `create-next-app` and supports `npm`, `Yarn`, and `pnpm` package managers for project initialization. The command creates a new directory named `with-prefetching-app` containing the example application.

SOURCE: https://github.com/vercel/next.js/blob/canary/examples/with-prefetching/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
npx create-next-app --example with-prefetching with-prefetching-app
```

LANGUAGE: bash
CODE:

```
yarn create next-app --example with-prefetching with-prefetching-app
```

LANGUAGE: bash
CODE:

```
pnpm create next-app --example with-prefetching with-prefetching-app
```
