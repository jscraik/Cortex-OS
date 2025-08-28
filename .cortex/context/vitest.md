========================
CODE SNIPPETS
========================

TITLE: Vitest Project Configuration
DESCRIPTION: Configure Vitest to support multiple project configurations within a single repository. Define projects using glob patterns or specific configuration objects, specifying environments and setup files.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_8>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // you can use a list of glob patterns to define your projects
      // Vitest expects a list of config files
      // or directories where there is a config file
      'packages/*',
      'tests/*/vitest.config.{e2e,unit}.ts',
      // you can even run the same tests,
      // but with different configs in the same "vitest" process
      {
        test: {
          name: 'happy-dom',
          root: './shared_tests',
          environment: 'happy-dom',
          setupFiles: ['./setup.happy-dom.ts'],
        },
      },
      {
        test: {
          name: 'node',
          root: './shared_tests',
          environment: 'node',
          setupFiles: ['./setup.node.ts'],
        },
      },
    ],
  },
})
```

---

TITLE: Build and Link Vitest Locally
DESCRIPTION: Instructions for cloning the Vitest repository, installing dependencies using pnpm, building the Vitest package, and linking it globally for local testing of modifications. This process allows developers to test their changes before contributing or using unreleased versions.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_11>

LANGUAGE: bash
CODE:

```
git clone https://github.com/vitest-dev/vitest.git
cd vitest
pnpm install
cd packages/vitest
pnpm run build
pnpm link --global # you can use your preferred package manager for this step
```

---

TITLE: Vitest npm Scripts
DESCRIPTION: Define common testing commands in `package.json` for easy execution. Includes scripts for running tests and generating code coverage reports.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_9>

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "test": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

---

TITLE: Install and Build wasm-bindgen Example
DESCRIPTION: Steps to install dependencies and build the `hello_world` example from wasm-bindgen. This includes copying the `pkg` directory and configuring `package.json` for module support.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/test/core/src/wasm/wasm-bindgen-no-cyclic/README.md#_snippet_0>

LANGUAGE: sh
CODE:

```
npm i
npm run build
# then
# 1. copy `examples/hello_world/pkg` to this directory
# 2. add { "type": "module" } to `package.json`
#    (this will be automatically included after https://github.com/rustwasm/wasm-pack/pull/1061)
```

---

TITLE: Vitest Test Execution Output
DESCRIPTION: Example output displayed in the terminal after successfully running Vitest tests. It shows the number of passed tests and the total duration.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_3>

LANGUAGE: txt
CODE:

```
✓ sum.test.js (1)
  ✓ adds 1 + 2 to equal 3

Test Files  1 passed (1)
     Tests  1 passed (1)
  Start at  02:15:44
  Duration  311ms
```

---

TITLE: Global Setup with Provide Example
DESCRIPTION: Illustrates using the `provide` method within a global setup file to pass serializable data to tests. Shows examples for Vitest versions 3.0.0+ and 2.0.0+.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_43>

LANGUAGE: ts
CODE:

```
import type { TestProject } from 'vitest/node'

export default function setup(project: TestProject) {
  project.provide('wsPort', 3000)
}

declare module 'vitest' {
  export interface ProvidedContext {
    wsPort: number
  }
}
```

LANGUAGE: ts
CODE:

```
import type { GlobalSetupContext } from 'vitest/node'

export default function setup({ provide }: GlobalSetupContext) {
  provide('wsPort', 3000)
}

declare module 'vitest' {
  export interface ProvidedContext {
    wsPort: number
  }
}
```

LANGUAGE: ts
CODE:

```
import { inject } from 'vitest'

inject('wsPort') === 3000
```

---

TITLE: Execute Vitest Standalone CLI Commands
DESCRIPTION: Examples of using the Vitest CLI to start in standalone mode or run specific test files immediately. These commands leverage the package.json script.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md#_snippet_5>

LANGUAGE: bash
CODE:

```
# Start Vitest in standalone mode, without running any files on start
$ pnpm run test:dev

# Run math.test.ts immediately
$ pnpm run test:dev math.test.ts
```

---

TITLE: Add Vitest to Project (npm, yarn, pnpm, bun)
DESCRIPTION: Installs Vitest as a development dependency using various package managers. Ensure you have Node.js >=v18.0.0 and Vite >=v5.0.0 installed.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm install -D vitest
```

LANGUAGE: bash
CODE:

```
yarn add -D vitest
```

LANGUAGE: bash
CODE:

```
pnpm add -D vitest
```

LANGUAGE: bash
CODE:

