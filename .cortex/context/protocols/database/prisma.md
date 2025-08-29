========================
CODE SNIPPETS
========================

TITLE: Local Setup and Execution
DESCRIPTION: Installs dependencies, executes the SQL schema, and starts the local development server for the Prisma D1 adapter sandbox. Users can then access the application via a browser.

SOURCE: <https://github.com/prisma/prisma/blob/main/sandbox/d1/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm i
npm run execute -- --file=./sql/schema.sql
npm run start

# type b to open the browser
# or run:
open http://localhost:8787/
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma client, build the Next.js service, and run the application.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/20_monorepo-serverComponents-newGenerator-reExportIndirect-ts/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma client, build the Next.js service, and run the application.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/19_monorepo-noServerComponents-newGenerator-reExportIndirect-ts/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
node .next/standalone/server.js
```

---

TITLE: Prisma Project Setup
DESCRIPTION: Initializes a new Prisma project with a SQLite datasource and creates the necessary project files. This is a prerequisite for testing panic scenarios.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_22>

LANGUAGE: bash
CODE:

```
mkdir artificial-panics && cd artificial-panics
npx prisma init --datasource-provider sqlite
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet includes commands to install project dependencies using pnpm, generate the Prisma client, build the Next.js application, and apply a workaround for a specific issue related to standalone builds.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/6_simplerepo-serverComponents-customOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: General Setup and Build
DESCRIPTION: Steps to clone the Prisma repository, install all dependencies using pnpm, and build the packages. It also includes commands for running development builds and watching for changes.

SOURCE: <https://github.com/prisma/prisma/blob/main/CONTRIBUTING.md#_snippet_1>

LANGUAGE: bash
CODE:

```
git clone https://github.com/prisma/prisma.git
cd prisma
pnpm i
pnpm -r run dev
```

LANGUAGE: bash
CODE:

```
# Build all packages recursively
pnpm -r run build

# Build all packages recursively without running tsc
pnpm -r run dev

# Continuously build modified packages (fastest)
pnpm run watch
```

LANGUAGE: bash
CODE:

```
# Build a specific package
pnpm run build

# Build a specific package without running tsc
pnpm run dev
```

---

TITLE: Install Integration Version
DESCRIPTION: Demonstrates how to install a specific integration version of Prisma from npm. This is useful for testing pre-release or development versions.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_17>

LANGUAGE: bash
CODE:

```
npm install -D prisma@5.3.0-fix-all-the-things.1
```

LANGUAGE: bash
CODE:

```
npx prisma@5.3.0-fix-all-the-things.1
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma schemas, build the Next.js application, and apply a workaround for a specific issue before running the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/8_monorepo-serverComponents-noCustomOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/service && pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma schemas, build the Next.js service, apply a workaround for a Next.js issue, and run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/16_monorepo-serverComponents-customOutput-reExportIndirect/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Execution Commands
DESCRIPTION: This snippet details the commands required to install project dependencies using pnpm, generate the Prisma client, build the Next.js application, apply a workaround for a Next.js issue related to standalone builds, and finally run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/3_simplerepo-noServerComponents-noCustomOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet includes commands to install project dependencies using pnpm, generate the Prisma client, build the Next.js application, and apply a workaround for a known issue in Next.js standalone builds. Finally, it shows how to run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/4_simplerepo-serverComponents-noCustomOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma client, build the Next.js application, apply a workaround for a specific issue in the standalone build, and finally run the server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/13_monorepo-noServerComponents-customOutput-reExportDirect/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
pnpm exec prisma generate
cd packages/service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Execution Commands
DESCRIPTION: This snippet details the sequence of commands required to install project dependencies, generate Prisma schemas, build the Next.js service, apply a specific workaround, and finally run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/17_monorepo-noServerComponents-customOutput-reExportIndirect-ts/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Execution Commands
DESCRIPTION: This snippet details the sequence of commands required to install project dependencies, generate Prisma schemas, build the Next.js service, apply a specific workaround, and finally run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/11_monorepo-noServerComponents-noCustomOutput-reExportIndirect/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Execution Commands
DESCRIPTION: This snippet details the sequence of commands required to install project dependencies, generate Prisma schemas, build the Next.js service, apply a specific workaround, and finally run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/15_monorepo-noServerComponents-customOutput-reExportIndirect/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma schemas, build the Next.js service, apply a workaround for a Next.js issue, and run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/12_monorepo-serverComponents-noCustomOutput-reExportIndirect/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Install Dependencies
DESCRIPTION: Installs or updates project dependencies using pnpm. This is a prerequisite for running tests and other development tasks.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm i
```

