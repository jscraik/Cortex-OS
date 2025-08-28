========================
CODE SNIPPETS
========================

TITLE: Example: Defining 'start' script in package.json
DESCRIPTION: Illustrates how to configure the 'start' script within the 'scripts' section of a `package.json` file, specifying the command to be executed by `npm start`.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-start>

LANGUAGE: json
CODE:

```
{
"scripts": {
"start": "node foo.js"
}
}
```

---

TITLE: Example: Executing npm start and its output
DESCRIPTION: Demonstrates the command-line execution of `npm start` and the typical output, including the script execution and any subsequent output from the script itself.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-start>

LANGUAGE: cli
CODE:

```
npm start
> npm@x.x.x start
> node foo.js
(foo.js output would be here)
```

---

TITLE: Basic npm install Commands
DESCRIPTION: Examples of fundamental `npm install` commands, including installing a package by name, from a GitHub repository, with a scope, and using various `--save` options to manage dependencies in `package.json`.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: Shell
CODE:

```
npm install sax

npm install githubname/reponame

npm install @myorg/privatepackage

npm install node-tap --save-dev

npm install dtrace-provider --save-optional

npm install readable-stream --save-exact

npm install ansi-regex --save-bundle
```

---

TITLE: Basic npm Package Installation
DESCRIPTION: Examples demonstrating various ways to install npm packages, including by name, GitHub repository, scoped packages, and with different dependency saving flags.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: shell
CODE:

```
npm install sax

npm install githubname/reponame

npm install @myorg/privatepackage

npm install node-tap --save-dev

npm install dtrace-provider --save-optional

npm install readable-stream --save-exact

npm install ansi-regex --save-bundle
```

---

TITLE: Install Packages by Tag
DESCRIPTION: Examples of installing a specific version of a package referenced by a tag (e.g., `latest`) using the `npm install [<@scope>/]<name>@<tag>` syntax. Installation will fail if the specified tag does not exist for the package.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: Shell
CODE:

```
npm install sax@latest

npm install @myorg/mypackage@latest
```

---

TITLE: Example: Set 'start' script with http-server
DESCRIPTION: An example demonstrating how to set the 'start' script to run `http-server .` using `npm set-script`.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-set-script>

LANGUAGE: APIDOC
CODE:

```
npm set-script start "http-server ."
```

---

TITLE: Install npm Packages from GitLab
DESCRIPTION: Provides examples for installing npm packages from a GitLab repository. This method allows specifying a particular commit or a semver range, and handles the installation of `dependencies` and `devDependencies` based on the package's `prepare` script.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: npm
CODE:

```
npm install gitlab:mygitlabuser/myproject

npm install gitlab:myusr/myproj#semver:^5.0
```

---

TITLE: Installing npm Packages from Git Remote URLs
DESCRIPTION: Examples of installing npm packages directly from various Git remote URLs, including different protocols and commit-ish/semver specifications. Submodules are cloned, and `prepare` scripts are run if present.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: shell
CODE:

```
npm install git+ssh://git@github.com:npm/cli.git#v1.0.27

npm install git+ssh://git@github.com:npm/cli#pull/273

npm install git+ssh://git@github.com:npm/cli#semver:^5.0

npm install git+https://isaacs@github.com/npm/cli.git

npm install git://github.com/npm/cli.git#v1.0.27

GIT_SSH_COMMAND='ssh -i ~/.ssh/custom_ident' npm install git+ssh://git@github.com:npm/cli.git
```

---

TITLE: Prepare Project for npm ci with npm install
DESCRIPTION: This snippet demonstrates the initial setup of a project by navigating into its directory and running `npm install` to generate a `package-lock.json` file, which is a prerequisite for using `npm ci`. It also shows how to verify the presence of the lock file.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-ci>

LANGUAGE: bash
CODE:

```
$ cd ./my/npm/project
$ npm install
added 154 packages in 10s
$ ls | grep package-lock
```

---

TITLE: Installing npm Packages by Tag
DESCRIPTION: Examples for installing a specific version of an npm package referenced by a tag (e.g., `latest`). This method will fail if the tag does not exist in the registry data for that package.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: shell
CODE:

```
npm install sax@latest

npm install @myorg/mypackage@latest
```

---

TITLE: Install Package from Remote Tarball URL
DESCRIPTION: Shows how to install a package by fetching a tarball from a remote URL. The argument must start with 'http://' or 'https://' to distinguish it from other installation methods.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: Shell
CODE:

```
npm install https://github.com/indexzero/forever/tarball/v0.5.6
```

---

TITLE: Install npm Package from GitLab Repository
DESCRIPTION: Provides examples for installing an npm package from a GitLab repository, including specifying a semver range for the commit-ish. This command clones the GitLab repository and installs its dependencies.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: bash
CODE:

