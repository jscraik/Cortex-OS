========================
CODE SNIPPETS
========================
TITLE: Install @pnpm/fs.packlist
DESCRIPTION: Shows how to install the @pnpm/fs.packlist package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fs/packlist/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/fs.packlist
```

---

TITLE: Install @pnpm/plugin-commands-store-inspecting
DESCRIPTION: This snippet shows how to install the @pnpm/plugin-commands-store-inspecting package using pnpm. It is a standard command-line installation.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/plugin-commands-store-inspecting/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-store-inspecting
```

---

TITLE: Install @pnpm/package-bins
DESCRIPTION: Installs the @pnpm/package-bins package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/package-bins/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/package-bins
```

---

TITLE: Install @pnpm/core and @pnpm/logger
DESCRIPTION: Instructions for installing the @pnpm/core package and its dependency @pnpm/logger using pnpm. This ensures the core installation engine is set up correctly.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/core/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/core
```

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/logger@1
```

---

TITLE: Install @pnpm/git-utils
DESCRIPTION: Instructions for installing the @pnpm/git-utils package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/git-utils/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/git-utils
```

---

TITLE: Install @pnpm/lockfile.fs
DESCRIPTION: Installs the @pnpm/lockfile.fs package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/fs/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/lockfile.fs
```

---

TITLE: Deploy @pnpm/pick-fetcher
DESCRIPTION: Command to add the @pnpm/pick-fetcher package to your project. This is typically used for installation and setup.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fetching/pick-fetcher/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/pick-fetcher
```

---

TITLE: Install @pnpm/prepare-package
DESCRIPTION: This snippet demonstrates how to install the @pnpm/prepare-package package using the pnpm package manager. This is a standard installation command for adding the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/prepare-package/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/prepare-package
```

---

TITLE: Install @pnpm/client
DESCRIPTION: Installs the @pnpm/client package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/client/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/client
```

---

TITLE: Install @pnpm/matcher
DESCRIPTION: Install the @pnpm/matcher package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/matcher/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/matcher
```

---

TITLE: Install @pnpm/calc-dep-state
DESCRIPTION: This snippet demonstrates how to install the @pnpm/calc-dep-state package using the pnpm package manager. It is a standard command-line installation command.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/calc-dep-state/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/calc-dep-state
```

---

TITLE: Install Dependencies
DESCRIPTION: Installs project dependencies using pnpm. This command is a direct replacement for npm install or yarn install, leveraging pnpm's efficient installation strategy.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pnpm/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm install
```

---

TITLE: Install @pnpm/plugin-commands-publishing
DESCRIPTION: Installs the @pnpm/plugin-commands-publishing package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/releasing/plugin-commands-publishing/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/plugin-commands-publishing

```

---

TITLE: Usage Example
DESCRIPTION: Demonstrates how to use the packlist function from @pnpm/fs.packlist to get a list of files from a package directory.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fs/packlist/README.md#_snippet_1

LANGUAGE: js
CODE:

```
const { packlist } = require('@pnpm/fs.packlist')

const files = packlist('/package-dir')
```

---

TITLE: Install @pnpm/plugin-commands-outdated
DESCRIPTION: Shows how to install the @pnpm/plugin-commands-outdated package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/reviewing/plugin-commands-outdated/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-outdated
```

---

TITLE: Install @pnpm/lifecycle
DESCRIPTION: Installs the @pnpm/lifecycle package and its dependency @pnpm/logger using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/lifecycle/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/logger @pnpm/lifecycle
```

---

TITLE: Install @pnpm/manifest-utils
DESCRIPTION: Installs the @pnpm/manifest-utils package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manifest/manifest-utils/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm i @pnpm/manifest-utils

```

---

TITLE: Install pnpm CLI using wget
DESCRIPTION: Installs the pnpm CLI executable by downloading and executing an installation script using wget. This method is an alternative for users who do not have curl installed and is suitable for macOS, Linux, or Windows Subsystem for Linux environments. A shell restart is necessary after installation.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pnpm/artifacts/exe/README.md#_snippet_1

LANGUAGE: shell
CODE:

```
wget -qO- https://get.pnpm.io/install.sh | sh -
```

---

TITLE: Install @pnpm/directory-fetcher
DESCRIPTION: Installs the @pnpm/directory-fetcher package into your project using the pnpm package manager. This command adds the package as a dependency, making its functionality available for use.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fetching/directory-fetcher/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/directory-fetcher
```

---

TITLE: Install @pnpm/workspace.pkgs-graph
DESCRIPTION: Installs the @pnpm/workspace.pkgs-graph package using the pnpm package manager. This is the first step to use the library in your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/pkgs-graph/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/workspace.pkgs-graph
```

---

TITLE: Install @pnpm/network.auth-header
DESCRIPTION: Installs the @pnpm/network.auth-header package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/network/auth-header/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/network.auth-header
```