```
bun add -D vitest
```

---

TITLE: Basic Vitest Configuration
DESCRIPTION: Configure Vitest using `vitest.config.ts` when not using Vite or for standalone Vitest setups. This file allows defining test-specific options.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_4>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ...
  },
})
```

---

TITLE: Inheriting Configuration Example
DESCRIPTION: An example showing how browser configurations inherit options from the root config, including setup files and testerHtmlPath.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/config.md#_snippet_3>

LANGUAGE: typescript
CODE:

```
export default defineConfig({
  test: {
    setupFile: ['./root-setup-file.js'],
    browser: {
      enabled: true,
      testerHtmlPath: './custom-path.html',
      instances: [
        {
          // will have both setup files: "root" and "browser"
          setupFile: ['./browser-setup-file.js'],
          // implicitly has "testerHtmlPath" from the root config
        },
      ],
    },
  },
})
```

---

TITLE: Install DOM Mocking Environments
DESCRIPTION: Instructions for installing and configuring DOM mocking environments like happy-dom or jsdom for Vitest. These libraries are not included by default and need separate installation.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/features.md#_snippet_4>

LANGUAGE: bash
CODE:

```
npm i -D happy-dom
```

LANGUAGE: bash
CODE:

```
npm i -D jsdom
```

---

TITLE: Initialize Vitest Browser Mode
DESCRIPTION: Initializes Vitest browser mode, installing required dependencies and creating browser configuration. This command simplifies the setup process for running tests in a browser environment.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_0>

LANGUAGE: npm
CODE:

```
npx vitest init browser
```

LANGUAGE: yarn
CODE:

```
yarn exec vitest init browser
```

LANGUAGE: pnpm
CODE:

```
pnpx vitest init browser
```

LANGUAGE: bun
CODE:

```
bunx vitest init browser
```

---

TITLE: Configure package.json for Testing
DESCRIPTION: Adds a script to your package.json file to easily run Vitest tests using your preferred package manager. This allows you to execute tests with commands like `npm run test`.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_2>

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "test": "vitest"
  }
}
```

---

TITLE: Vitest In-Source Test Example
DESCRIPTION: Demonstrates how to write Vitest tests directly within a source file using `import.meta.vitest`. Includes an example `add` function and its corresponding test suite.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/in-source.md#_snippet_0>

LANGUAGE: ts
CODE:

```
// the implementation
export function add(...args: number[]) {
  return args.reduce((a, b) => a + b, 0)
}

// in-source test suites
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('add', () => {
    expect(add()).toBe(0)
    expect(add(1)).toBe(1)
    expect(add(1, 2, 3)).toBe(6)
  })
}
```

---

TITLE: Filtering Configuration Examples
DESCRIPTION: Illustrates different `vitest.config.ts` configurations for project filtering, showing how manual naming interacts with default browser names for project selection.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/multiple-setups.md#_snippet_3>

LANGUAGE: ts
CODE:

```
export default defineConfig({
  test: {
    browser: {
      instances: [
        // name: chromium
        { browser: 'chromium' },
        // name: custom
        { browser: 'firefox', name: 'custom' },
      ]
    }
  }
})
```

LANGUAGE: ts
CODE:

```
export default defineConfig({
  test: {
    name: 'custom',
    browser: {
      instances: [
        // name: custom (chromium)
        { browser: 'chromium' },
        // name: manual
        { browser: 'firefox', name: 'manual' },
      ]
    }
  }
})
```

---

TITLE: Install Vitest Coverage Packages
DESCRIPTION: Installs the necessary packages for Vitest code coverage. Choose `@vitest/coverage-v8` for V8 support or `@vitest/coverage-istanbul` for Istanbul support. These are typically installed as development dependencies.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/coverage.md#_snippet_1>

LANGUAGE: bash
CODE:

```
npm i -D @vitest/coverage-v8
```

LANGUAGE: bash
CODE:

```
npm i -D @vitest/coverage-istanbul
```

---

TITLE: Vite Config with Vitest Config Types
DESCRIPTION: Use the modern approach to reference Vitest configuration types in `vite.config.ts` by importing `vitest/config`. This is recommended for newer versions of Vitest.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_6>

LANGUAGE: typescript
CODE:

```
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // ... Specify options here.
  },
})
```

---

TITLE: Vitest Benchmarking Example
DESCRIPTION: Provides an example of writing benchmark tests using Vitest's `bench` and `describe` functions, powered by Tinybench. It compares the performance of sorting an array in normal and reverse order.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/features.md#_snippet_8>