```
npm install gitlab:mygitlabuser/myproject

  npm install gitlab:myusr/myproj#semver:^5.0
```

---

TITLE: npm install Command Line Synopsis
DESCRIPTION: Illustrates the fundamental command-line syntax for `npm install`, showing how to specify packages and listing all recognized aliases for the command.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: cli
CODE:

```
npm install [<package-spec> ...]

aliases: add, i, in, ins, inst, insta, instal, isnt, isnta, isntal, isntall
```

---

TITLE: Execute npm start Command and Output
DESCRIPTION: This snippet shows the execution of the `npm start` command and its typical output. It illustrates how npm invokes the defined 'start' script, displaying the script's execution context and any output from the script itself.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-start>

LANGUAGE: Shell
CODE:

```
npm start

> npm@x.x.x start

> node foo.js

(foo.js output would be here)
```

---

TITLE: npm start Command Synopsis
DESCRIPTION: This snippet shows the basic syntax for the `npm start` command, indicating that it can accept additional arguments. It's typically used to run a predefined 'start' script.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-start>

LANGUAGE: Shell
CODE:

```
npm start [-- <args>]
```

---

TITLE: Install npm Packages from GitHub Gist
DESCRIPTION: Illustrates how to install an npm package hosted on a GitHub Gist. The GitHub username is optional, and the installation process includes handling of `prepare` scripts for dependencies.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: npm
CODE:

```
npm install gist:101a11beef
```

---

TITLE: Example File System Structure for Multiple npm Workspaces
DESCRIPTION: Illustrates a project structure with multiple defined workspaces (e.g., 'a' and 'b') within the `packages` directory, serving as a setup for demonstrating dependency management across workspaces.

SOURCE: <https://docs.npmjs.com/cli/v11/using-npm/workspaces>

LANGUAGE: text
CODE:

```
.
+-- package.json
`-- packages
    +-- a
    |   `-- package.json
    `-- b
        `-- package.json
```

---

TITLE: npm install Command Configuration Options Reference
DESCRIPTION: Provides a reference list of all available configuration options for the `npm install` command, which can be used to modify its installation behavior.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
npm install command configuration options:
  - save
  - save-exact
  - global
  - install-strategy
  - legacy-bundling
  - global-style
  - omit
  - include
  - strict-peer-deps
  - prefer-dedupe
  - package-lock
  - package-lock-only
  - foreground-scripts
  - ignore-scripts
  - audit
  - bin-links
  - fund
  - dry-run
  - cpu
  - os
  - libc
  - workspace
  - workspaces
  - include-workspace-root
  - install-links
```

---

TITLE: npm start Command API Reference
DESCRIPTION: Comprehensive API documentation for the `npm start` command, detailing its purpose, synopsis, and general configuration options.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-start>

LANGUAGE: APIDOC
CODE:

```
Command: npm start
Synopsis: npm start [-- <args>]
Description: This runs a predefined command specified in the "start" property of a package's "scripts" object.
If the "scripts" object does not define a "start" property, npm will run `node server.js`.
Configuration:
  ignore-scripts
  script-shell
```

---

TITLE: Install Package from Tarball URL
DESCRIPTION: Fetches and installs a package from a remote tarball URL. To distinguish this option, the argument must explicitly start with 'http://' or 'https://'.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: Shell
CODE:

```
npm install https://github.com/indexzero/forever/tarball/v0.5.6
```

---

TITLE: Example package.json for npm start script
DESCRIPTION: Demonstrates how to define a `start` script in `package.json` that executes a local dependency's executable, `bar`, which is made available in the `PATH` via `node_modules/.bin`.

SOURCE: <https://docs.npmjs.com/cli/v8/using-npm/scripts>

LANGUAGE: JSON
CODE:

```
{
"name": "foo",
"dependencies": {
"bar": "0.1.x"
},
"scripts": {
"start": "bar ./test"
}
}
```

---

TITLE: Install npm Packages using npm install Command
DESCRIPTION: Demonstrates the basic syntax for the `npm install` command, used to install packages. It also lists common aliases for convenience.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: Shell
CODE:

```
npm install [<package-spec> ...]

aliases: add, i, in, ins, inst, insta, instal, isnt, isnta, isntal, isntall
```

---

TITLE: Check Node.js and npm Installed Versions
DESCRIPTION: This snippet provides commands to verify if Node.js and npm are installed on your system and to display their respective version numbers. It's a quick way to confirm your current setup.

SOURCE: <https://docs.npmjs.com/cli/v11/configuring-npm/install>

LANGUAGE: Shell
CODE:

```
node -v
npm -v
```

---

TITLE: Install npm Packages from GitHub
DESCRIPTION: Demonstrates how to install npm packages directly from a GitHub repository using various `npm install` syntaxes. This method ensures that `dependencies` and `devDependencies` are installed if a `prepare` script is present in the package.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: npm
CODE:

```
npm install mygithubuser/myproject