---

TITLE: Install @pnpm/config.config-writer
DESCRIPTION: Installs the @pnpm/config.config-writer package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/config-writer/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/config.config-writer
```

---

TITLE: Install pnpm Server Package
DESCRIPTION: Installs the @pnpm/server package along with its dependency @pnpm/logger using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/server/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/logger @pnpm/server
```

---

TITLE: Install @pnpm/create-cafs-store
DESCRIPTION: Installs the @pnpm/create-cafs-store package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/create-cafs-store/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/create-cafs-store

```

---

TITLE: Install @pnpm/fetching.binary-fetcher
DESCRIPTION: Installs the @pnpm/fetching.binary-fetcher package into your project using the pnpm package manager. This command adds the package as a dependency.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fetching/binary-fetcher/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/fetching.binary-fetcher
```

---

TITLE: Install @pnpm/plugin-commands-env
DESCRIPTION: This command installs the @pnpm/plugin-commands-env package using the pnpm package manager. It is typically used to add environment management capabilities to your pnpm setup.

SOURCE: https://github.com/pnpm/pnpm/blob/main/env/plugin-commands-env/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/plugin-commands-env

```

---

TITLE: Install @pnpm/plugin-commands-server
DESCRIPTION: Installs the @pnpm/plugin-commands-server package using pnpm. This package provides commands for controlling the pnpm store server.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/plugin-commands-server/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-server
```

---

TITLE: Install @pnpm/plugin-commands-setup
DESCRIPTION: Installs the @pnpm/plugin-commands-setup package using pnpm. This command adds the necessary package to your project's dependencies, enabling its commands.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/plugin-commands-setup/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-setup
```

---

TITLE: Install @pnpm/link-bins
DESCRIPTION: Installs the @pnpm/link-bins package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/link-bins/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/link-bins
```

---

TITLE: Install @pnpm/pkg-manager.direct-dep-linker
DESCRIPTION: This snippet shows how to install the @pnpm/pkg-manager.direct-dep-linker package using pnpm. It is a standard installation command.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/direct-dep-linker/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm install @pnpm/pkg-manager.direct-dep-linker
```

---

TITLE: Install @pnpm/plugin-commands-rebuild
DESCRIPTION: This snippet shows how to install the @pnpm/plugin-commands-rebuild package using pnpm. It is a standard command-line installation process.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/plugin-commands-rebuild/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-rebuild
```

---

TITLE: Install pnpm CLI using curl
DESCRIPTION: Installs the pnpm CLI executable by downloading and executing an installation script using curl. This method is suitable for macOS, Linux, or Windows Subsystem for Linux environments. After installation, the shell must be restarted for pnpm to be accessible.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pnpm/artifacts/exe/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

TITLE: Install @pnpm/cli-utils
DESCRIPTION: Installs the @pnpm/cli-utils package using the pnpm package manager. This is a standard installation command for developers to add the package to their project dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cli/cli-utils/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/cli-utils
```

---

TITLE: Install @pnpm/testing.temp-store
DESCRIPTION: Command to install the @pnpm/testing.temp-store package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/testing/temp-store/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/testing.temp-store
```

---

TITLE: Example Test Fixture Package.json
DESCRIPTION: A sample package.json file demonstrating a script that can be tested using the TestIpcServer.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/test-ipc-server/README.md#_snippet_0

LANGUAGE: json
CODE:

```
{
  "name": "@pnpm/example-test-fixture",
  "private": true,
  "scripts": {
    "build": "echo 'This script should run'"
  }
}
```

---

TITLE: Install @pnpm/fs.is-empty-dir-or-nothing
DESCRIPTION: Installs the @pnpm/fs.is-empty-dir-or-nothing package using the pnpm package manager. This is the primary method to add the functionality to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fs/is-empty-dir-or-nothing/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/fs.is-empty-dir-or-nothing
```

---

TITLE: Install @pnpm/plugin-commands-installation
DESCRIPTION: Installs the @pnpm/plugin-commands-installation package using pnpm. This package provides essential commands for package installation within pnpm projects.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/plugin-commands-installation/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-installation
```

---

TITLE: Install @pnpm/common-cli-options-help
DESCRIPTION: Installs the @pnpm/common-cli-options-help package using the pnpm package manager. This is typically done to integrate its help functionalities into your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cli/common-cli-options-help/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/common-cli-options-help
```

---

TITLE: Install @pnpm/workspace.state
DESCRIPTION: Installs the @pnpm/workspace.state package using pnpm. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/state/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/workspace.state
```

---