LANGUAGE: ts
CODE:

```
import { bench, describe } from 'vitest'

describe('sort', () => {
  bench('normal', () => {
    const x = [1, 5, 4, 2, 3]
    x.sort((a, b) => {
      return a - b
    })
  })

  bench('reverse', () => {
    const x = [1, 5, 4, 2, 3]
    x.reverse().sort((a, b) => {
      return a - b
    })
  })
})
```

---

TITLE: Write a Simple Sum Test
DESCRIPTION: Demonstrates writing a basic test for a JavaScript function. The test file should typically end with `.test.` or `.spec.` to be recognized by Vitest.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_1>

LANGUAGE: js
CODE:

```
export function sum(a, b) {
  return a + b
}
```

LANGUAGE: js
CODE:

```
import { expect, test } from 'vitest'
import { sum } from './sum.js'

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
```

---

TITLE: Wait for Server to Start
DESCRIPTION: Example demonstrating how to use `vi.waitFor` to ensure a server has started successfully before proceeding with assertions. It checks a `server.isReady` flag and throws an error if the server is not ready within the specified timeout.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/api/vi.md#_snippet_27>

LANGUAGE: typescript
CODE:

```
import { expect, test, vi } from 'vitest'
import { createServer } from './server.js'

test('Server started successfully', async () => {
  const server = createServer()

  await vi.waitFor(
    () => {
      if (!server.isReady) {
        throw new Error('Server not started')
      }

      console.log('Server started')
    },
    {
      timeout: 500, // default is 1000
      interval: 20, // default is 50
    }
  )
  expect(server.isReady).toBe(true)
})
```

---

TITLE: Vue Snapshot Setup with Vitest
DESCRIPTION: To use Vue snapshots with Vitest, similar to Jest with vue-cli presets, install `jest-serializer-vue` and add it to your `setupFiles` in `vite.config.js`. This ensures snapshots are rendered correctly without excessive escaping.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md#_snippet_18>

LANGUAGE: js
CODE:

```
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    setupFiles: ['./tests/unit/setup.js']
  }
})
```

LANGUAGE: js
CODE:

```
import vueSnapshotSerializer from 'jest-serializer-vue'

expect.addSnapshotSerializer(vueSnapshotSerializer)
```

---

TITLE: Mocking System Time with vi.setSystemTime
DESCRIPTION: This example demonstrates how to control system time using Vitest's `vi.useFakeTimers()` and `vi.setSystemTime()`. It shows how to set a specific date and time to ensure consistent test results for time-dependent logic. It requires importing `vi` from `vitest` and using `beforeEach` and `afterEach` for setup and cleanup.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking.md#_snippet_0>

LANGUAGE: js
CODE:

```
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const businessHours = [9, 17]

function purchase() {
  const currentHour = new Date().getHours()
  const [open, close] = businessHours

  if (currentHour > open && currentHour < close) {
    return { message: 'Success' }
  }

  return { message: 'Error' }
}

describe('purchasing flow', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers()
  })

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  it('allows purchases within business hours', () => {
    // set hour within business hours
    const date = new Date(2000, 1, 1, 13)
    vi.setSystemTime(date)

    // access Date.now() will result in the date set above
    expect(purchase()).toEqual({ message: 'Success' })
  })

  it('disallows purchases outside of business hours', () => {
    // set hour outside business hours
    const date = new Date(2000, 1, 1, 19)
    vi.setSystemTime(date)

    // access Date.now() will result in the date set above
    expect(purchase()).toEqual({ message: 'Error' })
  })
})
```

---

TITLE: Vitest Snapshot Client Usage Example
DESCRIPTION: Demonstrates the usage of `@vitest/snapshot`'s `SnapshotClient` for creating and managing Jest-style snapshots. It covers initializing the client with custom equality checks, using `NodeSnapshotEnvironment` for file operations, and asserting snapshots both inline and in files. Includes examples for starting and finishing a run, and managing multiple results with `SnapshotManager`.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/packages/snapshot/README.md#_snippet_0>

LANGUAGE: javascript
CODE:

```
import { SnapshotClient } from '@vitest/snapshot'
import { NodeSnapshotEnvironment } from '@vitest/snapshot/environment'
import { SnapshotManager } from '@vitest/snapshot/manager'

const client = new SnapshotClient({
  // you need to provide your own equality check implementation if you use it
  // this function is called when `.toMatchSnapshot({ property: 1 })` is called
  isEqual: (received, expected) =>
    equals(received, expected, [iterableEquality, subsetEquality]),
})

// class that implements snapshot saving and reading
// by default uses fs module, but you can provide your own implementation depending on the environment
const environment = new NodeSnapshotEnvironment()

// you need to implement this yourselves,
// this depends on your runner
function getCurrentFilepath() {
  return '/file.spec.js'
}
function getCurrentTestName() {
  return 'test1'
}

// example for inline snapshots, nothing is required to support regular snapshots,
// just call `assert` with `isInline: false`
function wrapper(received) {
  function __INLINE_SNAPSHOT__(inlineSnapshot, message) {
    client.assert({
      received,
      message,
      isInline: true,
      inlineSnapshot,
      filepath: getCurrentFilepath(),
      name: getCurrentTestName(),
    })
  }
  return {
    // the name is hard-coded, it should be inside another function, so Vitest can find the actual test file where it was called (parses call stack trace + 2)
    // you can override this behaviour in SnapshotState's `_inferInlineSnapshotStack` method by providing your own SnapshotState to SnapshotClient constructor
    toMatchInlineSnapshot: (...args) => __INLINE_SNAPSHOT__(...args),
  }
}

const options = {
  updateSnapshot: 'new',
  snapshotEnvironment: environment,
}

await client.startCurrentRun(
  getCurrentFilepath(),
  getCurrentTestName(),
  options
)

// this will save snapshot to a file which is returned by "snapshotEnvironment.resolvePath"
client.assert({
  received: 'some text',
  isInline: false,
})

// uses "pretty-format", so it requires quotes
// also naming is hard-coded when parsing test files
wrapper('text 1').toMatchInlineSnapshot()
wrapper('text 2').toMatchInlineSnapshot('"text 2"')

const result = await client.finishCurrentRun() // this saves files and returns SnapshotResult

// you can use manager to manage several clients
const manager = new SnapshotManager(options)
manager.add(result)

// do something
// and then read the summary

console.log(manager.summary)

```

---

TITLE: Install Vitest UI (bash)
DESCRIPTION: Installs the Vitest UI package as a development dependency using npm. This package provides the interactive UI for Vitest.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/ui.md#_snippet_0>

LANGUAGE: bash
CODE:

```
npm i -D @vitest/ui
```

---

TITLE: Vitest CLI: Benchmarking and Initialization
DESCRIPTION: The `vitest bench` command is used to run benchmark tests for performance comparisons. The `vitest init <name>` command helps set up project configuration, currently supporting the `browser` value for browser-specific setups.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/cli.md#_snippet_4>

LANGUAGE: bash
CODE:

```
vitest bench
vitest init browser
```

---

TITLE: Vitest Configuration Example
DESCRIPTION: Example of how to configure Vitest using defineConfig, demonstrating the structure for setting pool options.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_30>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      vmForks: {
        // VM forks related options here
      }
    }
  }
})
```

---

TITLE: Mock Service Worker (MSW) Setup
DESCRIPTION: Configure Mock Service Worker to intercept and mock network requests in Vitest. Supports HTTP, GraphQL, and WebSocket protocols. Includes setup for starting, closing, and resetting the mock server.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking.md#_snippet_10>

LANGUAGE: js
CODE:

```
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const posts = [
  {
    userId: 1,
    id: 1,
    title: 'first post title',
    body: 'first post body',
  },
  // ...
]

export const restHandlers = [
  http.get('https://rest-endpoint.example/path/to/posts', () => {
    return HttpResponse.json(posts)
  }),
]

const server = setupServer(...restHandlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())
```

LANGUAGE: js
CODE:

```
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { graphql, HttpResponse } from 'msw'

const posts = [
  {
    userId: 1,
    id: 1,
    title: 'first post title',
    body: 'first post body',
  },
  // ...
]

const graphqlHandlers = [
  graphql.query('ListPosts', () => {
    return HttpResponse.json({
      data: { posts },
    })
  }),
]

const server = setupServer(...graphqlHandlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())
```

LANGUAGE: js
CODE:

```
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { ws } from 'msw'

const chat = ws.link('wss://chat.example.com')

const wsHandlers = [
  chat.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      console.log('Received message from client:', event.data)
      // Echo the received message back to the client
      client.send(`Server received: ${event.data}`)
    })
  }),
]