---

TITLE: Project Setup and Execution Commands
DESCRIPTION: This snippet details the sequence of commands required to install project dependencies, generate Prisma schemas, build the Next.js application, apply a workaround for a Next.js issue, and finally run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/7_monorepo-noServerComponents-noCustomOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/service && pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma schemas, build the Next.js application, and apply a workaround for a specific issue before running the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/10_monorepo-serverComponents-customOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/service && pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Execution Commands
DESCRIPTION: This snippet details the sequence of commands required to install project dependencies, generate Prisma schemas, build the Next.js application, apply a workaround for a Next.js issue, and finally run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/9_monorepo-noServerComponents-customOutput-noReExport/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/service && pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet details the commands required to install project dependencies, generate Prisma schemas, build the Next.js service, apply a workaround for a Next.js issue, and run the standalone server.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/18_monorepo-serverComponents-customOutput-reExportIndirect-ts/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
cd packages/db && pnpm exec prisma generate
cd ../service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This section details the commands required to install project dependencies, generate the Prisma client, build the Next.js application in the 'packages/service' directory, and execute the standalone server. It includes a specific command to remove a directory to work around a known issue with Next.js standalone builds.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/14_monorepo-serverComponents-customOutput-reExportDirect/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
pnpm install
pnpm exec prisma generate
cd packages/service && pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Prisma Client Local Development Setup
DESCRIPTION: Instructions for setting up a local development environment for Prisma Client. This involves creating a reproduction folder, installing dependencies, syncing the database, and regenerating the client for testing changes.

SOURCE: <https://github.com/prisma/prisma/blob/main/CONTRIBUTING.md#_snippet_2>

LANGUAGE: bash
CODE:

```
cd sandbox
# Copy a template from the reproduction folder
cp -r basic-sqlite my-repro && cd my-repro
# Install dependencies
pnpm install
# Ensure that the db and the schema are synced
pnpm dbpush
# Do some code changes, always re-generate the client, then try it out
pnpm generate && pnpm start
```

---

TITLE: Prisma Migrate Setup
DESCRIPTION: Illustrates the basic commands for setting up and applying database migrations with Prisma Migrate.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/cli/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
# Install Prisma CLI
npm install prisma --save-dev

# Initialize Prisma in your project
# This creates schema.prisma and .env files
# npx prisma init

# Create a new migration
# npx prisma migrate dev --name init

# Apply migrations to the database
# npx prisma migrate deploy
```

---

TITLE: Local Development Setup
DESCRIPTION: Steps to set up a local development environment for Prisma, including copying a template, installing dependencies, and verifying the Prisma version.

SOURCE: <https://github.com/prisma/prisma/blob/main/CONTRIBUTING.md#_snippet_10>

LANGUAGE: sh
CODE:

```
cd sandbox

# Copy a template from the sandbox directory
cp -r basic-sqlite my-project
cd my-project

pnpm install

pnpm prisma -v
# 💡 In any successful setup `pnpm prisma -v` should return
# prisma                  : 0.0.0
# @prisma/client          : 0.0.0
# ...

pnpm prisma generate
```

---

TITLE: Project Setup and Build Commands
DESCRIPTION: This snippet includes essential commands for setting up a project with pnpm, generating the Prisma client, building the Next.js application, and applying a workaround for a specific issue related to standalone builds.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/nextjs-schema-not-found/5_simplerepo-noServerComponents-customOutput-noReExport/README.md#_snippet_0>

LANGUAGE: shell
CODE:

```
pnpm install
pnpm exec prisma generate
pnpm exec next build
rm -fr .next/standalone/node_modules/next # to workaround https://github.com/vercel/next.js/issues/42651
node .next/standalone/server.js
```

---

TITLE: Prisma Migrate Overview
DESCRIPTION: Provides an overview of Prisma Migrate, its purpose as a database schema migration tool, and links to relevant documentation pages for getting started and understanding core concepts.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/migrate/README.md#_snippet_0>

LANGUAGE: en
CODE:

```
Prisma Migrate is an imperative database schema migration tool that enables you to make changes to your database schema. Migrations are auto-generated based on the Prisma schema changes but are fully customizable.