TITLE: Install @pnpm/assert-project
DESCRIPTION: Installs the @pnpm/assert-project package as a development dependency using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/assert-project/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm install -D @pnpm/assert-project
```

---

TITLE: Install @pnpm/plugin-commands-init
DESCRIPTION: This snippet demonstrates how to install the @pnpm/plugin-commands-init package using the pnpm package manager. It is a common step for users wanting to utilize the package's functionality.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/plugin-commands-init/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-init
```

---

TITLE: Install @pnpm/package-is-installable using pnpm
DESCRIPTION: Installs the @pnpm/package-is-installable package. This package is used to check if a package is installable on the current system.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/package-is-installable/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm install @pnpm/package-is-installable

```

---

TITLE: Install @pnpm/lockfile.walker
DESCRIPTION: Installs the @pnpm/lockfile.walker package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/walker/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/lockfile.walker
```

---

TITLE: Install @pnpm/store-path
DESCRIPTION: Provides instructions for installing the @pnpm/store-path package using common package managers like pnpm, yarn, or npm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/store-path/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
<pnpm|yarn|npm> add @pnpm/store-path
```

---

TITLE: Install @pnpm/default-reporter
DESCRIPTION: Instructions for installing the @pnpm/default-reporter package using the pnpm package manager. This is the initial step to integrate the default reporter into your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cli/default-reporter/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/default-reporter
```

---

TITLE: Get Current Git Branch Name
DESCRIPTION: Example demonstrating how to use the getCurrentBranchName function from the @pnpm/git-utils package to fetch the current Git branch name and log it to the console.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/git-utils/README.md#_snippet_1

LANGUAGE: javascript
CODE:

```
'use strict'
const { getCurrentBranchName } = require('@pnpm-utils').default

main()
async function main() {
  const branchName = await getCurrentBranch();
  console.log(branchName)
}
```

---

TITLE: Install @pnpm/cafs-types
DESCRIPTION: Installs the @pnpm/types package using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/cafs-types/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/types
```

---

TITLE: Install @pnpm/remove-bins
DESCRIPTION: Demonstrates how to install the @pnpm/remove-bins package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/remove-bins/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm install @pnpm/remove-bins
```

---

TITLE: Install @pnpm/test-fixtures
DESCRIPTION: Installs the @pnpm/test-fixtures package as a development dependency using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/test-fixtures/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add -D @pnpm/test-fixtures
```

---

TITLE: Install @pnpm/exportable-manifest
DESCRIPTION: Installs the @pnpm/exportable-manifest package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manifest/exportable-manifest/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/exportable-manifest
```

---

TITLE: Install @pnpm/license-scanner
DESCRIPTION: Installs the @pnpm/license-scanner package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/reviewing/license-scanner/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/license-scanner
```

---

TITLE: Install @pnpm/git-fetcher
DESCRIPTION: Shows how to install the @pnpm/git-fetcher package using pnpm. This is the standard way to add the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fetching/git-fetcher/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/git-fetcher
```

---

TITLE: Install @pnpm/patching.apply-patch
DESCRIPTION: Installs the @pnpm/patching.apply-patch package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/patching/apply-patch/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/patching.apply-patch
```

---

TITLE: Install @pnpm/config.deps-installer
DESCRIPTION: This snippet shows how to add the @pnpm/config.deps-installer package to your project using pnpm. It is a standard installation command.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/deps-installer/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/config.deps-installer
```

---

TITLE: Install @pnpm/list
DESCRIPTION: Installs the @pnpm/list package using pnpm. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/reviewing/list/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/list
```

---

TITLE: Install @pnpm/resolving.deno-resolver
DESCRIPTION: Installs the @pnpm/resolving.deno-resolver package using pnpm. This package is used to resolve the Deno runtime.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/deno-resolver/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/resolving.deno-resolver
```

---

TITLE: Install ESLint Config
DESCRIPTION: Installs the @pnpm/eslint-config package and tslint as development dependencies using pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/eslint-config/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add -D @pnpm/eslint-config tslint
```

---

TITLE: Install pnpm Project Dependencies
DESCRIPTION: Installs all necessary dependencies for the pnpm project. This is a prerequisite for setting up the development environment.

SOURCE: https://github.com/pnpm/pnpm/blob/main/CONTRIBUTING.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm install
```

---

TITLE: Install @pnpm/symlink-dependency
DESCRIPTION: Installs the @pnpm/symlink-dependency package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fs/symlink-dependency/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm install @pnpm/symlink-dependency
```

---

TITLE: Install @pnpm/deps.graph-sequencer
DESCRIPTION: This command installs the @pnpm/deps.graph-sequencer package using pnpm. It adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/deps/graph-sequencer/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/deps.graph-sequencer
```

---