const server = setupServer(...wsHandlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())
```

---

TITLE: Configure Different Browser Setups
DESCRIPTION: Demonstrates setting up distinct configurations for browser instances, including custom setup files and injected values. This allows for varied test environments within the same Vitest run.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/multiple-setups.md#_snippet_1>

LANGUAGE: ts
CODE:

```
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        {
          browser: 'chromium',
          name: 'chromium-1',
          setupFiles: ['./ratio-setup.ts'],
          provide: {
            ratio: 1,
          }
        },
        {
          browser: 'chromium',
          name: 'chromium-2',
          provide: {
            ratio: 2,
          }
        },
      ],
    },
  },
})
```

LANGUAGE: ts
CODE:

```
import { expect, inject, test } from 'vitest'
import { globalSetupModifier } from './example.js'

test('ratio works', () => {
  expect(inject('ratio') * globalSetupModifier).toBe(14)
})
```

---

TITLE: Vitest Docblock Environment Example
DESCRIPTION: Example of setting the testing environment using a JSDoc style comment.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_21>

LANGUAGE: javascript
CODE:

```
/**
 * @vitest-environment jsdom
 */

test('use jsdom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

---

TITLE: Manually Install Vitest Browser Mode
DESCRIPTION: Manually installs Vitest and the browser mode package. By default, it reuses the existing browser without needing an E2E provider for local testing.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_1>

LANGUAGE: npm
CODE:

```
npm install -D vitest @vitest/browser
```

LANGUAGE: yarn
CODE:

```
yarn add -D vitest @vitest/browser
```

LANGUAGE: pnpm
CODE:

```
pnpm add -D vitest @vitest/browser
```

LANGUAGE: bun
CODE:

```
bun add -D vitest @vitest/browser
```

---

TITLE: Basic Shell Echo Example
DESCRIPTION: Demonstrates a simple shell command to print text to the console. This snippet is part of the project's configuration or examples.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/test/snapshots/test/fixtures/file/snapshot-2.txt#_snippet_0>

LANGUAGE: shell
CODE:

```
{
  echo "hello"
}
```

---

TITLE: Vitest Browser: Qwik Component Testing
DESCRIPTION: Illustrates testing a Qwik component with Vitest Browser. The example shows rendering, simulating user interaction via button clicks, and verifying that the expected content is displayed.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_17>

LANGUAGE: tsx
CODE:

```
import { render } from 'vitest-browser-qwik'
import Greeting from './greeting'

test('greeting appears on click', async () => {
  // renderSSR and renderHook are also available
  const screen = render(<Greeting />)

  const button = screen.getByRole('button')
  await button.click()
  const greeting = screen.getByText(/hello world/iu)

  await expect.element(greeting).toBeInTheDocument()
})
```

---

TITLE: Interactivity API Example
DESCRIPTION: Illustrates using the `userEvent` utility from `@vitest/browser/context` for simulating user interactions like filling input fields. It also shows the direct `locator.fill` method.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_14>

LANGUAGE: ts
CODE:

```
import { page, userEvent } from '@vitest/browser/context'
await userEvent.fill(page.getByLabelText(/username/i), 'Alice')
// or just locator.fill
await page.getByLabelText(/username/i).fill('Alice')
```

---

TITLE: Vitest Type Testing Example
DESCRIPTION: Demonstrates Vitest's experimental type testing capabilities using the `expect-type` package. It shows how to assert function types, parameter types, and match types using `expectTypeOf` and `assertType`.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/features.md#_snippet_9>

LANGUAGE: ts
CODE:

```
import { assertType, expectTypeOf, test } from 'vitest'
import { mount } from './mount.js'

test('my types work properly', () => {
  expectTypeOf(mount).toBeFunction()
  expectTypeOf(mount).parameter(0).toMatchTypeOf<{ name: string }>()

  // @ts-expect-error name is a string
  assertType(mount({ name: 42 }))
})
```

---

TITLE: Disable Automatic Dependency Installation
DESCRIPTION: Vitest prompts users to install missing dependencies by default. This behavior can be disabled by setting the `VITEST_SKIP_INSTALL_CHECKS` environment variable to `1`. This is useful for CI environments or when manual dependency management is preferred.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_10>

LANGUAGE: shell
CODE:

```
export VITEST_SKIP_INSTALL_CHECKS=1
```

---

TITLE: Start Vitest UI (bash)
DESCRIPTION: Starts Vitest with the `--ui` flag, enabling the interactive development server UI. This requires Vitest to be run in watch mode, which is the default.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/ui.md#_snippet_1>

LANGUAGE: bash
CODE:

```
vitest --ui
```

---

TITLE: Vitest Browser: Marko Component Testing
DESCRIPTION: Provides an example of testing a Marko component with Vitest Browser, leveraging `@marko/testing-library`. It demonstrates rendering a component with props and asserting the rendered output.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_19>

LANGUAGE: ts
CODE:

```
// based on @testing-library/marko API
// https://testing-library.com/docs/marko-testing-library/api

import { render, screen } from '@marko/testing-library'
import Greeting from './greeting.marko'

test('renders a message', async () => {
  const { baseElement } = await render(Greeting, { name: 'Marko' })
  const screen = page.elementLocator(baseElement)
  await expect.element(screen.getByText(/Marko/)).toBeInTheDocument()
  expect(container.firstChild).toMatchInlineSnapshot(`
    <h1>Hello, Marko!</h1>
  `)
})
```

---

TITLE: Vite Config with Vitest Types (Legacy)
DESCRIPTION: Integrate Vitest with an existing Vite project by adding Vitest types to `vite.config.ts` using a triple slash directive. This ensures Vitest can correctly interpret the Vite configuration.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_5>

LANGUAGE: typescript
CODE:

```
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // ...
  },
})
```

---

TITLE: Resolve Configuration Example
DESCRIPTION: Demonstrates using `resolveConfig` to merge custom configurations for Vitest and Vite. This example sets a custom mode, disables the config file, specifies conditions, and provides custom test setup files and pool.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/advanced/api/index.md#_snippet_6>

LANGUAGE: ts
CODE:

```
import { resolveConfig } from 'vitest/node'

// vitestConfig only has resolved "test" properties
const { vitestConfig, viteConfig } = await resolveConfig({
  mode: 'custom',
  configFile: false,
  resolve: {
    conditions: ['custom']
  },
  test: {
    setupFiles: ['/my-setup-file.js'],
    pool: 'threads',
  },
})
```

---

TITLE: Framework Integrations
DESCRIPTION: Examples of rendering components for different JavaScript frameworks (Vue, Svelte, React, Lit) using their respective Vitest browser integration packages. Each snippet demonstrates a typical test flow for that framework.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_15>

LANGUAGE: vue
CODE:

```
import { render } from 'vitest-browser-vue'
import Component from './Component.vue'

test('properly handles v-model', async () => {
  const screen = render(Component)

  // Asserts initial state.
  await expect.element(screen.getByText('Hi, my name is Alice')).toBeInTheDocument()

  // Get the input DOM node by querying the associated label.
  const usernameInput = screen.getByLabelText(/username/i)

  // Type the name into the input. This already validates that the input
  // is filled correctly, no need to check the value manually.
  await usernameInput.fill('Bob')

  await expect.element(screen.getByText('Hi, my name is Bob')).toBeInTheDocument()
})
```

LANGUAGE: svelte
CODE:

```
import { render } from 'vitest-browser-svelte'
import { expect, test } from 'vitest'

import Greeter from './greeter.svelte'

test('greeting appears on click', async () => {
  const screen = render(Greeter, { name: 'World' })

  const button = screen.getByRole('button')
  await button.click()
  const greeting = screen.getByText(/hello world/iu)

  await expect.element(greeting).toBeInTheDocument()
})
```

LANGUAGE: react
CODE:

```
import { render } from 'vitest-browser-react'
import Fetch from './fetch'

test('loads and displays greeting', async () => {
  // Render a React element into the DOM
  const screen = render(<Fetch url="/greeting" />)

  await screen.getByText('Load Greeting').click()
  // wait before throwing an error if it cannot find an element
  const heading = screen.getByRole('heading')

  // assert that the alert message is correct
  await expect.element(heading).toHaveTextContent('hello there')
  await expect.element(screen.getByRole('button')).toBeDisabled()
})
```

LANGUAGE: lit
CODE:

```
import { render } from 'vitest-browser-lit'
import { html } from 'lit'
import './greeter-button'

test('greeting appears on click', async () => {
  // The Lit example is incomplete in the provided text.
```

---

TITLE: Vitest Jest Compatibility Environment Example
DESCRIPTION: Example of setting the testing environment using Jest's compatible docblock syntax.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_23>

LANGUAGE: javascript
CODE:

```
/**
 * @jest-environment jsdom
 */

test('use jsdom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

---

TITLE: Vitest Comment Environment Example
DESCRIPTION: Example of setting the testing environment using a single-line comment.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_22>

LANGUAGE: javascript
CODE:

```
// @vitest-environment happy-dom

test('use happy-dom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

---

TITLE: Run Vitest in Standalone Mode
DESCRIPTION: Configure package.json scripts to run Vitest in standalone mode. This allows for direct execution of test files without a full project setup.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md#_snippet_4>

LANGUAGE: json
CODE:

```
{
  "scripts": {
    "test:dev": "vitest --standalone"
  }
}
```

---

TITLE: Sequence Setup Files Execution Order
DESCRIPTION: Determines the execution order for setup files. Options are 'list' (sequential based on definition) or 'parallel'.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/cli-generated.md#_snippet_19>

LANGUAGE: APIDOC
CODE:

```
CLI: --sequence.setupFiles <order>
Config: sequence.setupFiles

Description: Changes the order in which setup files are executed.
Accepted values: "list", "parallel"
Default: "parallel"
```

---

TITLE: Basic Shell Echo Example
DESCRIPTION: Demonstrates a simple shell command to print text to the console. This snippet is part of the project's configuration or examples.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/test/core/test/snapshot-2.txt#_snippet_0>

LANGUAGE: shell
CODE:

```
{
  echo "hello"
}
```

---

TITLE: Start UI Development Server
DESCRIPTION: Starts the Vitest UI development server. This command is typically run in a separate terminal during development.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/packages/ui/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
nr ui:dev
```

---

TITLE: Use Vitest standalone mode with filename filter
DESCRIPTION: Explains the functionality of Vitest's `--standalone` CLI option when used with a filename filter, allowing Vitest to start running matched files directly.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md#_snippet_3>

LANGUAGE: sh
CODE:

```
# In Vitest v3 and below this command would ignore "math.test.ts" filename filter.
# Vitest will now start running the matched files when --standalone is used with filename filter.
```

---

TITLE: Merging Vite and Vitest Configurations
DESCRIPTION: Combine Vite and Vitest configurations when using separate files. The `mergeConfig` utility from `vitest/config` allows merging Vite's configuration with Vitest's specific settings.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md#_snippet_7>

LANGUAGE: typescript
CODE:

```
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mjs'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    // ...
  },
}))
```

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [Vue()],
})
```