npm install github:mygithubuser/myproject
```

---

TITLE: Integrate npm ci into Travis CI Configuration
DESCRIPTION: Provides an example of how to configure a `.travis.yml` file to use `npm ci` for dependency installation instead of `npm install`. This setup is crucial for continuous integration environments to ensure reproducible builds. It also includes a cache configuration to speed up subsequent builds by reusing the npm cache.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-ci>

LANGUAGE: YAML
CODE:

```
# .travis.yml
install:
- npm ci
# keep the npm cache around to speed up installs
cache:
  directories:
  - "$HOME/.npm"
```

---

TITLE: Install Packages from Git Remote URL
DESCRIPTION: Examples of installing packages directly from a Git repository using its full remote URL. This includes specifying a commit-ish (branch, tag, or commit hash) or a semver range for the desired version. It also shows how to pass Git environment variables.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
<protocol>://[<user>[:<password>]@]<hostname>[:<port>][:][/]<path>[#<commit-ish> | #semver:<semver>]
```

LANGUAGE: Shell
CODE:

```
npm install git+ssh://git@github.com:npm/cli.git#v1.0.27

npm install git+ssh://git@github.com:npm/cli#pull/273

npm install git+ssh://git@github.com:npm/cli#semver:^5.0

npm install git+https://isaacs@github.com/npm/cli.git

npm install git://github.com/npm/cli.git#v1.0.27

GIT_SSH_COMMAND='ssh -i ~/.ssh/custom_ident' npm install git+ssh://git@github.com:npm/cli.git
```

---

TITLE: Manual npm Global Directory Configuration Steps
DESCRIPTION: A step-by-step guide to manually reconfigure npm's default global installation directory, update the system PATH, and verify the setup by installing a package without `sudo`.

SOURCE: <https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally>

LANGUAGE: bash
CODE:

```
mkdir -p ~/.npm-global/lib
```

LANGUAGE: bash
CODE:

```
npm config set prefix '~/.npm-global'
```

LANGUAGE: bash
CODE:

```
export PATH=~/.npm-global/bin:$PATH
```

LANGUAGE: bash
CODE:

```
source ~/.profile
```

LANGUAGE: bash
CODE:

```
npm install -g jshint
```

---

TITLE: Example: package.json after setting 'start' script
DESCRIPTION: Illustrates the structure of a `package.json` file after the `npm set-script` command has been used to add or modify a script.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-set-script>

LANGUAGE: JSON
CODE:

```
{
"name": "my-project",
"scripts": {
"start": "http-server .",
"test": "some existing value"
}
}
```

---

TITLE: Verify Node.js and npm installed versions
DESCRIPTION: These commands allow users to quickly check if Node.js and npm are already installed on their system and to display their current installed versions. This is a fundamental step for troubleshooting or confirming a successful installation.

SOURCE: <https://docs.npmjs.com/downloading-and-installing-node-js-and-npm>

LANGUAGE: Shell
CODE:

```
node -v
npm -v
```

---

TITLE: npm prefix Global Example
DESCRIPTION: Illustrates the use of `npm prefix -g` to display the global npm prefix. This is the directory where globally installed packages, binaries, and man pages are located.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-prefix>

LANGUAGE: Shell
CODE:

```
npm prefix -g

/usr/local
```

---

TITLE: Create React Project
DESCRIPTION: A practical example of creating a new React-based project using the `create-react-app` initializer.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-init>

LANGUAGE: shell
CODE:

```
npm init react-app ./my-react-app
```

---

TITLE: Installing npm Packages from GitHub Shorthand
DESCRIPTION: Demonstrates installing npm packages directly from GitHub repositories using shorthand notation, with or without the `github:` prefix, and an optional commit-ish.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: shell
CODE:

```
npm install <githubname>/<githubrepo>[#<commit-ish>]

npm install github:<githubname>/<githubrepo>[#<commit-ish>]
```

---

TITLE: Check Node.js and npm Installed Versions
DESCRIPTION: These commands are used to verify if Node.js and npm are installed on the system and to display their current versions. This is a fundamental step for environment setup and troubleshooting.

SOURCE: <https://docs.npmjs.com/cli/v8/configuring-npm/install>

LANGUAGE: Shell
CODE:

```
node -v

npm -v
```

---

TITLE: Troubleshooting npm with Cache Cleaning and Verbose Output
DESCRIPTION: This snippet provides commands to resolve random npm issues by clearing the cache and to get more detailed output during 'npm install' for debugging purposes. Clearing the cache can fix corrupted package data, while verbose output helps diagnose installation problems.

SOURCE: <https://docs.npmjs.com/common-errors>

LANGUAGE: Shell
CODE:

```
npm cache clean
```

LANGUAGE: Shell
CODE:

```
npm install -verbose
```

---

TITLE: Install npm Package from GitHub Repository
DESCRIPTION: Demonstrates how to install an npm package directly from a GitHub repository using its user/project path or the `github:` prefix. This method clones the repository and installs its dependencies.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: bash
CODE:

```
npm install mygithubuser/myproject

  npm install github:mygithubuser/myproject
```

---

TITLE: Prepare Project for npm ci with npm install
DESCRIPTION: Demonstrates the initial steps to set up a project for `npm ci`, including navigating to the project directory, running `npm install` to generate a `package-lock.json` file, and verifying its existence. This ensures the project has the necessary lockfile for `npm ci` to operate correctly.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-ci>

LANGUAGE: Shell
CODE:

```
$ cd ./my/npm/project

$ npm install

added 154 packages in 10s

$ ls | grep package-lock
```

---

TITLE: Install npm Packages from Bitbucket
DESCRIPTION: Shows how to install npm packages from a Bitbucket repository. It supports specifying a commit-ish or a semver range for precise version control, and ensures `dependencies` and `devDependencies` are installed if a `prepare` script exists.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: npm
CODE:

```
npm install bitbucket:mybitbucketuser/myproject
```

---

TITLE: Example Output of npm init --yes
DESCRIPTION: Provides an example of the `package.json` file generated by running `npm init --yes`, showcasing the default fields populated by the command, such as name, version, scripts, and repository information.

SOURCE: <https://docs.npmjs.com/creating-a-package-json-file>

LANGUAGE: JSON
CODE:

```
{
"name": "my_package",
"description": "make your package easier to find on the npm website",
"version": "1.0.0",
"scripts": {
"test": "echo \"Error: no test specified\" && exit 1"
},
"repository": {
"type": "git",
"url": "https://github.com/monatheoctocat/my_package.git"
},
"keywords": [],
"author": "",
"license": "ISC",
"bugs": {
"url": "https://github.com/monatheoctocat/my_package/issues"
},
"homepage": "https://github.com/monatheoctocat/my_package"
}
```

---

TITLE: Default npm Package Installation Behavior
DESCRIPTION: Describes the default behavior of `npm install <pkg>` (without any `@<version>` or `@<tag>` specifier), which installs the version associated with the `latest` distribution tag. This is the standard way to get the most stable release.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-dist-tag>

LANGUAGE: npm
CODE:

```
npm install <pkg>
```

---

TITLE: Example Output for npm profile get
DESCRIPTION: This snippet shows a typical output when retrieving profile information using the `npm profile get` command, displaying various user properties such as name, email, two-factor authentication status, and creation/update timestamps.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-profile>

LANGUAGE: Text
CODE:

```
name: example

email: e@example.com (verified)

two-factor auth: auth-and-writes

fullname: Example User

homepage:

freenode:

twitter:

github:

created: 2015-02-26T01:38:35.892Z

updated: 2017-10-02T21:29:45.922Z
```

---

TITLE: npm-install Command API Reference
DESCRIPTION: Comprehensive API documentation for the `npm install` command, detailing its various configuration options and their effects on package installation behavior. This includes options for saving dependencies, global installation, handling scripts, and workspace management.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
npm-install Command:
  Synopsis:
    npm install [<package-spec> ...]
    Aliases: add, i, in, ins, inst, insta, instal, isnt, isnta, isntal, isntall

  Configuration Options:
    - save
    - save-exact
    - global
    - global-style
    - legacy-bundling
    - omit
    - strict-peer-deps
    - package-lock
    - foreground-scripts
    - ignore-scripts
    - audit
    - bin-links
    - fund
    - dry-run
    - workspace
    - workspaces
    - include-workspace-root
    - install-links

  Other Sections:
    - Algorithm
    - See Also
```

---

TITLE: Defining npm Scripts for Install and Post-Install Lifecycle Events
DESCRIPTION: Illustrates how to define `install` and `postinstall` scripts in `package.json` that point to the same script file. This setup allows a single script to handle different lifecycle phases, requiring internal logic to differentiate behavior based on the `npm_lifecycle_event` environment variable.

SOURCE: <https://docs.npmjs.com/cli/v11/using-npm/scripts>

LANGUAGE: JSON
CODE:

```
{
"scripts": {
"install": "scripts/install.js",
"postinstall": "scripts/install.js"
}
}
```

---

TITLE: Upgrade npm to Latest Version in Node.js Directory
DESCRIPTION: Navigates to the Node.js installation directory and then executes the npm command to install the latest stable version of npm. This is a recommended step for manual upgrades on Windows, particularly when using Option 3 for upgrading.

SOURCE: <https://docs.npmjs.com/try-the-latest-stable-version-of-npm>

LANGUAGE: Shell
CODE:

```
cd %ProgramFiles%\nodejs
npm install npm@latest
```

---

TITLE: npm Configuration: foreground-scripts
DESCRIPTION: Runs all build scripts (preinstall, install, and postinstall) for installed packages in the foreground process, sharing standard input, output, and error with the main npm process. This generally makes installs slower and noisier but is useful for debugging.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install-test>

LANGUAGE: APIDOC
CODE:

```
foreground-scripts:
  Default: false
  Type: Boolean
  Description: Run all build scripts (ie, `preinstall`, `install`, and `postinstall`) scripts for installed packages in the foreground process, sharing standard input, output, and error with the main npm process.
  Note: This will generally make installs run slower, and be much noisier, but can be useful for debugging.