TITLE: Install @pnpm/patching.types
DESCRIPTION: Installs the @pnpm/patching.types package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/patching/types/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/patching.types
```

---

TITLE: Link Bins Usage
DESCRIPTION: Demonstrates how to use the linkBins and linkBinsOfPackages functions from the @pnpm/link-bins library. The first example shows linking bins for a single project, while the second shows linking bins for multiple packages.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/link-bins/README.md#_snippet_1

LANGUAGE: ts
CODE:

```
import linkBins, {linkBinsOfPackages} from '@pnpm/link-bins'

function warn (msg) { console.warn(msg) }

await linkBins('node_modules', 'node_modules/.bin', {warn})

const packages = [{manifest: packageJson, location: pathToPackage}]
await linkBinsOfPackages(packages, 'node_modules/.bin', {warn})
```

---

TITLE: Install @pnpm/write-project-manifest
DESCRIPTION: Installs the @pnpm/write-project-manifest package using pnpm. This is the primary way to add the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manifest/write-project-manifest/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/write-project-manifest
```

---

TITLE: Install @pnpm/plugin-commands-listing
DESCRIPTION: Demonstrates how to install the @pnpm/plugin-commands-listing package using the pnpm package manager. This command adds the specified package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/reviewing/plugin-commands-listing/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-listing
```

---

TITLE: Install @pnpm/lockfile.verification
DESCRIPTION: Installs the @pnpm/lockfile.verification package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/verification/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/lockfile.verification
```

---

TITLE: Install @pnpm/worker
DESCRIPTION: Installs the @pnpm/worker package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/worker/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/worker

```

---

TITLE: Install @pnpm/workspace.read-manifest
DESCRIPTION: Installs the @pnpm/workspace.read-manifest package using the pnpm package manager. This is the primary method to add this functionality to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/read-manifest/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/workspace.read-manifest
```

---

TITLE: Install @pnpm/parse-cli-args
DESCRIPTION: Demonstrates how to install the @pnpm/parse-cli-args package using the pnpm package manager. This is the standard method for adding the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cli/parse-cli-args/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/parse-cli-args
```

---

TITLE: Install @pnpm/get-context
DESCRIPTION: This snippet shows how to install the @pnpm/get-context package using the pnpm package manager. It is a common step before using the package's functionality.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/get-context/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/get-context
```

---

TITLE: Install @pnpm/resolver-base
DESCRIPTION: Installs the @pnpm/resolver-base package using the pnpm package manager. This is the first step to using the types provided by the package.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/resolver-base/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/resolver-base
```

---

TITLE: Install @pnpm/modules-yaml using pnpm
DESCRIPTION: Shows how to install the `@pnpm/modules-yaml` package using the pnpm package manager. This is the first step to using the library in your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/modules-yaml/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/modules-yaml
```

---

TITLE: Install @pnpm/tarball-resolver
DESCRIPTION: Installs the @pnpm/tarball-resolver package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/tarball-resolver/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/tarball-resolver
```

---

TITLE: Install @pnpm/pnpmfile
DESCRIPTION: Installs the @pnpm/pnpmfile package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/hooks/pnpmfile/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/pnpmfile
```

---

TITLE: Install @pnpm/resolve-dependencies
DESCRIPTION: Installs the @pnpm/resolve-dependencies package using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/resolve-dependencies/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm install @pnpm/resolve-dependencies
```

---

TITLE: Install @pnpm/fetcher-base
DESCRIPTION: Installs the @pnpm/fetcher-base package using pnpm. This package provides essential types for developing pnpm-compatible fetchers.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fetching/fetcher-base/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/fetcher-base
```

---

TITLE: Install @pnpm/semver.peer-range
DESCRIPTION: Installs the @pnpm/semver.peer-range package using pnpm. This package is used for validating peer ranges.

SOURCE: https://github.com/pnpm/pnpm/blob/main/semver/peer-range/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/semver.peer-range
```

---

TITLE: Install @pnpm/logger
DESCRIPTION: Command to install the @pnpm/logger package using pnpm. This adds the logger as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/logger/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/logger
```

---

TITLE: Install @pnpm/plugin-commands-config
DESCRIPTION: Installs the @pnpm/plugin-commands-config package using pnpm. This command is typically run in a shell environment.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/plugin-commands-config/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/plugin-commands-config

```

---

TITLE: Install @pnpm/workspace.spec-parser
DESCRIPTION: Installs the @pnpm/workspace.spec-parser package using the pnpm package manager. This command adds the library to your project's dependencies, making its functionality available for use.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/spec-parser/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/workspace.spec-parser
```

---