Key documentation links:
- Prisma Migrate: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Add Prisma Migrate to an existing project: https://www.prisma.io/docs/guides/prisma-guides/prisma-migrate-guides/add-prisma-migrate-to-a-project
- Set up a new project from scratch with Prisma Migrate: https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgresql
- Prisma schema: https://www.prisma.io/docs/concepts/components/prisma-schema
- Data model: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model
- Relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations
```

---

TITLE: Prisma Functional Test Suite Setup
DESCRIPTION: Sets up a functional test suite for Prisma using a test matrix. It includes creating a user record and configuring test options like opting out of specific providers or skipDataProxy runtimes.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_11>

LANGUAGE: ts
CODE:

```
import { Providers } from '../_utils/providers'
import testMatrix from './_matrix'

// @ts-ignore at the moment this is necessary for typechecks
declare let prisma: import('./generated/prisma/client').PrismaClient

testMatrix.setupTestSuite(
  (suiteConfig, suiteMeta) => {
    test('create', async () => {
      await prisma.user.create({
        data: {
          // `testEmail` was defined in the example matrix before
          // you can also use a constant here if you don't need
          // unique email per provider
          email: suiteConfig.testEmail,
        },
      })
    })
  },
  {
    optOut: {
      // if you are skipping tests for certain providers, you
      // have to list them here and specify the reason
      from: [Providers.MONGODB],
      reason: 'The test is for SQL databases only',
    },
    skipDataProxy: {
      // similarly, you can opt out of testing with the Data Proxy
      // client (either completely or for certain runtimes) and
      // specify the reason
      runtimes: ['node', 'edge'],
      reason: "This test doesn't work with Data Proxy",
    },
  },
)

```

---

TITLE: Install Packages
DESCRIPTION: Install the necessary packages for the libSQL database client and the Prisma driver adapter.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-libsql/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
npm install @prisma/adapter-libsql
npm install @libsql/client
```

---

TITLE: Install Node.js Dependencies
DESCRIPTION: Installs all necessary Node.js dependencies for the project using pnpm.

SOURCE: <https://github.com/prisma/prisma/blob/main/sandbox/driver-adapters/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm i
```

---

TITLE: Prisma CLI Test Example
DESCRIPTION: Illustrates how to test a specific namespace within the Prisma CLI, referencing the test file for the 'db' namespace.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_3>

LANGUAGE: typescript
CODE:

```
// See how `db` namespace is tested in ./packages/migrate/src/__tests__/DbCommand.test.ts
```

---

TITLE: Jaeger Tracing Export Setup with Prisma
DESCRIPTION: Provides a comprehensive example of setting up tracing for Prisma Client and exporting traces to Jaeger. This includes configuring the OpenTelemetry SDK, setting up an OTLP trace exporter, and registering the PrismaInstrumentation.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/instrumentation/README.md#_snippet_3>

LANGUAGE: ts
CODE:

```
import { context } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { Resource } from '@opentelemetry/resources'
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { PrismaInstrumentation } from '@prisma/instrumentation'

import { PrismaClient } from '.prisma/client'

const contextManager = new AsyncLocalStorageContextManager().enable()

context.setGlobalContextManager(contextManager)

const otlpTraceExporter = new OTLPTraceExporter()

const provider = new BasicTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'test-tracing-service',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  }),
})

provider.addSpanProcessor(new SimpleSpanProcessor(otlpTraceExporter))
provider.register()

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
})

async function main() {
  const prisma = new PrismaClient()

  const email = `user.${Date.now()}@prisma.io`

  await prisma.user.create({
    data: {
      email: email,
    },
  })
}

main()
```

---

TITLE: Install MariaDB Driver Adapter
DESCRIPTION: Installs the @prisma/adapter-mariadb package using npm.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-mariadb/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npm install @prisma/adapter-mariadb
```

---

TITLE: Install @prisma/adapter-pg
DESCRIPTION: Installs the necessary driver adapter package for PostgreSQL using npm.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-pg/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npm install @prisma/adapter-pg
```

---

TITLE: Create Memory Test
DESCRIPTION: Demonstrates how to use the `createMemoryTest` function to set up and run memory tests for Prisma. It includes setup, execution, and cleanup logic, along with configuration options like iterations.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_13>

LANGUAGE: ts
CODE:

```
import { createMemoryTest } from '../_utils/createMemoryTest'

//@ts-ignore
type PrismaModule = typeof import('./.generated/node_modules/@prisma/client')