---

TITLE: Vitest Project Group Order Example
DESCRIPTION: Example configuration showing how to set `groupOrder` for multiple Vitest projects to control their execution sequence.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_75>

LANGUAGE: ts
CODE:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'slow',
          sequence: {
            groupOrder: 0,
          },
        },
      },
      {
        test: {
          name: 'fast',
          sequence: {
            groupOrder: 0,
          },
        },
      },
      {
        test: {
          name: 'flaky',
          sequence: {
            groupOrder: 1,
          },
        },
      },
    ],
  },
})
```

---

TITLE: Install Vitest Browser Mode with Playwright
DESCRIPTION: Installs Vitest, the browser mode package, and Playwright for running tests in CI or locally. Playwright is recommended for its parallel execution and use of Chrome DevTools Protocol.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_2>

LANGUAGE: npm
CODE:

```
npm install -D vitest @vitest/browser playwright
```

LANGUAGE: yarn
CODE:

```
yarn add -D vitest @vitest/browser playwright
```

LANGUAGE: pnpm
CODE:

```
pnpm add -D vitest @vitest/browser playwright
```

LANGUAGE: bun
CODE:

```
bun add -D vitest @vitest/browser playwright
```

---

TITLE: Install Vitest Browser Mode with WebdriverIO
DESCRIPTION: Installs Vitest, the browser mode package, and WebdriverIO for running tests using the WebDriver protocol. This is an alternative to Playwright for browser testing.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md#_snippet_3>

LANGUAGE: npm
CODE:

```
npm install -D vitest @vitest/browser webdriverio
```

LANGUAGE: yarn
CODE:

```
yarn add -D vitest @vitest/browser webdriverio
```

LANGUAGE: pnpm
CODE:

```
pnpm add -D vitest @vitest/browser webdriverio
```

LANGUAGE: bun
CODE:

```
bun add -D vitest @vitest/browser webdriverio
```

---

TITLE: Vitest Basic Test Suite
DESCRIPTION: Demonstrates a basic test suite structure using Vitest with `describe`, `it`, `expect`, and `assert`. Includes an example of snapshot testing for object comparison.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/README.md#_snippet_0>

LANGUAGE: ts
CODE:

```
import { assert, describe, expect, it } from 'vitest'