TITLE: Install @pnpm/resolve-workspace-range
DESCRIPTION: Installs the @pnpm/resolve-workspace-range package using pnpm. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/resolve-workspace-range/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/resolve-workspace-range
```

---

TITLE: Install @pnpm/plugin-commands-script-runners
DESCRIPTION: Demonstrates the command to install the @pnpm/plugin-commands-script-runners package using the pnpm package manager. This is typically done to add script running capabilities to a project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/plugin-commands-script-runners/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-script-runners
```

---

TITLE: Install @pnpm/local-resolver
DESCRIPTION: Installs the @pnpm/local-resolver package using pnpm. This is the primary method to add the local resolver functionality to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/local-resolver/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/local-resolver
```

---

TITLE: Install @pnpm/crypto.shasums-file
DESCRIPTION: Installs the @pnpm/crypto.shasums-file package using the pnpm package manager. This is the standard method to add the utility to your project dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/crypto/shasums-file/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/crypto.shasums-file
```

---

TITLE: Install @pnpm/crypto.polyfill
DESCRIPTION: Installs the @pnpm/crypto.polyfill package using the pnpm package manager. This command adds the necessary polyfill to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/crypto/polyfill/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/crypto.polyfill
```

---

TITLE: Install @pnpm/pick-registry-for-package
DESCRIPTION: Demonstrates how to add the @pnpm/pick-registry-for-package package to your project using the pnpm package manager. This is the standard way to include this utility in your development environment.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/pick-registry-for-package/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/pick-registry-for-package
```

---

TITLE: Install @pnpm/cli-meta using pnpm
DESCRIPTION: This snippet demonstrates how to install the @pnpm/cli-meta package using the pnpm package manager. It's a standard command for adding dependencies to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cli/cli-meta/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/cli-meta
```

---

TITLE: Install @pnpm/normalize-registries
DESCRIPTION: Installs the @pnpm/normalize-registries package using pnpm. This is the primary method to add the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/normalize-registries/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/normalize-registries
```

---

TITLE: Install @pnpm/real-hoist
DESCRIPTION: This command installs the @pnpm/real-hoist package into your project. It uses the pnpm package manager, which is the default for pnpm projects.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/real-hoist/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/real-hoist
```

---

TITLE: Install @pnpm/create-cafs-store
DESCRIPTION: Installs the @pnpm/create-cafs-store package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/fs/indexed-pkg-importer/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/create-cafs-store
```

---

TITLE: Install @pnpm/lockfile-to-pnp
DESCRIPTION: Installs the @pnpm/lockfile-to-pnp package globally using the pnpm package manager. This command is used to set up the tool for command-line usage.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/lockfile-to-pnp/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add -g @pnpm/lockfile-to-pnp
```

---

TITLE: Install @pnpm/headless
DESCRIPTION: Installs the @pnpm/headless package into your project using the pnpm package manager. This command is typically executed in your project's root directory to add the package as a dependency.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/headless/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm install @pnpm/headless
```

---

TITLE: Install @pnpm/plugin-commands-licenses
DESCRIPTION: Installs the @pnpm/plugin-commands-licenses package using the pnpm package manager. This command adds the specified package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/reviewing/plugin-commands-licenses/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-licenses

```

---

TITLE: Install @pnpm/render-peer-issues
DESCRIPTION: Installs the @pnpm/render-peer-issues package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/render-peer-issues/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/render-peer-issues
```

---

TITLE: Install @pnpm/fetch
DESCRIPTION: Installs the @pnpm/fetch package using the pnpm package manager. This package provides node-fetch functionality with built-in retry mechanisms.

SOURCE: https://github.com/pnpm/pnpm/blob/main/network/fetch/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/fetch
```

---

TITLE: Install @pnpm/exec.pnpm-cli-runner
DESCRIPTION: Installs the @pnpm/exec.pnpm-cli-runner package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/pnpm-cli-runner/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/exec.pnpm-cli-runner
```

---

TITLE: Install @pnpm/tools.plugin-commands-self-updater
DESCRIPTION: Installs the @pnpm/tools.plugin-commands-self-updater package using pnpm. This package provides functionality for updating pnpm itself.

SOURCE: https://github.com/pnpm/pnpm/blob/main/tools/plugin-commands-self-updater/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/tools.plugin-commands-self-updater
```

---

TITLE: Install @pnpm/filter-workspace-packages
DESCRIPTION: Shows how to install the @pnpm/filter-workspace-packages package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/filter-workspace-packages/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/filter-workspace-packages
```

---

TITLE: ESLint Configuration
DESCRIPTION: Example of an eslint.json file extending the @pnpm/eslint-config.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/eslint-config/README.md#_snippet_1

LANGUAGE: json
CODE:

```
{
  "extends": "@pnpm/eslint-config"
}
```

---