void createMemoryTest({
  async prepare({ PrismaClient }: PrismaModule) {
    const client = new PrismaClient()
    await client.$connect()
    return client
  },
  async run(client) {
    await client.user.findMany()
  },
  async cleanup(client) {
    await client.$disconnect()
  },
  iterations: 1500,
})
```

---

TITLE: Install Prisma Client
DESCRIPTION: Installs the Prisma Client npm package. This command also triggers the generation of Prisma Client code based on your schema.

SOURCE: <https://github.com/prisma/prisma/blob/main/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm install @prisma/client
```

---

TITLE: Install Dependencies
DESCRIPTION: Installs the Prisma adapter for Neon and the 'ws' package required for WebSocket connections.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-neon/README.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npm install @prisma/adapter-neon
npm install ws
```

---

TITLE: Install MongoDB with Homebrew
DESCRIPTION: Installs the MongoDB community edition using the Homebrew package manager.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/fixtures/mongo/Readme.md#_snippet_0>

LANGUAGE: bash
CODE:

```
brew install mongodb-community
```

---

TITLE: Run MongoDB Server
DESCRIPTION: Starts a MongoDB server instance, specifying the directory for database files.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/fixtures/mongo/Readme.md#_snippet_2>

LANGUAGE: bash
CODE:

```
mongod --dbpath data/db
```

---

TITLE: Prisma Client Usage Example
DESCRIPTION: Demonstrates how to use Prisma Client to interact with a database. This example shows basic data fetching.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/cli/README.md#_snippet_0>

LANGUAGE: typescript
CODE:

```
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@example.com',
      },
    },
  })
  console.log(users)
}