describe('suite name', () => {
  it('foo', () => {
    expect(1 + 1).toEqual(2)
    expect(true).to.be.true
  })

  it('bar', () => {
    assert.equal(Math.sqrt(4), 2)
  })

  it('snapshot', () => {
    expect({ foo: 'bar' }).toMatchSnapshot()
  })
})
```

---

TITLE: Start Vitest Programmatically
DESCRIPTION: Initiates Vitest, validates installed packages, and runs tests immediately. This function returns a Vitest instance that can be used to access test module information.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/advanced/guide/tests.md#_snippet_0>

LANGUAGE: ts
CODE:

```
import { startVitest } from 'vitest/node'

const vitest = await startVitest(
  'test',
  [], // CLI filters
  {},
  {}, // override Vite config
  {},
)
const testModules = vitest.state.getTestModules()
for (const testModule of testModules) {
  console.log(testModule.moduleId, testModule.ok() ? 'passed' : 'failed')
}
```

---

TITLE: Global Setup with onTestsRerun Callback
DESCRIPTION: Shows how to define a custom callback function in global setup that is executed when Vitest reruns tests. The runner waits for asynchronous callbacks to complete.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/config/index.md#_snippet_44>

LANGUAGE: ts
CODE:

```
import type { TestProject } from 'vitest/node'