TITLE: Install RHEL Build Tools
DESCRIPTION: Installs `rpmdevtools` and `rpmlint` required for building RHEL packages. This command uses `dnf` for package management.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/build-artifacts/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
sudo dnf install -y rpmdevtools rpmlint
```

---

TITLE: Install @pnpm/lockfile.utils
DESCRIPTION: This snippet shows how to install the @pnpm/lockfile.utils package using the pnpm package manager. It is a common command-line operation for adding dependencies to a project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/utils/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/lockfile.utils
```

---

TITLE: Install @pnpm/tsconfig with pnpm
DESCRIPTION: Installs the @pnpm/tsconfig package and TypeScript as development dependencies using the pnpm package manager.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/tsconfig/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add -D @pnpm/tsconfig typescript
```

---

TITLE: Install @pnpm/tools.path Package
DESCRIPTION: This snippet demonstrates how to install the @pnpm/tools.path package using the pnpm package manager. It is a common step for developers working with pnpm's internal tools.

SOURCE: https://github.com/pnpm/pnpm/blob/main/tools/path/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/tools.path
```

---

TITLE: Install @pnpm/parse-overrides
DESCRIPTION: Installs the @pnpm/parse-overrides package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/parse-overrides/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/parse-overrides
```

---

TITLE: Install @pnpm/lockfile.merger
DESCRIPTION: This snippet demonstrates how to install the @pnpm/lockfile.merger package using the pnpm package manager. It's a common step for projects utilizing this utility.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/merger/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/lockfile.merger
```

---

TITLE: Install @pnpm/resolving.bun-resolver
DESCRIPTION: This snippet demonstrates how to install the @pnpm/resolving.bun-resolver package using the pnpm package manager. It's a standard command for adding project dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/bun-resolver/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/resolving.bun-resolver
```

---

TITLE: Install @pnpm/node.resolver
DESCRIPTION: Installs the @pnpm/node.resolver package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/env/node.resolver/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/node.resolver
```

---

TITLE: Install @pnpm/audit
DESCRIPTION: Installs the @pnpm/audit package using the pnpm package manager. This command is typically run in a project's root directory.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/audit/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/audit

```

---

TITLE: Install @pnpm/command
DESCRIPTION: Installs the @pnpm/command package using the pnpm package manager. This command is typically run in a project that uses pnpm.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cli/command/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/command
```

---

TITLE: Install @pnpm/workspace.manifest-writer
DESCRIPTION: Installs the @pnpm/workspace.manifest-writer package using the pnpm package manager. This command adds the necessary package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/manifest-writer/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/workspace.manifest-writer
```

---

TITLE: Install @pnpm/lockfile.settings-checker
DESCRIPTION: Installs the @pnpm/lockfile.settings-checker package using the pnpm package manager. This command adds the utility to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/settings-checker/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/lockfile.settings-checker
```

---

TITLE: Install @pnpm/exec.build-commands using pnpm
DESCRIPTION: This snippet shows how to install the @pnpm/exec.build-commands package using the pnpm package manager. It adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/build-commands/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/exec.build-commands
```

---

TITLE: Run Lifecycle Hooks with @pnpm/lifecycle
DESCRIPTION: Demonstrates how to use the @pnpm/lifecycle package to execute package lifecycle hooks. It shows how to run a specific hook like 'preinstall' or all post-install hooks.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/lifecycle/README.md#_snippet_1

LANGUAGE: ts
CODE:

```
import runLifecycleHook, {runPostinstallHooks} from '@pnpm/lifecycle'

const targetPkgRoot = path.resolve('node_modules/target-pkg')
const pkg = require(path.join(targetPkgRoot, 'package.json'))

// Run a specific hook
await runLifecycleHook('preinstall', pkg, {
  pkgId: 'target-pkg/1.0.0',
  pkgRoot: targetPkgRoot,
  rawConfig: {},
  rootModulesDir: path.resolve('node_modules'),
  unsafePerm: true,
})

// Run all install hooks
await runPostinstallHooks({
  pkgId: 'target-pkg/1.0.0',
  pkgRoot: targetPkgRoot,
  rawConfig: {},
  rootModulesDir: path.resolve('node_modules'),
  unsafePerm: true,
})
```

---

TITLE: Install @pnpm/dedupe.issues-renderer
DESCRIPTION: Installs the @pnpm/dedupe.issues-renderer package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/dedupe/issues-renderer/README.md#_snippet_0

LANGUAGE: pnpm
CODE:

```
pnpm add @pnpm/dedupe.issues-renderer
```

---

TITLE: Install @pnpm/crypto.object-hasher
DESCRIPTION: Installs the @pnpm/crypto.object-hasher package using the pnpm package manager. This package is used for generating hashes from objects.

SOURCE: https://github.com/pnpm/pnpm/blob/main/crypto/object-hasher/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/crypto.object-hasher
```

---