```

---

TITLE: npm install Command Overview and Dependency Resolution
DESCRIPTION: This section describes the core functionality of the `npm install` command, including how it resolves dependencies based on lock files (`npm-shrinkwrap.json`, `package-lock.json`, `yarn.lock`) and defines what constitutes a 'package' in the npm ecosystem. It also covers the default behavior of `npm install` when executed without arguments, installing local dependencies and handling production flags.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
npm install:
  Description: Installs a package and its dependencies. If a package-lock, npm shrinkwrap, or yarn lock file exists, installation is driven by it.
  Dependency Resolution Precedence:
    1. npm-shrinkwrap.json
    2. package-lock.json
    3. yarn.lock
  Definition of a Package:
    a) A folder containing a program described by a package.json file
    b) A gzipped tarball containing (a)
    c) A url that resolves to (b)
    d) A <name>@<version> that is published on the registry
    e) A <name>@<tag> that points to (d)
    f) A <name> that has a "latest" tag satisfying (e)
    g) A <git remote url> that resolves to (a)
  Usage (no arguments):
    npm install (in a package directory):
      - Installs dependencies to the local node_modules folder.
      - In global mode (-g or --global), installs the current package context as a global package.
      - By default, installs all modules listed as dependencies in package.json.
      - --production flag: Prevents installation of modules listed in devDependencies.
      - NODE_ENV=production: Same behavior as --production.
      - --production=false: Installs all modules (dependencies and devDependencies) even when NODE_ENV=production.
      Note: The --production flag has no particular meaning when adding a dependency to a project.
```

---

TITLE: Install npm Package from GitHub Gist
DESCRIPTION: Shows how to install an npm package from a GitHub Gist using its ID. The command clones the Gist and installs its dependencies, optionally allowing a GitHub username prefix.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: bash
CODE:

```
npm install gist:101a11beef
```

---

TITLE: Executing Local Package Binaries with Arguments
DESCRIPTION: This example demonstrates how to run a binary from a locally installed npm package (`tap`) using both `npm exec` and `npx`, passing additional arguments (`--bail test/foo.js`) to the executed command. It shows the common pattern for executing package-provided tools.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npx>

LANGUAGE: bash
CODE:

```
npm exec -- tap --bail test/foo.js
npx tap --bail test/foo.js
```

---

TITLE: Retrieve Global npm Package Prefix
DESCRIPTION: Displays the current global installation prefix for npm packages. This command helps verify where npm is configured to install global packages on the system, which is crucial for correct package resolution.

SOURCE: <https://docs.npmjs.com/try-the-latest-stable-version-of-npm>

LANGUAGE: Shell
CODE:

```
npm config get prefix -g
```

---

TITLE: npm init Command Transformation Examples
DESCRIPTION: Illustrates how `npm init` commands are transformed into `npm exec` operations, detailing the mapping for various initializer formats including scoped packages and versions.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-init>

LANGUAGE: shell
CODE:

```
npm init foo -> npm exec create-foo
npm init @usr/foo -> npm exec @usr/create-foo
npm init @usr -> npm exec @usr/create
npm init @usr@2.0.0 -> npm exec @usr/create@2.0.0
npm init @usr/foo@2.0.0 -> npm exec @usr/create-foo@2.0.0
```

---

TITLE: Set Up Local Test Environment for npm Module
DESCRIPTION: Steps to create a new directory, navigate into it, and install a newly published npm module locally. This setup is crucial for testing the module's functionality in an isolated environment before broader use.

SOURCE: <https://docs.npmjs.com/creating-node-js-modules>

LANGUAGE: bash
CODE:

```
mkdir test-directory
```

LANGUAGE: bash
CODE:

```
cd /path/to/test-directory
```

LANGUAGE: bash
CODE:

```
npm install <your-module-name>
```

---

TITLE: Install npm Package from Bitbucket Repository
DESCRIPTION: Illustrates installing an npm package from a Bitbucket repository. The command clones the specified Bitbucket repository and installs its associated dependencies.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: bash
CODE:

```
npm install bitbucket:mybitbucketuser/myproject
```