export default function setup(project: TestProject) {
  project.onTestsRerun(async () => {
    await restartDb()
  })
}
```

---

TITLE: Vitest Configuration Example (Deprecated Provider Options)
DESCRIPTION: An example of how to configure browser provider options in Vitest, demonstrating the deprecated `browser.providerOptions` setting for launching browser devtools.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/config.md#_snippet_7>

LANGUAGE: ts
CODE:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      providerOptions: {
        launch: {
          devtools: true,
        },
      },
    },
  },
})
```

---

TITLE: Setup Memfs Mocks for Node.js fs Modules
DESCRIPTION: Configures memfs to mock the built-in Node.js 'fs' and 'fs/promises' modules. This involves creating '**mocks**' files that export the memfs instance, allowing tests to interact with an in-memory file system. This setup is crucial for isolating tests from the actual file system.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/mocking.md#_snippet_7>

LANGUAGE: js
CODE:

```
// we can also use `import`, but then
// every export should be explicitly defined

const { fs } = require('memfs')
module.exports = fs
```

LANGUAGE: js
CODE:

```
// we can also use `import`, but then
// every export should be explicitly defined

const { fs } = require('memfs')
module.exports = fs.promises
```

---

TITLE: Basic Browser Configuration Example
DESCRIPTION: An example of a Vitest configuration file (`vitest.config.ts`) demonstrating how to enable browser testing with Playwright and define browser instances.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/config.md#_snippet_0>

LANGUAGE: typescript
CODE:

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          setupFile: './chromium-setup.js',
        },
      ],
    },
  },
})
```

---

TITLE: Implement Custom Coverage Reporter
DESCRIPTION: Provides an example of a custom coverage reporter implementation in JavaScript. This reporter extends `istanbul-lib-report`'s `ReportBase` and demonstrates how to access configuration options passed from `vitest.config.ts` and write output during the coverage reporting lifecycle (`onStart`, `onEnd`).

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/coverage.md#_snippet_7>

LANGUAGE: js
CODE:

```
const { ReportBase } = require('istanbul-lib-report')

module.exports = class CustomReporter extends ReportBase {
  constructor(opts) {
    super()

    // Options passed from configuration are available here
    this.file = opts.file
  }

  onStart(root, context) {
    this.contentWriter = context.writer.writeFile(this.file)
    this.contentWriter.println('Start of custom coverage report')
  }

  onEnd() {
    this.contentWriter.println('End of custom coverage report')
    this.contentWriter.close()
  }
}
```

---

TITLE: Vitest: beforeEach Hook Example
DESCRIPTION: Illustrates the beforeEach lifecycle hook in Vitest, which registers a callback to run before each test in the current context. This is useful for setup tasks like clearing mocks or adding test data.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/api/index.md#_snippet_34>

LANGUAGE: ts
CODE:

```
import { beforeEach } from 'vitest'

beforeEach(async () => {
  // Clear mocks and add some testing data before each test run
  await stopMocking()
  await addUser({ name: 'John' })
})
```

---

TITLE: Vitest In-Source Testing Example
DESCRIPTION: Illustrates Vitest's in-source testing feature, allowing tests to be co-located with implementation code. This enables tests to share the same closure and access private states without explicit exports.

SOURCE: <https://github.com/vitest-dev/vitest/blob/main/docs/guide/features.md#_snippet_7>

LANGUAGE: ts
CODE:

```
// the implementation
export function add(...args: number[]): number {
  return args.reduce((a, b) => a + b, 0)
}

// in-source test suites
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('add', () => {
    expect(add()).toBe(0)
    expect(add(1)).toBe(1)
    expect(add(1, 2, 3)).toBe(6)
  })
}
```