TITLE: Install @pnpm/deps.graph-builder
DESCRIPTION: Installs the @pnpm/deps.graph-builder package using the pnpm package manager. This command is typically run in your project's terminal.

SOURCE: https://github.com/pnpm/pnpm/blob/main/deps/graph-builder/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm install @pnpm/deps.graph.builder
```

---

TITLE: Install Build Essentials for Node-Gyp
DESCRIPTION: Installs essential build tools required for certain e2e tests that utilize node-gyp. This is a system-level dependency.

SOURCE: https://github.com/pnpm/pnpm/blob/main/CONTRIBUTING.md#_snippet_8

LANGUAGE: shell
CODE:

```
sudo dnf install make automake gcc gcc-c++ kernel-devel
```

---

TITLE: Install @pnpm/resolving.jsr-specifier-parser
DESCRIPTION: Installs the @pnpm/resolving.jsr-specifier-parser package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/jsr-specifier-parser/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/resolving.jsr-specifier-parser
```

---

TITLE: Install @pnpm/mount-modules Globally
DESCRIPTION: Installs the @pnpm/mount-modules package globally using the pnpm package manager. This makes the `mount-modules` command available system-wide.

SOURCE: https://github.com/pnpm/pnpm/blob/main/modules-mounter/daemon/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/mount-modules --global
```

---

TITLE: Install @pnpm/cache.api
DESCRIPTION: Command to install the @pnpm/cache.api package using pnpm. This package provides the API for controlling the pnpm cache.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cache/api/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/cache.api
```

---

TITLE: pnpm/core API Documentation
DESCRIPTION: API methods provided by the @pnpm/core package for managing package installations, linking, and store operations. Includes functions for module mutation, linking packages, and store pruning.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manager/core/README.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
mutateModules(importers, options)
  - Description: Handles the mutation of modules based on provided importers and options. (TODO: Add more details)
  - Parameters:
    - importers: Configuration for modules to mutate.
    - options: Additional options for the mutation process.
```

LANGUAGE: APIDOC
CODE:

```
link(linkFromPkgs, linkToModules, [options])
  - Description: Creates symbolic links from specified packages to the target package's node_modules directory and its .bin folder.
  - Parameters:
    - linkFromPkgs: String[] - Paths to the packages that should be linked.
    - linkToModules: String - Path to the dependent package's node_modules directory.
    - options.reporter: Function - A function that listens for logs during the linking process.
```

LANGUAGE: APIDOC
CODE:

```
linkToGlobal(linkFrom, options)
  - Description: Creates a symbolic link from a specified package to the global node_modules directory.
  - Parameters:
    - linkFrom: String - Path to the package that should be linked.
    - globalDir: String - Path to the global directory where the link will be created.
    - options.reporter: Function - A function that listens for logs.
```

LANGUAGE: APIDOC
CODE:

```
linkFromGlobal(pkgNames, linkTo, options)
  - Description: Creates symbolic links from global package names to the node_modules folder of a specified target package.
  - Parameters:
    - pkgNames: String[] - Names of packages to link from the global store.
    - linkTo: String - The target package to link to.
    - globalDir: String - Path to the global directory.
    - options.reporter: Function - A function that listens for logs.
```

LANGUAGE: APIDOC
CODE:

```
storeStatus([options])
  - Description: Returns a list of modified dependencies within the store.
  - Parameters:
    - options.reporter: Function - A function that listens for logs.
  - Returns: Promise<string[]> - An array of paths to modified packages in the store, not within project node_modules.
```

LANGUAGE: APIDOC
CODE:

```
storePrune([options])
  - Description: Removes unreferenced packages from the pnpm store to free up disk space.
  - Parameters:
    - options: Optional configuration for the prune operation.
```

---

TITLE: Install @pnpm/npm-resolver
DESCRIPTION: Installs the @pnpm/npm-resolver package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/resolving/npm-resolver/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pnpm add @pnpm/npm-resolver
```

---

TITLE: Install @pnpm/env.system-node-version
DESCRIPTION: Installs the @pnpm/env.system-node-version package using pnpm. This package is used to detect the current system Node.js version.

SOURCE: https://github.com/pnpm/pnpm/blob/main/env/system-node-version/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/env.system-node-version
```

---

TITLE: Install @pnpm/plugin-commands-deploy
DESCRIPTION: Installs the @pnpm/plugin-commands-deploy package, which adds deployment commands to the pnpm CLI. This command is executed in your project's terminal.

SOURCE: https://github.com/pnpm/pnpm/blob/main/releasing/plugin-commands-deploy/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/plugin-commands-deploy

```

---