---

TITLE: npm Option: ignore-scripts
DESCRIPTION: Prevents npm from executing scripts defined in `package.json` files during installation. However, commands explicitly designed to run scripts (e.g., `npm start`) will still function.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
ignore-scripts:
  Default: false
  Type: Boolean
  Description: If true, npm does not run scripts specified in package.json files.
  Note: Commands explicitly intended to run a particular script, such as `npm start`, `npm stop`, `npm restart`, `npm test`, and `npm run` will still run their intended script if `ignore-scripts` is set, but they will *not* run any pre- or post-scripts.
```

---

TITLE: Example npm `node_modules` Folder Structure
DESCRIPTION: Illustrates the physical layout of packages within `node_modules` directories based on the example dependency graph. It demonstrates how npm resolves and places dependencies to optimize for cycles and version conflicts, avoiding redundant installations.

SOURCE: <https://docs.npmjs.com/cli/v8/configuring-npm/folders>

LANGUAGE: text
CODE:

```
foo

+-- node_modules

+-- blerg (1.2.5) <---[A]

+-- bar (1.2.3) <---[B]

|   `-- node_modules

|       +-- baz (2.0.2) <---[C]

|       |   `-- node_modules

|       |       `-- quux (3.2.0)

|       `-- asdf (2.3.4)

`-- baz (1.2.3) <---[D]

`-- node_modules

`-- quux (3.2.0) <---[E]
```

---

TITLE: Initialize a Node.js Module with npm init
DESCRIPTION: Instructions for creating a `package.json` file using the `npm init` command. It includes variations for both unscoped and scoped modules, guiding the user through the initial setup of their Node.js project.

SOURCE: <https://docs.npmjs.com/creating-node-js-modules>

LANGUAGE: bash
CODE:

```
npm init
```

LANGUAGE: bash
CODE:

```
npm init --scope=@scope-name
```

---

TITLE: Example Usage of `npm exec` with `--call` Option
DESCRIPTION: Demonstrates how to use the `--call` option with `npm exec` to run a custom command after installing specified packages, such as `yo node` from `generator-node`.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-exec>

LANGUAGE: bash
CODE:

```
npm exec --package yo --package generator-node --call "yo node"
```

---

TITLE: Run `tap` with arguments using `npm exec` and `npx`
DESCRIPTION: Demonstrates how to execute the `tap` command, installed as a local dependency, passing additional arguments like `--bail` and a test file. This example highlights the use of `--` with `npm exec` to separate npm's options from the command's arguments, and the direct usage with `npx`.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npx>

LANGUAGE: Shell
CODE:

```
npm exec -- tap --bail test/foo.js
```

LANGUAGE: Shell
CODE:

```
npx tap --bail test/foo.js
```

---

TITLE: npm install Configuration Options
DESCRIPTION: Details key configuration parameters that influence the behavior of `npm install`, including how packages are saved to `package.json`, whether exact versions are used, and if packages are installed globally.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
save:
  Default: true (unless npm update where it defaults to false)
  Type: Boolean
  Description: Save installed packages to a `package.json` file as dependencies. When used with `npm rm`, removes the dependency from `package.json`. Prevents writing to `package-lock.json` if set to `false`.
save-exact:
  Default: false
  Type: Boolean
  Description: Dependencies saved to package.json will be configured with an exact version rather than using npm's default semver range operator.
global:
  Default: false
  Type: Boolean
  Description: Operates in "global" mode, so that packages are installed into the `prefix` folder instead of the current working directory. Packages are installed into `{prefix}/lib/node_modules`, bin files are linked to `{prefix}/bin`, and man pages are linked to `{prefix}/share/man`.
```

---

TITLE: npm package.json Workspaces Configuration Example
DESCRIPTION: Example of `workspaces` array in `package.json` defining the order of execution for commands run across multiple workspaces.

SOURCE: <https://docs.npmjs.com/cli/v11/using-npm/workspaces>

LANGUAGE: json
CODE:

```
{
"workspaces": [ "packages/a", "packages/b" ]
}
```

---

TITLE: npm Workspace Directory Structure Examples
DESCRIPTION: These text-based diagrams show the typical file structure for an npm project utilizing workspaces, both before and after running 'npm install'. It highlights how workspace packages are symlinked into the root 'node_modules' folder.

SOURCE: <https://docs.npmjs.com/cli/v8/using-npm/workspaces>

LANGUAGE: text
CODE:

```
.
+-- package.json
`-- packages
+-- a
|   `-- package.json
```

LANGUAGE: text
CODE:

```
.
+-- node_modules
|  `-- a -> ../packages/a
+-- package-lock.json
+-- package.json
`-- packages
+-- a
|   `-- package.json
```

---