main()
  .catch((e) => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

TITLE: Basic Prisma Client Instrumentation Setup
DESCRIPTION: Demonstrates the basic setup for instrumenting Prisma Client using OpenTelemetry. It involves importing and registering the PrismaInstrumentation with the OpenTelemetry instrumentation registry.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/instrumentation/README.md#_snippet_1>

LANGUAGE: ts
CODE:

```
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { PrismaInstrumentation } from '@prisma/instrumentation'

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
})
```

---

TITLE: Install @prisma/adapter-mssql
DESCRIPTION: Installs the necessary driver adapter package using npm. This command should be run after configuring the Prisma schema.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-mssql/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm install @prisma/adapter-mssql
```

---

TITLE: Prisma Client Generation and Package Installation
DESCRIPTION: Commands to generate Prisma Client and install the necessary adapter and undici packages for Node.js environments.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-planetscale/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
npx prisma generate

npm install @prisma/adapter-planetscale
npm install undici
```

---

TITLE: Starting the Prisma MCP Server
DESCRIPTION: This command starts the local CLI MCP server for Prisma. This server wraps CLI commands to work with LLMs and AI code editors, requiring local file access.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/cli/src/mcp/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npx prisma mcp
```

---

TITLE: Running Benchmark Tests
DESCRIPTION: Commands to install dependencies, build the project, and execute the test suite with options for updating snapshots and filtering tests.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/type-benchmark-tests/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
pnpm install
pnpm -r dev
pnpm test
pnpm test:update
pnpm test <filter>
pnpm test:update <filter>
```

---

TITLE: Install @prisma/instrumentation
DESCRIPTION: Installs the @prisma/instrumentation package using npm. This package is essential for integrating OpenTelemetry tracing with Prisma Client.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/instrumentation/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm install @prisma/instrumentation
```

---

TITLE: Prisma PostgreSQL Typed SQL Input Examples
DESCRIPTION: Showcases examples of using typed SQL with PostgreSQL in Prisma, specifically focusing on the input handling for 'Time' data types.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg.txt#_snippet_6>

LANGUAGE: js_pg
CODE:

```
typed-sql.postgres-lists.test (provider=postgresql, js_pg) Time - input
```

LANGUAGE: js_pg
CODE:

```
typed-sql.postgres-scalars-nullable.test (provider=postgresql, js_pg) Time - input
```

LANGUAGE: js_pg
CODE:

```
typed-sql.postgres-scalars.test (provider=postgresql, js_pg) Time - input
```

---

TITLE: Prisma Client Setup with PlanetScale Adapter
DESCRIPTION: Demonstrates how to initialize Prisma Client using the PlanetScale driver adapter, including handling custom fetch implementations for older Node.js versions.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-planetscale/README.md#_snippet_1>

LANGUAGE: ts
CODE:

```
// Import needed packages
import { PrismaPlanetScale } from '@prisma/adapter-planetscale'
import { PrismaClient } from '@prisma/client'
import { fetch as undiciFetch } from 'undici'

// Setup
const connectionString = `${process.env.DATABASE_URL}`

// Init prisma client
const adapter = new PrismaPlanetScale({ url: connectionString, fetch: undiciFetch })
const prisma = new PrismaClient({ adapter })

// Use Prisma Client as normal

```

---

TITLE: Start Docker Compose Services
DESCRIPTION: Commands to start Docker Compose services in detached mode (background) or attached mode (streaming logs). Includes starting specific services.

SOURCE: <https://github.com/prisma/prisma/blob/main/docker/README.md#_snippet_2>

LANGUAGE: sh
CODE:

```
docker compose up -d
docker compose up -d mysql
docker compose logs -f mysql
docker compose up
docker compose up mysql
```

---

TITLE: Prisma Metrics Collection (MySQL/PlanetScale)
DESCRIPTION: Demonstrates how to enable and collect database query metrics using Prisma with MySQL and PlanetScale, showing output in both JSON and Prometheus formats, before and after queries, and handling multiple client instances.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_planetscale.txt#_snippet_5>

LANGUAGE: javascript
CODE:

```
const { PrismaClient } = require('@prisma/client');

// Enable metrics globally
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'], datasourceUrl: process.env.DATABASE_URL });

async function collectMetrics() {
  try {
    // Metrics before query
    console.log('Metrics before query (JSON):', await prisma.$metrics.json());
    console.log('Metrics before query (Prometheus):', await prisma.$metrics.prometheus());

    // Perform a query
    await prisma.user.findMany({ take: 1 });

    // Metrics after query
    console.log('Metrics after query (JSON):', await prisma.$metrics.json());
    console.log('Metrics after query (Prometheus):', await prisma.$metrics.prometheus());

    // Example with multiple instances
    const prisma2 = new PrismaClient({ log: ['query'], datasourceUrl: process.env.DATABASE_URL });
    await prisma2.user.findMany({ take: 1 });
    console.log('Metrics for second instance (JSON):', await prisma2.$metrics.json());
    await prisma2.$disconnect();

  } catch (error) {
    console.error('Error collecting metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

collectMetrics();
```

---

TITLE: Prisma Full-Text Search (MySQL/PlanetScale)
DESCRIPTION: Illustrates how to perform full-text searches using Prisma with MySQL and PlanetScale. This example shows a basic implementation for searching within text fields.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_planetscale.txt#_snippet_1>

LANGUAGE: javascript
CODE:

```
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullTextSearch(searchTerm) {
  try {
    const results = await prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      }
    });
    console.log(results);
  } catch (error) {
    console.error('Error performing full-text search:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fullTextSearch('example');
```

---

TITLE: Trigger Query Engine Panic (Get Config)
DESCRIPTION: This command triggers a panic in the Query Engine when fetching its configuration via `prisma validate`. It aids in testing the Query Engine's configuration handling under error conditions.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_21>

LANGUAGE: bash
CODE:

```
FORCE_PANIC_QUERY_ENGINE_GET_CONFIG=1 npx prisma validate
```

---

TITLE: Unsupported Action Handling
DESCRIPTION: Shows how Prisma handles unsupported actions or methods when interacting with CockroachDB. This example serves as a placeholder for demonstrating error scenarios with unsupported operations.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg_cockroachdb.txt#_snippet_7>

LANGUAGE: javascript
CODE:

```
// Example of an unsupported method call (this would likely throw an error)
// await prisma.unsupportedMethod.someAction();
```

---

TITLE: Full-Text Search with CockroachDB
DESCRIPTION: Illustrates performing full-text searches using Prisma with CockroachDB. This example focuses on constructing effective queries for text-based searching.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg_cockroachdb.txt#_snippet_1>

LANGUAGE: javascript
CODE:

```
prisma.post.findMany({
  where: {
    title: {
      search: 'prisma'
    }
  }
});
```

---

TITLE: Basic Database Query Example
DESCRIPTION: An example of performing a basic database query using the Prisma TypeScript client to fetch user data. This showcases the type-safe query builder.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/e2e/ts-client/node-tsup-esm/readme.md#_snippet_1>

LANGUAGE: typescript
CODE:

```
async function getUsers() {
  const users = await prisma.user.findMany({
    include: {
      posts: true,
    },
  })
  console.log(users)
}
```

---

TITLE: Running Memory Tests Commands
DESCRIPTION: Provides command-line instructions for running memory tests using pnpm. It covers running the entire test suite or specific tests by name.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_15>

LANGUAGE: bash
CODE:

```
pnpm test:memory
```

LANGUAGE: bash
CODE:

```
pnpm test:memory <test name>
```

---

TITLE: Prisma PostgreSQL Unsupported Action Handling
DESCRIPTION: Demonstrates how Prisma handles unsupported actions or methods when interacting with PostgreSQL.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg.txt#_snippet_7>

LANGUAGE: js_pg
CODE:

```
unsupported-action (provider=postgresql, js_pg) unsupported method
```

---

TITLE: Prisma Unsupported Action Handling (MySQL/PlanetScale)
DESCRIPTION: Illustrates how Prisma handles unsupported actions or methods when interacting with MySQL and PlanetScale, providing guidance on identifying and managing such scenarios.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_planetscale.txt#_snippet_6>

LANGUAGE: javascript
CODE:

```
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function handleUnsupportedAction() {
  try {
    // Attempting an action that might be unsupported or not yet implemented
    // For example, if a specific database feature isn't mapped in Prisma
    // This is a hypothetical example as Prisma aims for broad support.
    // A more realistic scenario might be calling a method that doesn't exist.
    // await prisma.user.someNonExistentMethod();
    console.log('This is a placeholder for an unsupported action example.');
  } catch (error) {
    console.error('Caught an error, likely due to an unsupported action:', error);
    // Prisma will typically throw a specific error indicating the unsupported operation.
  } finally {
    await prisma.$disconnect();
  }
}

handleUnsupportedAction();
```

---

TITLE: Trigger Query Engine Panic (Get DMMF)
DESCRIPTION: This command triggers a panic in the Query Engine when fetching the DMMF (Database Migration File Format) via `prisma validate`. Useful for testing Query Engine's DMMF generation robustness.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_20>

LANGUAGE: bash
CODE:

```
FORCE_PANIC_QUERY_ENGINE_GET_DMMF=1 npx prisma validate
```

---

TITLE: Prisma PostgreSQL Full-Text Search
DESCRIPTION: Illustrates performing full-text searches in PostgreSQL with Prisma. This example highlights a potentially 'bad query' scenario.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg.txt#_snippet_1>

LANGUAGE: js_pg
CODE:

```
fulltext-search (provider=postgresql, js_pg) bad query
```

---

TITLE: Prisma findFirstOrThrow/findUniqueOrThrow with Transactions (MySQL/PlanetScale)
DESCRIPTION: Shows how `findFirstOrThrow` and `findUniqueOrThrow` methods in Prisma work correctly within database transactions when using MySQL and PlanetScale.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_planetscale.txt#_snippet_4>

LANGUAGE: javascript
CODE:

```
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOrThrowInTransaction() {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: 'Bob',
          email: 'bob@example.com'
        }
      });

      // Using findUniqueOrThrow within the transaction
      const foundUser = await tx.user.findUniqueOrThrow({
        where: {
          id: createdUser.id
        }
      });

      // Using findFirstOrThrow within the transaction
      const foundFirstUser = await tx.user.findFirstOrThrow({
        where: {
          name: 'Bob'
        }
      });

      return { createdUser, foundUser, foundFirstUser };
    });
    console.log('Found users in transaction:', result);
  } catch (error) {
    console.error('Error during transaction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findOrThrowInTransaction();
```

---

TITLE: Running All Tests
DESCRIPTION: This command executes all tests within the project using the pnpm test runner. It's the standard way to ensure the entire project is functioning correctly.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_4>

LANGUAGE: bash
CODE:

```
pnpm run test
```

---

TITLE: Install Global Dependencies
DESCRIPTION: Commands to install essential global dependencies for contributing to Prisma, including nvm for Node.js version management, pnpm for package management, and ts-node for running TypeScript scripts.

SOURCE: <https://github.com/prisma/prisma/blob/main/CONTRIBUTING.md#_snippet_0>

LANGUAGE: bash
CODE:

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install 18
npm install --global pnpm@9 ts-node
```

---

TITLE: Creating a New Functional Test
DESCRIPTION: This command initiates the process of creating a new functional test for the Prisma Client. It prompts for the test name and the providers to test against.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_6>

LANGUAGE: bash
CODE:

```
pnpm new-test
```

---

TITLE: Install Dependencies
DESCRIPTION: Installs the necessary packages for using Prisma with Cloudflare D1, including Prisma Client, the D1 adapter, Prisma CLI, and Cloudflare Workers types.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-d1/README.md#_snippet_1>

LANGUAGE: sh
CODE:

```
npm install @prisma/client
npm install @prisma/adapter-d1
npm install --save-dev prisma
npm install --save-dev @cloudflare/workers-types
npm install --save-dev wrangler
```

---

TITLE: Prisma Client Initialization with D1 Adapter (JavaScript)
DESCRIPTION: Initializes Prisma Client with the `PrismaD1` adapter in a Cloudflare Worker using JavaScript. It shows the setup for connecting to D1 and running a Prisma query.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/adapter-d1/README.md#_snippet_4>

LANGUAGE: javascript
CODE:

```
// Import needed packages
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

export default {
  async fetch(request, env, ctx) {
    // Setup Prisma Client with the adapter
    const adapter = new PrismaD1(env.MY_DATABASE)
    const prisma = new PrismaClient({ adapter })

    // Execute a Prisma Client query
    const usersCount = await prisma.user.count()

    // Return result
    return new Response(usersCount)
  },
}
```

---

TITLE: CI Workflow Trigger Commands
DESCRIPTION: Explains how to trigger specific CI workflows or commands within a GitHub Actions environment by commenting on a Pull Request.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_16>

LANGUAGE: yaml
CODE:

```
/engine-branch branchName
```

LANGUAGE: yaml
CODE:

```
ci test all
```

---

TITLE: Running Tests for a Single Command
DESCRIPTION: This command allows you to run tests specifically for a single command, identified by its name. This is useful for targeted testing during development.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_5>

LANGUAGE: bash
CODE:

```
pnpm run test init
```

---

TITLE: Run Specific Integration Tests
DESCRIPTION: Demonstrates how to use Jest's `-t` flag to run a subset of integration tests, specifically targeting 'findOne where PK' cases for SQLite.

SOURCE: <https://github.com/prisma/prisma/blob/main/TESTING.md#_snippet_2>

LANGUAGE: sh
CODE:

```
pnpm run jest integration.sqlite -t 'findOne where PK'
```

---

TITLE: findFirstOrThrow and findUniqueOrThrow with Transactions
DESCRIPTION: Demonstrates the compatibility of `findFirstOrThrow` and `findUniqueOrThrow` methods with Prisma transactions when using CockroachDB. Ensures these methods function correctly within transactional contexts.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg_cockroachdb.txt#_snippet_4>

LANGUAGE: javascript
CODE:

```
const user = await prisma.$transaction(async (tx) => {
  return tx.user.findFirstOrThrow({
    where: { id: 1 }
  });
});
```

LANGUAGE: javascript
CODE:

```
const uniqueUser = await prisma.$transaction(async (tx) => {
  return tx.user.findUniqueOrThrow({
    where: { id: 2 }
  });
});
```

---

TITLE: Create Neon Database Project
DESCRIPTION: Creates a new database project using the Neon CLI.

SOURCE: <https://github.com/prisma/prisma/blob/main/sandbox/driver-adapters/README.md#_snippet_7>

LANGUAGE: bash
CODE:

```
npx neonctl projects create
```

---

TITLE: Prisma PostgreSQL Filter Count Relations
DESCRIPTION: Demonstrates how to filter and count related records in PostgreSQL using Prisma. This example focuses on nested relations.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg.txt#_snippet_0>

LANGUAGE: js_pg
CODE:

```
filter-count-relations (provider=postgresql, js_pg) nested relation
```

---

TITLE: Get Binary Target for Current Platform
DESCRIPTION: Retrieves the binary target identifier for the current operating system and architecture. This is useful for determining which Prisma binary to download and use.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/get-platform/README.md#_snippet_0>

LANGUAGE: ts
CODE:

```
import { getBinaryTargetForCurrentPlatform } from '@prisma/get-platform'

const binaryTarget = await getBinaryTargetForCurrentPlatform()
```

---

TITLE: Filter Count Relations with CockroachDB
DESCRIPTION: Demonstrates how to filter and count related records in Prisma when using CockroachDB. This example highlights nested relation querying capabilities.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg_cockroachdb.txt#_snippet_0>

LANGUAGE: javascript
CODE:

```
prisma.user.findMany({
  where: {
    posts: {
      some: {
        published: true
      }
    }
  },
  include: {
    posts: {
      where: {
        published: true
      },
      select: {
        id: true
      }
    }
  }
});
```

---

TITLE: Prisma Interactive Transactions (MySQL/PlanetScale)
DESCRIPTION: Demonstrates the use of interactive transactions in Prisma with MySQL and PlanetScale, covering batching, rollbacks, and timeout configurations. This allows for atomic operations across multiple database calls.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_planetscale.txt#_snippet_2>

LANGUAGE: javascript
CODE:

```
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function interactiveTransactions() {
  const transaction = await prisma.$transaction.interactive();

  try {
    // Example: Batching operations
    const [user, post] = await transaction.batch([
      transaction.user.create({ data: { name: 'Alice' } }),
      transaction.post.create({ data: { title: 'Hello', authorId: 1 } })
    ]);

    // Example: Rollback
    // await transaction.rollback();

    // Example: Timeout override
    // const result = await transaction.user.findMany({ timeout: 5000 });

    console.log('Transaction successful:', { user, post });
  } catch (error) {
    console.error('Transaction failed:', error);
    // If not explicitly rolled back, Prisma might handle it based on error type
  } finally {
    await prisma.$disconnect();
  }
}

interactiveTransactions();
```

---

TITLE: Metrics Collection with CockroachDB
DESCRIPTION: Illustrates how to enable and retrieve metrics from Prisma when interacting with CockroachDB. Covers both JSON and Prometheus formats, including global labels and behavior before client connection.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg_cockroachdb.txt#_snippet_5>

LANGUAGE: javascript
CODE:

```
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'], metrics: { enabled: true } });

await prisma.user.findMany();

// Get metrics in JSON format
const jsonMetrics = await prisma.$metrics.json();
console.log(jsonMetrics);

// Get metrics in Prometheus format
const prometheusMetrics = await prisma.$metrics.prometheus();
console.log(prometheusMetrics);
```

LANGUAGE: javascript
CODE:

```
const prisma = new PrismaClient({ metrics: { enabled: true, globalLabels: { env: 'test' } } });
await prisma.user.findMany();
const jsonMetrics = await prisma.$metrics.json();
console.log(jsonMetrics);
```

LANGUAGE: javascript
CODE:

```
const prisma = new PrismaClient({ metrics: { enabled: true } });
// Metrics before connection
console.log(await prisma.$metrics.json());
console.log(await prisma.$metrics.prometheus());
```

LANGUAGE: javascript
CODE:

```
const prisma1 = new PrismaClient({ metrics: { enabled: true } });
const prisma2 = new PrismaClient({ metrics: { enabled: true } });

await prisma1.user.findMany();
await prisma2.post.findMany();

console.log('Prisma 1 metrics:', await prisma1.$metrics.json());
console.log('Prisma 2 metrics:', await prisma2.$metrics.json());
```

---

TITLE: Prisma PostgreSQL Method Usage with Transactions
DESCRIPTION: Demonstrates the correct usage of `findFirstOrThrow` and `findUniqueOrThrow` methods in Prisma with PostgreSQL, specifically when operating within transactions.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg.txt#_snippet_4>

LANGUAGE: js_pg
CODE:

```
methods.findFirstOrThrow (provider=postgresql, js_pg) works with transactions
```

LANGUAGE: js_pg
CODE:

```
methods.findUniqueOrThrow (provider=postgresql, js_pg) works with transactions
```

---

TITLE: Generate Dependency Graph
DESCRIPTION: This command generates a dependency graph for the project using a TypeScript script. Ensure GraphViz is installed for this to work.

SOURCE: <https://github.com/prisma/prisma/blob/main/ARCHITECTURE.md#_snippet_0>

LANGUAGE: typescript
CODE:

```
ts-node scripts/graph-dependencies.ts
```

---

TITLE: Prisma PostgreSQL Metrics Collection
DESCRIPTION: Details the metrics collection capabilities in Prisma for PostgreSQL, showing how metrics are enabled, formatted (JSON and Prometheus), and how they behave before and after queries, including handling of multiple client instances and empty metric calls.

SOURCE: <https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/client-engine-known-failures-js_pg.txt#_snippet_5>

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) after a query includes global labels in json format
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) after a query includes global labels in prometheus format
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) after a query returns metrics in json format
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) after a query returns metrics in prometheus format
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) before a query SQL Providers: should have the same keys, before and after a query
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) empty $metrics.json() does not crash before client is connected
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) empty $metrics.prometheus() does not crash before client is connected
```

LANGUAGE: js_pg
CODE:

```
metrics.enabled (provider=postgresql, js_pg) multiple instances does not share metrics between 2 different instances of client
```