TITLE: Install @pnpm/read-project-manifest
DESCRIPTION: Installs the @pnpm/read-project-manifest package using the pnpm package manager. This is the primary way to add the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/pkg-manifest/read-project-manifest/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/read-project-manifest
```

---

TITLE: Install @pnpm/lockfile.pruner
DESCRIPTION: Install the @pnpm/lockfile.pruner package into your project using the pnpm package manager. This command adds the package as a dependency.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/pruner/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/lockfile.pruner
```

---

TITLE: Install @pnpm/run-npm
DESCRIPTION: Installs the @pnpm/run-npm package using the pnpm package manager. This command adds the package as a dependency to your project, allowing you to utilize its features for running the npm CLI.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/run-npm/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/run-npm
```

---

TITLE: Install @pnpm/crypto.hash
DESCRIPTION: This snippet shows how to install the @pnpm/crypto.hash package using the pnpm package manager. It is a common step for users wanting to utilize the package's hashing capabilities.

SOURCE: https://github.com/pnpm/pnpm/blob/main/crypto/hash/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/crypto.hash

```

---

TITLE: Install @pnpm/cache.commands
DESCRIPTION: Installs the @pnpm/cache.commands package using pnpm. This command is typically used to add the cache control functionality to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/cache/commands/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/cache.commands
```

---

TITLE: Install @pnpm/lockfile.filtering
DESCRIPTION: Installs the @pnpm/lockfile.filtering package using the pnpm package manager. This package is a dependency for filtering pnpm lockfiles.

SOURCE: https://github.com/pnpm/pnpm/blob/main/lockfile/filtering/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm add @pnpm/lockfile.filtering
```

---

TITLE: Install @pnpm/package-store
DESCRIPTION: Installs the @pnpm/package-store package using the pnpm package manager. This command adds the specified package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/package-store/README.md#_snippet_0

LANGUAGE: pnpm
CODE:

```
pnpm add @pnpm/package-store
```

---

TITLE: Install @pnpm/workspace.filter-packages-from-dir
DESCRIPTION: Installs the @pnpm/workspace.filter-packages-from-dir package using the pnpm package manager. This command adds the package as a dependency to your project.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/filter-packages-from-dir/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/workspace.filter-packages-from-dir
```

---

TITLE: Install @pnpm/store-connection-manager
DESCRIPTION: Installs the @pnpm/store-connection-manager package using the pnpm package manager. This command adds the necessary dependency to your project for managing pnpm store connections.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/store-connection-manager/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/store-connection-manager
```

---

TITLE: TestIpcServer Usage Example
DESCRIPTION: An example test case showing how to use the TestIpcServer to capture script output. It prepares a test environment, runs a script that sends a message via the server, and then asserts the received message.

SOURCE: https://github.com/pnpm/pnpm/blob/main/__utils__/test-ipc-server/README.md#_snippet_1

LANGUAGE: ts
CODE:

```
import { prepare } from '@pnpm/prepare'
import { createTestIpcServer } from '@pnpm/test-ipc-server'

test('example test', async () => {
  await using server = await createTestIpcServer()
  prepare({
    scripts: {
      build: server.sendLineScript('this is a built script that should run'),
    },
  })

  await execa('node', [pnpmBin, 'run', 'build'])

  expect(server.getLines()).toStrictEqual(['this is a built script that should run'])
})
```

---

TITLE: Install @pnpm/workspace.injected-deps-syncer
DESCRIPTION: Installs the @pnpm/workspace.injected-deps-syncer package using the pnpm package manager. This package is used to update injected replicas within a workspace.

SOURCE: https://github.com/pnpm/pnpm/blob/main/workspace/injected-deps-syncer/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/workspace.injected-deps-syncer
```

---

TITLE: Install @pnpm/build-modules
DESCRIPTION: Installs the @pnpm/build-modules package using pnpm. This command is typically run in a project's root directory to add the package as a dependency.

SOURCE: https://github.com/pnpm/pnpm/blob/main/exec/build-modules/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/build-modules
```

---

TITLE: Install @pnpm/parse-wanted-dependency
DESCRIPTION: Installs the @pnpm/parse-wanted-dependency package using the pnpm package manager. This command adds the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/packages/parse-wanted-dependency/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pnpm i @pnpm/parse-wanted-dependency

```

---

TITLE: Install @pnpm/store.cafs Package
DESCRIPTION: Installs the @pnpm/store.cafs package using the pnpm package manager. This command adds the package to your project's dependencies.

SOURCE: https://github.com/pnpm/pnpm/blob/main/store/cafs/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm\/store.cafs
```

---

TITLE: Install @pnpm/config Package
DESCRIPTION: Installs the @pnpm/config package using the pnpm package manager. This command adds the necessary dependency to your project's package.json file.

SOURCE: https://github.com/pnpm/pnpm/blob/main/config/config/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
pnpm add @pnpm/config
```