TITLE: npm foreground-scripts Configuration Option
DESCRIPTION: Runs all build scripts (preinstall, install, postinstall) in the foreground process, sharing standard I/O with the main npm process.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install-ci-test>

LANGUAGE: APIDOC
CODE:

```
foreground-scripts:
  Default: false
  Type: Boolean
  Description: Run all build scripts (ie, `preinstall`, `install`, and `postinstall`) scripts for installed packages in the foreground process, sharing standard input, output, and error with the main npm process.
  Note: This will generally make installs run slower, and be much noisier, but can be useful for debugging.
```

---

TITLE: Check npm Version
DESCRIPTION: This command displays the currently installed version of npm in the command line.

SOURCE: <https://docs.npmjs.com/try-the-latest-stable-version-of-npm>

LANGUAGE: Shell
CODE:

```
npm -v
```

---

TITLE: Uninstall Global npm Package
DESCRIPTION: Commands to remove a globally installed npm package. The -g flag ensures the package is uninstalled from your system's global npm installation directory.

SOURCE: <https://docs.npmjs.com/uninstalling-packages-and-dependencies>

LANGUAGE: CLI
CODE:

```
npm uninstall -g <package_name>
```

LANGUAGE: CLI
CODE:

```
npm uninstall -g <@scope/package_name>
```

LANGUAGE: CLI
CODE:

```
npm uninstall -g jshint
```

---

TITLE: Example npm Workspaces Directory Structure
DESCRIPTION: Shows a typical directory structure for an npm project utilizing workspaces, where individual packages reside within a `packages` directory. This setup allows for managing multiple related packages within a single repository.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-run-script>

LANGUAGE: Text
CODE:

```
.
+-- package.json
`-- packages
    +-- a
    |   `-- package.json
    +-- b
    |   `-- package.json
    `-- c
        `-- package.json
```

---

TITLE: npm start Command
DESCRIPTION: Starts a package by running its 'start' script.

SOURCE: <https://docs.npmjs.com/cli/v11/commands>

LANGUAGE: APIDOC
CODE:

```
Command: npm start
Description: Start a package
```

---

TITLE: npm CLI Commands Reference
DESCRIPTION: A comprehensive list of available npm command-line interface commands, each linking to more detailed documentation.

SOURCE: <https://docs.npmjs.com/try-the-latest-stable-version-of-npm>

LANGUAGE: APIDOC
CODE:

```
npm fund
npm help
npm help-search
npm init
npm install
npm install-ci-test
npm install-test
npm link
npm login
npm logout
npm ls
npm org
npm outdated
npm owner
npm pack
npm ping
npm pkg
npm prefix
npm profile
npm prune
npm publish
npm query
npm rebuild
npm repo
npm restart
npm root
npm run
npm sbom
npm search
npm shrinkwrap
npm star
npm stars
npm start
npm stop
npm team
npm test
npm token
npm undeprecate
npm uninstall
npm unpublish
npm unstar
npm update
npm version
npm view
npm whoami
npx
```

---

TITLE: Using make commands in npm lifecycle scripts
DESCRIPTION: Shows an example of defining npm scripts (`preinstall`, `install`, `test`) that execute `make` commands, demonstrating that npm scripts can run any executable command, including build system tools.

SOURCE: <https://docs.npmjs.com/cli/v8/using-npm/scripts>

LANGUAGE: JSON
CODE:

```
{
"scripts": {
"preinstall": "./configure",
"install": "make && make install",
"test": "make test"
}
}
```

---

TITLE: npm Option: foreground-scripts
DESCRIPTION: Determines if lifecycle scripts (like `preinstall`, `install`, `postinstall`) for installed packages run in the foreground, sharing I/O with the main npm process. This can aid debugging but may slow down installations.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: APIDOC
CODE:

```
foreground-scripts:
  Default: `false` unless when using `npm pack` or `npm publish` where it defaults to `true`
  Type: Boolean
  Description: Run all build scripts (ie, `preinstall`, `install`, and `postinstall`) scripts for installed packages in the foreground process, sharing standard input, output, and error with the main npm process.
  Note: This will generally make installs run slower, and be much noisier, but can be useful for debugging.
```

---

TITLE: Execute npm install-ci-test Command
DESCRIPTION: Demonstrates the basic command-line usage of `npm install-ci-test`, which performs a clean installation and then runs tests. Includes common aliases for the command.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install-ci-test>

LANGUAGE: Shell
CODE:

```
npm install-ci-test

aliases: cit, clean-install-test, sit
```

---

TITLE: npm init Command Synopsis
DESCRIPTION: This snippet outlines the various ways to invoke the `npm init` command, demonstrating its syntax for initializing a project with a package specifier or a scoped package, and lists its common aliases.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-init>

LANGUAGE: APIDOC
CODE:

```
npm init <package-spec> (same as `npx <package-spec>)

npm init <@scope> (same as `npx <@scope>/create`)

aliases: create, innit
```

---

TITLE: Create a new React-based project
DESCRIPTION: Example of using `npm init` to create a new React application using the `create-react-app` initializer. This command sets up a new project directory with a React boilerplate.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-init>

LANGUAGE: Shell
CODE:

```
npm init react-app ./my-react-app
```

---

TITLE: Install Package from Local Folder
DESCRIPTION: Installs a package located in a local folder. If the folder is within the project root, its dependencies are installed and may be hoisted. If the folder is outside the project root, npm creates a symlink to it. Use `--install-links` to install content like a registry package instead of linking.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm-install>

LANGUAGE: Shell
CODE:

```
npm install ../../other-package --install-links

npm install ./sub-package
```

---

TITLE: Example package.json Scripts for npm Version Lifecycle
DESCRIPTION: Provides an example `package.json` `scripts` section demonstrating the `preversion`, `version`, and `postversion` hooks. These scripts allow for automated tasks like running tests, building assets, adding files to Git, pushing to remote, and cleaning up, integrated into the versioning process.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-version>

LANGUAGE: JSON
CODE:

```
{
"scripts": {
"preversion": "npm test",
"version": "npm run build && git add -A dist",
"postversion": "git push && git push --tags && rm -rf build/temp"
}
}
```

---

TITLE: Using npm Guidelines and Concepts
DESCRIPTION: Essential concepts and guidelines for effectively using npm, covering interactions with the npm registry, package specifications, logging, scope management, script execution, and managing workspaces. This section provides foundational knowledge for daily npm usage.

SOURCE: <https://docs.npmjs.com/creating-an-organization>

LANGUAGE: APIDOC
CODE:

```
Registry
Package spec
Config
Logging
Scope
Scripts
Workspaces
Organizations
Dependency Selectors
Developers
Removal
Changelog
```

---

TITLE: Configuring npm Scripts for Build and Test with Make Commands
DESCRIPTION: Shows an example of `package.json` scripts that integrate `make` commands for `preinstall`, `install`, and `test` phases. This demonstrates how to execute shell commands directly within npm scripts for compilation and testing workflows, providing flexibility for complex build processes.

SOURCE: <https://docs.npmjs.com/cli/v11/using-npm/scripts>

LANGUAGE: JSON
CODE:

```
{
"scripts": {
"preinstall": "./configure",
"install": "make && make install",
"test": "make test"
}
}
```

---

TITLE: Test Package Installation in External Folder
DESCRIPTION: Simulate a real-world installation by navigating to another directory and installing your local package using `npm install ../my-package`. This verifies the package's installability and functionality when used as a dependency.

SOURCE: <https://docs.npmjs.com/cli/v11/using-npm/developers>

LANGUAGE: npm
CODE:

```
cd ../some-other-folder
npm install ../my-package
```

---

TITLE: Basic npm Command Synopsis
DESCRIPTION: Illustrates the fundamental way to invoke the npm command-line tool. This basic syntax is the starting point for executing any npm operation, typically followed by a specific command and its arguments.

SOURCE: <https://docs.npmjs.com/cli/v11/commands/npm>

LANGUAGE: CLI
CODE:

```
npm
```

---

TITLE: Installing npm Packages with Aliases
DESCRIPTION: Illustrates how to install npm packages under a custom alias, allowing side-by-side installation of different versions or more convenient naming.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-install>

LANGUAGE: shell
CODE:

```
npm install my-react@npm:react

npm install jquery2@npm:jquery@2

npm install jquery3@npm:jquery@3

npm install npa@npm:npm-package-arg
```

---

TITLE: Filter npm install versions by date
DESCRIPTION: If passed to 'npm install', will rebuild the npm tree such that only versions that were available on or before the '--before' time get installed. If there's no versions available for the current set of direct dependencies, the command will error. If the requested version is a 'dist-tag' and the given tag does not pass the '--before' filter, the most recent version less than or equal to that tag will be used.

SOURCE: <https://docs.npmjs.com/cli/v11/using-npm/config>

LANGUAGE: APIDOC
CODE:

```markdown
before:
Default: null
Type: null or Date
Description: If passed to 'npm install', rebuilds the npm tree to include only versions available on or before the specified time. If no versions are available for direct dependencies, the command will error. For dist-tags, if the tag doesn't pass the filter, the most recent version less than or equal to that tag will be used.
```

---

TITLE: Create ESM-compatible Package
DESCRIPTION: Demonstrates how to set up a new `esm`-compatible package using `create-esm`, including directory creation and non-interactive initialization.

SOURCE: <https://docs.npmjs.com/cli/v8/commands/npm-init>

LANGUAGE: shell
CODE:

```
mkdir my-esm-lib && cd my-esm-lib
npm init esm --yes
```
