<!-- markdownlint-disable -->
========================
CODE SNIPPETS
========================

TITLE: Run Python REPL with mise exec
DESCRIPTION: Launches an interactive Python 3 REPL using `mise exec`. If Python 3 is not installed, mise will download and install it before starting the REPL.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_9>

LANGUAGE: sh
CODE:

```
mise exec python@3 -- python
# this will download and install Python if it is not already installed
# Python 3.13.2
# >>> ...
```

----------------------------------------

TITLE: Verify mise CLI Installation
DESCRIPTION: Checks if the mise CLI has been installed correctly by displaying its version. This command is typically run after installation to confirm successful setup.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_8>

LANGUAGE: sh
CODE:

```
~/.local/bin/mise --version
# mise 2024.x.x
```

----------------------------------------

TITLE: Install mise CLI via apt (Debian/Ubuntu amd64)
DESCRIPTION: Installs mise on Debian/Ubuntu systems for the amd64 architecture using the apt package manager. It involves adding a GPG key and repository source.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_5>

LANGUAGE: sh
CODE:

```
sudo apt update -y && sudo apt install -y gpg sudo wget curl
sudo install -dm 755 /etc/apt/keyrings
wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | sudo tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null
echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main" | sudo tee /etc/apt/sources.list.d/mise.list
sudo apt update
sudo apt install -y mise
```

----------------------------------------

TITLE: Install mise CLI via winget (Windows)
DESCRIPTION: Installs mise on Windows using the Windows Package Manager (winget). This command leverages the winget CLI to fetch and install the mise package.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_2>

LANGUAGE: powershell
CODE:

```
winget install jdx.mise
```

----------------------------------------

TITLE: Example mise Configuration
DESCRIPTION: Demonstrates a typical mise configuration file showing how to specify global tool versions. This file is updated when you run commands like `mise use --global`.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_17>

LANGUAGE: toml
CODE:

```
[tools]
node = "22"
```

----------------------------------------

TITLE: Install mise CLI via apt (Debian/Ubuntu arm64)
DESCRIPTION: Installs mise on Debian/Ubuntu systems for the arm64 architecture using the apt package manager. It includes steps to add the GPG key and repository source.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_6>

LANGUAGE: sh
CODE:

```
sudo apt update -y && sudo apt install -y gpg sudo wget curl
sudo install -dm 755 /etc/apt/keyrings
wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | sudo tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null
echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=arm64] https://mise.jdx.dev/deb stable main" | sudo tee /etc/apt/sources.list.d/mise.list
sudo apt update
sudo apt install -y mise
```

----------------------------------------

TITLE: Mise Development Setup and Build
DESCRIPTION: Guides for setting up the Mise development environment, including cloning the repository, installing dependencies, and building the project.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/contributing.md#_snippet_15>

LANGUAGE: bash
CODE:

```
# Clone the repository
git clone https://github.com/jdx/mise.git
cd mise

# Install dependencies
mise install

# Build the project
mise run build
```

----------------------------------------

TITLE: Direct Git Installation Method
DESCRIPTION: Illustrates how users can install a plugin directly from its Git repository using the `mise plugin install` command.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_12>

LANGUAGE: bash
CODE:

```
mise plugin install my-plugin https://github.com/username/my-plugin
```

----------------------------------------

TITLE: Install mise CLI via curl (Linux/macOS)
DESCRIPTION: Installs mise using a curl script, suitable for interactive shells like bash, zsh, or fish. The default installation directory is `~/.local/bin`, which mise automatically adds to the PATH.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_0>

LANGUAGE: sh
CODE:

```
curl https://mise.run | sh
```

----------------------------------------

TITLE: Install mise CLI via scoop (Windows)
DESCRIPTION: Installs mise on Windows using the Scoop package manager. This method is an alternative for Windows users who prefer Scoop for managing applications.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_3>

LANGUAGE: sh
CODE:

```
# https://github.com/ScoopInstaller/Main/pull/6374
scoop install mise
```

----------------------------------------

TITLE: Example: Simple Backend Plugin Release
DESCRIPTION: A step-by-step example of preparing, testing locally, and releasing a simple backend plugin, including updating metadata and tagging the release.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_23>

LANGUAGE: bash
CODE:

```
# 1. Prepare plugin
cd my-backend-plugin
echo "Updated backend methods" > metadata.lua

# 2. Test locally
mise plugin link my-plugin .
mise ls-remote my-plugin:tool

# 3. Release
git add .
git commit -m "v1.0.0: Initial release"
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

----------------------------------------

TITLE: Install mise CLI via dnf (Fedora/RHEL)
DESCRIPTION: Installs mise on Fedora 41+ and RHEL/CentOS Stream 9+ systems using the dnf package manager. This involves enabling a COPR repository before installing.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_7>

LANGUAGE: sh
CODE:

```
sudo dnf copr enable jdxcode/mise
sudo dnf install mise
```

----------------------------------------

TITLE: Local Pre-commit Equivalents (Husky-based)
DESCRIPTION: Cortex-OS uses Husky for git hooks. Hooks run automatically on commit.
If you want to run quick pre-commit style checks manually, use these commands.

LANGUAGE: bash
CODE:

```
# Format + lint staged files
pnpm biome:staged

# Run quick, low-risk tests
pnpm test:safe

# Emergency: bypass hooks (use sparingly)
HUSKY=0 git commit -m "bypass hooks"
```

----------------------------------------

TITLE: Install mise CLI via Chocolatey (Windows)
DESCRIPTION: Installs mise on Windows using the Chocolatey package manager. This command uses the choco CLI to install the mise package.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_4>

LANGUAGE: powershell
CODE:

```
choco install mise
```

----------------------------------------

TITLE: Install mise CLI via Homebrew (macOS)
DESCRIPTION: Installs mise using the Homebrew package manager on macOS. This is a convenient method for users already utilizing Homebrew for software management.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_1>

LANGUAGE: sh
CODE:

```
brew install mise
```

----------------------------------------

TITLE: Mise Development Setup
DESCRIPTION: Guides users through setting up a development environment for Mise, including cloning the repository, installing dependencies, building the project, and creating a development shim for direct execution.

SOURCE: <https://github.com/jdx/mise/blob/main/llms.txt#_snippet_18>

LANGUAGE: bash
CODE:

```
# Clone the repository
git clone https://github.com/jdx/mise.git
cd mise

# Install dependencies and build
mise run build

# Run sanity check
mise run build
```

LANGUAGE: bash
CODE:

```
# Create ~/.local/bin/@mise
#!/bin/sh
exec cargo run -q --all-features --manifest-path ~/src/mise/Cargo.toml -- "$@"

# Use @mise to run the development version
@mise --help
eval "$(@mise activate zsh)"
```

----------------------------------------

TITLE: Example: Tool Plugin with Hooks
DESCRIPTION: An example demonstrating the process for a tool plugin, including running tests, updating the version in metadata, and releasing the new version with added hook functionality.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_24>

LANGUAGE: bash
CODE:

```
# 1. Prepare plugin
cd my-tool-plugin
./test/test.sh  # Run tests

# 2. Update version
sed -i 's/version = "1.0.0"/version = "1.1.0"/' metadata.lua

# 3. Release
git add .
git commit -m "v1.1.0: Add new hook functionality"
git tag -a v1.1.0 -m "Add new hook functionality"
git push origin v1.1.0
```

----------------------------------------

TITLE: Install Mise Plugin from GitHub
DESCRIPTION: Demonstrates how to install a plugin from a public GitHub repository using the 'mise plugin install' command. This is the standard method for adding plugins from hosted Git repositories.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_13>

LANGUAGE: bash
CODE:

```
mise plugin install my-plugin https://github.com/username/my-plugin
```

----------------------------------------

TITLE: Mise Plugin Installation Example
DESCRIPTION: Demonstrates how to install a mise plugin directly from a Git URL without modifying the `mise.toml` configuration.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/configuration.md#_snippet_12>

LANGUAGE: shell
CODE:

```
mise plugin install plugin <GIT_URL>
```

----------------------------------------

TITLE: Troubleshooting Plugin Installation
DESCRIPTION: Provides commands to diagnose common plugin installation problems, such as checking repository URLs, verifying plugin metadata files, and testing local installations.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_20>

LANGUAGE: bash
CODE:

```
# Check repository URL
git clone https://github.com/username/my-plugin.git

# Verify metadata.lua exists
ls -la my-plugin/metadata.lua

# Test locally
mise plugin link my-plugin ./my-plugin
```

----------------------------------------

TITLE: Set Global Node.js Version with mise use
DESCRIPTION: Installs Node.js version 22 and sets it as the global default using `mise use --global`. This ensures subsequent `mise exec` commands without a specific version will use Node.js 22.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_11>

LANGUAGE: sh
CODE:

```
mise use --global node@22 # install node 22 and set it as the global default
```

----------------------------------------

TITLE: GitLab CI Dockerfile Setup
DESCRIPTION: Provides a Dockerfile example for GitLab CI that installs Mise globally. It includes necessary build tools and demonstrates how to install Mise using a specific version.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/continuous-integration.md#_snippet_3>

LANGUAGE: dockerfile
CODE:

```
FROM debian:12-slim

RUN apt-get update  \
    && apt-get -y --no-install-recommends install  \
      # install any tools you need
      sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://mise.run | MISE_VERSION=v... MISE_INSTALL_PATH=/usr/local/bin/mise sh

```

----------------------------------------

TITLE: Install Mise Plugin from Archive
DESCRIPTION: Explains how to install a plugin distributed as an archive file (e.g., a ZIP release) by providing the direct URL to the archive.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_17>

LANGUAGE: bash
CODE:

```
# Create release archive (example using git archive)
git archive --format=zip --output=my-plugin-v1.2.3.zip v1.2.3

# Users can install from archive
mise plugin install my-plugin https://github.com/username/my-plugin/releases/download/v1.2.3/my-plugin-v1.2.3.zip
```

----------------------------------------

TITLE: Example Plugin: Install Tool
DESCRIPTION: Installs a downloaded tool by extracting the archive and copying the executable to the installation path.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/asdf-legacy-plugins.md#_snippet_17>

LANGUAGE: bash
CODE:

```
#!/usr/bin/env bash
# bin/install
set -e
cd "$ASDF_DOWNLOAD_PATH"
tar -xzf tool.tar.gz
cp tool "$ASDF_INSTALL_PATH/bin/"
chmod +x "$ASDF_INSTALL_PATH/bin/tool"
```

----------------------------------------

TITLE: Install Mise Plugin from Other Git Providers
DESCRIPTION: Illustrates installing plugins from Git providers other than GitHub, such as GitLab, by providing the respective repository URL.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_15>

LANGUAGE: bash
CODE:

```
mise plugin install my-plugin https://gitlab.com/username/my-plugin
```

----------------------------------------

TITLE: Install Mise Plugin from Private Repository
DESCRIPTION: Details methods for installing plugins from private Git repositories, recommending SSH access for security and ease of use, or HTTPS with a personal access token.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_16>

LANGUAGE: bash
CODE:

```
# SSH access (recommended)
mise plugin install my-plugin git@github.com:username/private-plugin.git

# HTTPS with token
mise plugin install my-plugin https://username:token@github.com/username/private-plugin.git
```

----------------------------------------

TITLE: PowerShell Windows Test Example
DESCRIPTION: Demonstrates testing Windows-specific functionality using PowerShell scripts. This example shows how to install a tool (Go) and verify its installation via version command.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/architecture.md#_snippet_14>

LANGUAGE: powershell
CODE:

```
Describe "go" {
    It "installs go" {
        mise install go@latest
        go version | Should -Match "go version"
    }
}
```

----------------------------------------

TITLE: Mise Development Setup and Cleanup
DESCRIPTION: Commands for installing development versions of Mise and cleaning up build artifacts.

SOURCE: <https://github.com/jdx/mise/blob/main/CLAUDE.md#_snippet_5>

LANGUAGE: shell
CODE:

```
mise run install-dev
mise run clean
```

----------------------------------------

TITLE: Symlinked Installations Example
DESCRIPTION: Demonstrates how tool installations are represented as symbolic links to the cached extracted content, promoting space efficiency and faster installations.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/dev-tools/backends/http.md#_snippet_11>

LANGUAGE: bash
CODE:

```
~/.local/share/mise/installs/http-my-tool/1.0.0 → ~/.cache/mise/http-tarballs/71f774.../extracted
```

----------------------------------------

TITLE: Example Plugin: vfox-npm Usage
DESCRIPTION: Demonstrates the complete lifecycle of using the `vfox-npm` example plugin, from installation to using managed tools like Prettier and ESLint.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-usage.md#_snippet_12>

LANGUAGE: bash
CODE:

```
# Install the plugin
mise plugin install vfox-npm https://github.com/jdx/vfox-npm

# Install tools
mise install vfox-npm:prettier@latest
mise install vfox-npm:eslint@latest

# Use them
mise use vfox-npm:prettier@latest
mise exec vfox-npm:prettier -- --check .
```

----------------------------------------

TITLE: Bash: mise Backend Plugin Usage Example
DESCRIPTION: Demonstrates how to install and use a backend plugin like vfox-npm with mise. It covers installing the plugin, listing versions, installing a specific version, and executing the tool.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/backend-plugin-development.md#_snippet_8>

LANGUAGE: bash
CODE:

```
# Install the plugin
mise plugin install vfox-npm https://github.com/jdx/vfox-npm

# List available versions
mise ls-remote vfox-npm:prettier

# Install a specific version
mise install vfox-npm:prettier@3.0.0

# Use in a project
mise use vfox-npm:prettier@latest

# Execute the tool
mise exec -- prettier --help
```

----------------------------------------

TITLE: List Installed and Requested Tools
DESCRIPTION: Demonstrates how to use `mise ls` to view all installed tools, their versions, their source (global config, project config), and how they are requested.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/demo.md#_snippet_3>

LANGUAGE: shell
CODE:

```
mise ls
# Tool       Version  Source                      Requested
# go         1.24.1   ~/.config/mise/config.toml  latest
# jq         1.7.1    ~/.config/mise/config.toml  latest
# node       22.14.0  ~/.config/mise/config.toml  lts
# terraform  1.11.3   ~/.config/mise/config.toml  latest
```

----------------------------------------

TITLE: Install Specific Version of Mise Plugin
DESCRIPTION: Shows how to install a specific version or tag of a plugin from a GitHub repository by appending the tag to the repository URL.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_14>

LANGUAGE: bash
CODE:

```
mise plugin install my-plugin https://github.com/username/my-plugin@v1.2.3
```

----------------------------------------

TITLE: Install Multiple Tools Globally
DESCRIPTION: Illustrates installing several tools (e.g., terraform, jq, go) and setting them as global defaults simultaneously. This simplifies setting up a development environment with common utilities.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/demo.md#_snippet_2>

LANGUAGE: shell
CODE:

```
mise use -g terraform jq go
# mise jq@1.7.1 ✓ installed
# mise terraform@1.11.3 ✓ installed
# mise go@1.24.1 ✓ installed
# mise ~/.config/mise/config.toml tools: go@1.24.1, jq@1.7.1, terraform@1.11.3
```

LANGUAGE: shell
CODE:

```
terraform -v
# Terraform v1.11.3
```

LANGUAGE: shell
CODE:

```
jq --version
# jq-1.7
```

LANGUAGE: shell
CODE:

```
go version
# go version go1.24.1 linux/amd64
```

----------------------------------------

TITLE: mise en Command Usage Examples
DESCRIPTION: Demonstrates various ways to use the `mise en` command, including starting a shell in the current directory and specifying a shell.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/cli/en.md#_snippet_1>

LANGUAGE: shell
CODE:

```
$ mise en .
$ node -v
v20.0.0

# Skip loading bashrc:
$ mise en -s "bash --norc"

# Skip loading zshrc:
$ mise en -s "zsh -f"
```

----------------------------------------

TITLE: Mise Install All Runtimes
DESCRIPTION: Demonstrates how Mise can install all necessary plugins and runtimes based on configuration files like .tool-versions or .mise-toml with a single command.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/dev-tools/comparison-to-asdf.md#_snippet_1>

LANGUAGE: sh
CODE:

```
mise install
```

----------------------------------------

TITLE: Activate mise for Fish Shell
DESCRIPTION: Adds the mise activation command to your ~/.config/fish/config.fish file to automatically load mise context in fish sessions. This ensures correct tool versions and environment variables are set.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_15>

LANGUAGE: sh
CODE:

```
echo '~/.local/bin/mise activate fish | source' >> ~/.config/fish/config.fish
```

LANGUAGE: sh
CODE:

```
echo 'mise activate fish | source' >> ~/.config/fish/config.fish
```

----------------------------------------

TITLE: Install and Use Tools
DESCRIPTION: Shows how to install specific tool versions globally using `mise use` and then verify their installation and availability by running their version commands. This sets up the project environment with the required development tools.

SOURCE: <https://github.com/jdx/mise/blob/main/README.md#_snippet_2>

LANGUAGE: sh-session
CODE:

```
$ mise use --global node@22 go@1
$ node -v
v22.x.x
$ go version
go version go1.x.x macos/arm64
```

----------------------------------------

TITLE: Initialize Git Repository
DESCRIPTION: Steps to create a new directory for a plugin, initialize a Git repository, add a remote origin, and create initial essential files.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_0>

LANGUAGE: bash
CODE:

```
# Create plugin directory
mkdir my-plugin
cd my-plugin

# Initialize git repository
git init
git remote add origin https://github.com/username/my-plugin.git

# Create initial structure
touch metadata.lua
mkdir -p test
echo "# My Plugin" > README.md
```

----------------------------------------

TITLE: Mise Settings CLI Examples
DESCRIPTION: Illustrates common usage patterns for the `mise settings` command, demonstrating how to list, get, set, and unset configuration values.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/cli/settings.md#_snippet_1>

LANGUAGE: shell
CODE:

```
# List all settings
$ mise settings

# Get the value of the setting "always_keep_download"
$ mise settings always_keep_download

# Set the value of the setting "always_keep_download" to "true"
$ mise settings always_keep_download=true

# Set the value of the setting "node.mirror_url" to "https://npm.taobao.org/mirrors/node"
$ mise settings node.mirror_url https://npm.taobao.org/mirrors/node
```

----------------------------------------

TITLE: Mise Installs Directory Structure Example
DESCRIPTION: Illustrates the typical directory layout for installed tool versions within mise's installs directory. It shows how version prefixes and aliases are created as symlinks to specific tool versions.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/directories.md#_snippet_2>

LANGUAGE: shell
CODE:

```
tree ~/.local/share/mise/installs/node
20 -> ./20.15.0
20.15 -> ./20.15.0
lts -> ./20.15.0
latest -> ./20.15.0
```

----------------------------------------

TITLE: Project Setup with mise
DESCRIPTION: A common workflow for initializing a new project, setting tool versions, installing them, and configuring environment variables.

SOURCE: <https://github.com/jdx/mise/blob/main/llms.txt#_snippet_13>

LANGUAGE: bash
CODE:

```
# Initialize project
cd my-project
mise use node@20 python@3.11
mise install

# Add environment variables
mise set NODE_ENV=development
mise set DATABASE_URL=postgresql://localhost/myapp
```

----------------------------------------

TITLE: Activate mise for Bash Shell
DESCRIPTION: Adds the mise activation command to your ~/.bashrc file to automatically load mise context in bash sessions. This ensures correct tool versions and environment variables are set.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_13>

LANGUAGE: sh
CODE:

```
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
```

LANGUAGE: sh
CODE:

```
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
```

----------------------------------------

TITLE: PostInstall Hook Example (Lua)
DESCRIPTION: Illustrates the PostInstall hook, executed after a SDK version is installed. It handles setting executable permissions on Unix-like systems and configuring npm cache and prefix.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/tool-plugin-development.md#_snippet_11>

LANGUAGE: lua
CODE:

```
-- hooks/post_install.lua
function PLUGIN:PostInstall(ctx)
    local sdkInfo = ctx.sdkInfo['nodejs']
    local path = sdkInfo.path
    local helper = require("lib/helper")
    
    -- Set executable permissions on Unix systems
    if helper.get_os() ~= "win" then
        os.execute("chmod +x " .. path .. "/bin/*")
    end
    
    -- Create npm cache directory
    local npm_cache_dir = path .. "/.npm"
    os.execute("mkdir -p " .. npm_cache_dir)
    
    -- Configure npm to use local cache
    local npm_cmd = path .. "/bin/npm"
    if helper.get_os() == "win" then
        npm_cmd = path .. "/npm.cmd"
    end
    
    os.execute(npm_cmd .. " config set cache " .. npm_cache_dir)
    os.execute(npm_cmd .. " config set prefix " .. path)
end
```

----------------------------------------

TITLE: PreInstall Hook Example
DESCRIPTION: Implements the PreInstall hook to prepare for tool installation. It determines the correct download URL and SHA256 checksum for a given version and platform by fetching data from the Node.js distribution site.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/tool-plugin-development.md#_snippet_9>

LANGUAGE: lua
CODE:

```
-- hooks/pre_install.lua
function PLUGIN:PreInstall(ctx)
    local version = ctx.version
    local helper = require("lib/helper")
    
    -- Determine platform
    local platform = helper.get_platform()
    local extension = platform:match("win") and "zip" or "tar.gz"
    
    -- Build download URL
    local filename = "node-v" .. version .. "-" .. platform .. "." .. extension
    local url = "https://nodejs.org/dist/v" .. version .. "/" .. filename
    
    -- Fetch checksum
    local http = require("http")
    local shasums_url = "https://nodejs.org/dist/v" .. version .. "/SHASUMS256.txt"
    local resp, err = http.get({ url = shasums_url })
    
    local sha256 = nil
    if err == nil then
        -- Extract SHA256 for our file
        for line in resp.body:gmatch("[^\n]+") do
            if line:match(filename) then
                sha256 = line:match("^(%w+)")
                break
            end
        end
    end
    
    return {
        version = version,
        url = url,
        sha256 = sha256,
        note = "Installing Node.js " .. version .. " (" .. platform .. ")"
    }
end
```

----------------------------------------

TITLE: Mise Versioning Example
DESCRIPTION: Demonstrates how 'node@20' typically points to the latest installed version of Node.js 20.x, and how to find this version using mise commands or by checking symlinks.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/faq.md#_snippet_4>

LANGUAGE: shell
CODE:

```
$ ls -l ~/".local/share/mise/installs/node/20"
[...] /home/jdx/.local/share/mise/installs/node/20 -> node-v20.0.0-linux-x64
```

----------------------------------------

TITLE: Activate mise for Zsh Shell
DESCRIPTION: Adds the mise activation command to your ~/.zshrc file to automatically load mise context in zsh sessions. This ensures correct tool versions and environment variables are set.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_14>

LANGUAGE: sh
CODE:

```
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
```

LANGUAGE: sh
CODE:

```
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
```

----------------------------------------

TITLE: Ubi Syntax Examples
DESCRIPTION: Demonstrates various syntaxes for specifying software releases using Ubi, including GitHub shorthand for latest and specific versions, and direct URL syntax.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/dev-tools/backends/ubi.md#_snippet_3>

LANGUAGE: sh
CODE:

```
ubi:goreleaser/goreleaser
ubi:goreleaser/goreleaser@1.25.1
ubi:https://github.com/goreleaser/goreleaser/releases/download/v1.16.2/goreleaser_Darwin_arm64.tar.gz
```

----------------------------------------

TITLE: Check Node.js Version with mise exec
DESCRIPTION: Executes a command (`node -v`) with a specific Node.js version (22) managed by mise. This demonstrates running tools with version constraints.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_10>

LANGUAGE: sh
CODE:

```
mise exec node@22 -- node -v
# v22.x.x
```

----------------------------------------

TITLE: `mise ls --json` Output Example
DESCRIPTION: An example of the JSON output format for the `mise ls` command, showing installed tool versions and their details.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/cli/ls.md#_snippet_2>

LANGUAGE: json
CODE:

```
{
  "node": [
    {
      "version": "20.0.0",
      "install_path": "/Users/jdx/.mise/installs/node/20.0.0",
      "source": {
        "type": "mise.toml",
        "path": "/Users/jdx/mise.toml"
      }
    }
  ],
  "python": [
    {
      "version": "3.11.0",
      "install_path": "/Users/jdx/.mise/installs/python/3.11.0",
      "source": {
        "type": "mise.toml",
        "path": "/Users/jdx/mise.toml"
      }
    }
  ]
}
```

----------------------------------------

TITLE: Install and Set Global Default Tool Version
DESCRIPTION: Shows how to install a tool version and set it as the global default using `mise use --global`. This makes the specified tool version available system-wide.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/demo.md#_snippet_1>

LANGUAGE: shell
CODE:

```
mise use --global node@lts
# v22.14.0
```

LANGUAGE: shell
CODE:

```
node -v
# v22.14.0
```

LANGUAGE: shell
CODE:

```
which node
# /root/.local/share/mise/installs/node/22.14.0/bin/node
```

----------------------------------------

TITLE: Example Mise Project Configuration
DESCRIPTION: A comprehensive `mise.toml` example showcasing the integration of tool management, environment variables, and task definitions for a project. It includes installing Terraform and AWS CLI, setting environment variables like TF_WORKSPACE and AWS_REGION, and defining tasks for terraform plan, validate, and deploy.

SOURCE: <https://github.com/jdx/mise/blob/main/README.md#_snippet_5>

LANGUAGE: toml
CODE:

```
# mise.toml
[tools]
terraform = "1"
aws-cli = "2"

[env]
TF_WORKSPACE = "development"
AWS_REGION = "us-west-2"
AWS_PROFILE = "dev"

[tasks.plan]
description = "Run terraform plan with configured workspace"
run = """
terraform init
terraform workspace select $TF_WORKSPACE
terraform plan
"""

[tasks.validate]
description = "Validate AWS credentials and terraform config"
run = """
aws sts get-caller-identity
terraform validate
"""

[tasks.deploy]
description = "Deploy infrastructure after validation"
depends = ["validate", "plan"]
run = "terraform apply -auto-approve"

```

LANGUAGE: sh-session
CODE:

```
mise install # install tools specified in mise.toml
mise run deploy
```

----------------------------------------

TITLE: Mise Plugins Install Command
DESCRIPTION: Documentation for the `mise plugins install` command, used to install plugins for the mise tool. It supports installing by shorthand name, Git URL, or specific Git references, and includes options for forcing reinstallation, installing all missing plugins, verbose output, and parallel job execution.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/cli/plugins/install.md#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
Mise Plugins Install Command:
  Usage: mise plugins install [FLAGS] [NEW_PLUGIN] [GIT_URL]
  Aliases: i, a, add
  Source code: https://github.com/jdx/mise/blob/main/src/cli/plugins/install.rs

  Installs a plugin for the mise tool. Plugins can be installed by shorthand name, Git URL, or a specific Git reference. Mise can also automatically install plugins when installing tools (e.g., `mise install node@20`). This behavior can be modified in ~/.config/mise/config.toml.

  Arguments:
    [NEW_PLUGIN]
      The name of the plugin to install (e.g., node, ruby).
      Can specify multiple plugins: `mise plugins install node ruby python`.
    [GIT_URL]
      The git url of the plugin.

  Flags:
    -f, --force
      Reinstall even if plugin exists.
    -a, --all
      Install all missing plugins. This will only install plugins that have matching shorthands (i.e., they don't need the full git repo url).
    -v, --verbose
      Show installation output.
    -j, --jobs <JOBS>
      Number of jobs to run in parallel.

  Examples:
    # install the poetry via shorthand
    $ mise plugins install poetry

    # install the poetry plugin using a specific git url
    $ mise plugins install poetry https://github.com/mise-plugins/mise-poetry.git

    # install the poetry plugin using the git url only
    # (poetry is inferred from the url)
    $ mise plugins install https://github.com/mise-plugins/mise-poetry.git

    # install the poetry plugin using a specific ref
    $ mise plugins install poetry https://github.com/mise-plugins/mise-poetry.git#11d0c1e
```

----------------------------------------

TITLE: Release Notes Template
DESCRIPTION: A Markdown template for GitHub release notes, detailing changes categorized by Added, Changed, and Fixed, along with installation instructions.

SOURCE: <https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_11>

LANGUAGE: markdown
CODE:

```
## Changes in v1.2.3

### Added
- New feature X
- Support for Y

### Changed
- Improved performance of Z
- Updated dependencies

### Fixed
- Fixed issue with A
- Resolved bug in B

### Installation
```bash
mise plugin install my-plugin https://github.com/username/my-plugin
```

```

----------------------------------------

TITLE: Install and Activate Node.js
DESCRIPTION: Installs a specified tool version (e.g., Node.js 22) and adds it to the mise.toml configuration file, making it active for the project. The command also shows how to verify the installation.

SOURCE: https://github.com/jdx/mise/blob/main/docs/walkthrough.md#_snippet_0

LANGUAGE: bash
CODE:
```

mkdir example-project && cd example-project
mise use node@22
node -v

# v22.0.0

```

LANGUAGE: toml
CODE:
```

[tools]
node = "22"

```

----------------------------------------

TITLE: Run Script with Specific Node.js Version using mise exec
DESCRIPTION: Executes a JavaScript file (`my-script.js`) using Node.js version 22, which was previously set as the global default. This showcases running project-specific code with managed tool versions.

SOURCE: https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_12

LANGUAGE: sh
CODE:
```

mise exec -- node my-script.js

# run my-script.js with node 22

```

----------------------------------------

TITLE: Activate mise on Windows (Powershell)
DESCRIPTION: Updates the user's PATH environment variable to include the mise shims directory for automatic activation on Windows using Powershell. It also provides commands to open the Powershell profile.

SOURCE: https://github.com/jdx/mise/blob/main/docs/getting-started.md#_snippet_16

LANGUAGE: powershell
CODE:
```

$shimPath = "$env:USERPROFILE\AppData\Local\mise\shims"
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = $currentPath + ";" + $shimPath
[Environment]::SetEnvironmentVariable('Path', $newPath, 'User')

```

LANGUAGE: powershell
CODE:
```

# create profile if it doesn't already exist

if (-not (Test-Path $profile)) { New-Item $profile -Force }

# open the profile

Invoke-Item $profile

```

----------------------------------------

TITLE: Mise Project Scaffolding Example
DESCRIPTION: Demonstrates running a mise preset command to scaffold a new project. It shows the command execution, the output from mise, and the final project state with activated virtual environment.

SOURCE: https://github.com/jdx/mise/blob/main/docs/mise-cookbook/presets.md#_snippet_2

LANGUAGE: shell
CODE:
```

cd my-project
mise preset:pdm 3.10

# [preset:python] $ ~/.config/mise/tasks/preset/python

# mise WARN  No untrusted config files found

# mise ~/my-project/mise.toml tools: pre-commit@4.0.1

# [preset:pdm] $ ~/.config/mise/tasks/preset/pdm 3.10

# mise WARN  No untrusted config files found

# mise ~/my-project/mise.toml tools: python@3.10.15

# mise ~/my-project/mise.toml tools: pdm@2.21.0

# mise creating venv with uv at: ~/my-project/.venv

# Using CPython 3.10.15 interpreter at: /Users/simon/.local/share/mise/installs/python/3.10.15/bin/python

# Creating virtual environment at: .venv

# Activate with: source .venv/bin/activate.fish

~/my-project via 🐍 v3.10.15 (.venv)

# we are in the virtual environment ^

```

----------------------------------------

TITLE: Mise Shims Usage Example
DESCRIPTION: Illustrates how shims, which are symlinks to the mise binary, intercept commands for installed tools. This example shows checking the versions of Node.js and Prettier managed by mise via shims.

SOURCE: https://github.com/jdx/mise/blob/main/docs/dev-tools/shims.md#_snippet_1

LANGUAGE: shell
CODE:
```

ls -l ~/.local/share/mise/shims/node

# Example output

# [...] ~/.local/share/mise/shims/node -> ~/.local/bin/mise

~/.local/share/mise/shims/node -v

# Example output

# v20.0.0

~/.local/share/mise/shims/prettier -v

# Example output

# 3.1.0

```

----------------------------------------

TITLE: Example mise.toml for Node.js Project
DESCRIPTION: A comprehensive `mise.toml` example for a Node.js project. It defines Node.js version, environment variables, PATH configurations, global tool installations (TypeScript, ESLint, Jest), and custom tasks for common development workflows.

SOURCE: https://github.com/jdx/mise/blob/main/docs/mise-cookbook/nodejs.md#_snippet_3

LANGUAGE: toml
CODE:
```

min_version = "2024.9.5"

[env]
_.path = ['{{config_root}}/node_modules/.bin']

# Use the project name derived from the current directory

PROJECT_NAME = "{{ config_root | basename }}"

# Set up the path for node module binaries

BIN_PATH = "{{ config_root }}/node_modules/.bin"

NODE_ENV = "{{ env.NODE_ENV | default(value='development') }}"

[tools]

# Install Node.js using the specified version

node = "{{ env['NODE_VERSION'] | default(value='lts') }}"

# Install some npm packages globally if needed

"npm:typescript" = "latest"
"npm:eslint" = "latest"
"npm:jest" = "latest"

[tasks.install]
alias = "i"
description = "Install npm dependencies"
run = "npm install"

[tasks.start]
alias = "s"
description = "Start the development server"
run = "npm run start"

[tasks.lint]
alias = "l"
description = "Run ESLint"
run = "eslint src/"

[tasks.test]
description = "Run tests"
alias = "t"
run = "jest"

[tasks.build]
description = "Build the project"
alias = "b"
run = "npm run build"

[tasks.info]
description = "Print project information"
run = '''
echo "Project: $PROJECT_NAME"
echo "NODE_ENV: $NODE_ENV"
'''

```

----------------------------------------

TITLE: GitHub Actions Integration
DESCRIPTION: Example of using the `jdx/mise-action` in GitHub Actions to automatically install Mise and project tools. It supports specifying Mise version, installation, caching, and configuration.

SOURCE: https://github.com/jdx/mise/blob/main/docs/continuous-integration.md#_snippet_2

LANGUAGE: yaml
CODE:
```

name: test
on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jdx/mise-action@v2
        with:
          version: 2024.12.14 # [default: latest] mise version to install
          install: true # [default: true] run `mise install`
          cache: true # [default: true] cache mise using GitHub's cache
          experimental: true # [default: false] enable experimental features
          # automatically write this mise.toml file
          mise_toml: |
            [tools]
            shellcheck = "0.9.0"
          # or, if you prefer .tool-versions:
          tool_versions: |
            shellcheck 0.9.0
      - run: shellcheck scripts/*.sh

```

----------------------------------------

TITLE: Manual Installation of Unsupported Java Versions
DESCRIPTION: Instructions for manually installing Java versions not directly supported by mise, involving downloading, symlinking, and macOS-specific setup for compatibility.

SOURCE: https://github.com/jdx/mise/blob/main/docs/lang/java.md#_snippet_2

LANGUAGE: sh
CODE:
```

# 1. Download the unsupported version to a directory (e.g. ~/.sdkman/candidates/java/21.0.1-open)

# 2. Symlink the new version

ln -s ~/.sdkman/candidates/java/21.0.1-open ~/.local/share/mise/installs/java/21.0.1-open

# 3. If on Mac

mkdir ~/.local/share/mise/installs/java/21.0.1-open/Contents
mkdir ~/.local/share/mise/installs/java/21.0.1-open/Contents/MacOS

ln -s ~/.sdkman/candidates/java/21.0.1-open ~/.local/share/mise/installs/java/21.0.1-open/Contents/Home
cp ~/.local/share/mise/installs/java/21.0.1-open/lib/libjli.dylib ~/.local/share/mise/installs/java/21.0.1-open/Contents/MacOS/libjli.dylib

# 4. Ensure cache is valid (e.g. an empty directory exists for your version in the mise cache)

# $ ls -R $MISE_CACHE_DIR/java

# 21.0.1-open

#

# mise/java/21.0.1-open

```

----------------------------------------

TITLE: Prepare for Release Commit
DESCRIPTION: Commands to run tests, check Git status, update the version in `metadata.lua`, and commit the changes before creating a release tag.

SOURCE: https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_9

LANGUAGE: bash
CODE:
```

# Run tests

./test/test.sh

# Check git status

git status

# Update version in metadata.lua

vim metadata.lua

# Commit changes

git add .
git commit -m "Prepare release v1.2.3"

```

----------------------------------------

TITLE: Quick Install mise
DESCRIPTION: Installs mise using a curl script for Linux and macOS. This is the recommended quick installation method.

SOURCE: https://github.com/jdx/mise/blob/main/llms.txt#_snippet_0

LANGUAGE: bash
CODE:
```

curl <https://mise.run> | sh

```

----------------------------------------

TITLE: Automated Plugin Testing Script
DESCRIPTION: A bash script to automate testing of a plugin's functionality, including installation, version checking, and execution using `mise` commands.

SOURCE: https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_7

LANGUAGE: bash
CODE:
```

# !/bin/bash

# test/test.sh

set -e

echo "Testing plugin functionality..."

# Install plugin locally

mise plugin install my-plugin .

# Test basic functionality

if [[ "$(mise ls-remote my-plugin)" == "" ]]; then
    echo "ERROR: No versions available"
    exit 1
fi

# Test installation

mise install my-plugin@latest

# Test execution

mise exec my-plugin:tool -- --version

# Clean up

mise plugin remove my-plugin

echo "All tests passed!"

```

----------------------------------------

TITLE: Tool Options Table Format Example
DESCRIPTION: This TOML snippet illustrates how to define custom installation options for a tool, including platform-specific download URLs and checksums. This advanced configuration allows for precise control over how tools are fetched and verified.

SOURCE: https://github.com/jdx/mise/blob/main/docs/dev-tools/index.md#_snippet_4

LANGUAGE: toml
CODE:
```

[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = { url = "<https://example.com/my-tool-macos-x64.tar.gz>", checksum = "sha256:abc123" }
linux-x64 = { url = "<https://example.com/my-tool-linux-x64.tar.gz>", checksum = "sha256:def456" }

```

----------------------------------------

TITLE: Legacy Pre-commit Hooks with Lefthook
DESCRIPTION: Explains how to integrate traditional pre-commit hooks using Lefthook, managed by Mise. This includes installation, hook setup, and manual execution of the pre-commit process.

SOURCE: https://github.com/jdx/mise/blob/main/llms.txt#_snippet_40

LANGUAGE: bash
CODE:
```

# Install lefthook

mise use lefthook

# Install the git hooks

lefthook install

# Run pre-commit manually

lefthook run pre-commit

```

----------------------------------------

TITLE: TOML Tool Stub File Example
DESCRIPTION: A tool stub file is an executable file that starts with a shebang pointing to `mise tool-stub`. It then contains TOML configuration specifying the tool, version, and binary to execute. This example demonstrates a basic stub for Node.js.

SOURCE: https://github.com/jdx/mise/blob/main/docs/cli/tool-stub.md#_snippet_1

LANGUAGE: Shell
CODE:
```

# !/usr/bin/env -S mise tool-stub

```

LANGUAGE: TOML
CODE:
```

# Node.js v20 development environment

tool = "node"
version = "20.0.0"
bin = "node"

# Optional: Add environment variables or other configurations

# env = {

# NODE_ENV = "development"

# }

```

----------------------------------------

TITLE: Mise CLI Commands
DESCRIPTION: A collection of essential Mise commands for managing tools, configurations, and project workflows. These commands cover installation, execution, updates, and environment setup.

SOURCE: https://github.com/jdx/mise/blob/main/docs/walkthrough.md#_snippet_10

LANGUAGE: APIDOC
CODE:
```

mise completion

- Description: Set up completions for your shell.

mise cfg|config

- Description: Commands for working with `mise.toml` files via the CLI.

mise x|exec

- Description: Execute a command in the mise environment without activating mise.

mise g|generate

- Description: Generates things like git hooks, task documentation, GitHub actions, and more for your project.

mise i|install

- Description: Install tools.

mise link

- Description: Symlink a tool installed by some other means into the mise.

mise ls-remote

- Description: List all available versions of a tool.

mise ls

- Description: Lists information about installed/active tools.

mise outdated

- Description: Informs you of any tools with newer versions available.

mise plugin

- Description: Plugins can extend mise with new functionality like extra tools or environment variable management. Commonly, these are simply asdf plugins or modern plugins.

mise r|run

- Description: Run a task defined in `mise.toml` or `mise-tasks`.

mise self-update

- Description: Update mise to the latest version. Do not use if installed via a package manager.

mise settings

- Description: CLI access to get/set configuration settings.

mise rm|uninstall

- Description: Uninstall a tool.

mise up|upgrade

- Description: Upgrade tool versions.

mise u|use

- Description: Install and activate tools.

mise w|watch

- Description: Watch for changes in a project and run tasks when they occur.

```

----------------------------------------

TITLE: Example mise.toml for Node.js Project with pnpm
DESCRIPTION: Illustrates setting up a Node.js project with `pnpm` as the package manager using `mise`. It includes enabling `corepack` for `pnpm` management, configuring PATH, and defining tasks for installation and development.

SOURCE: https://github.com/jdx/mise/blob/main/docs/mise-cookbook/nodejs.md#_snippet_4

LANGUAGE: toml
CODE:
```

[tools]
node = '22'

[hooks]

# Enabling corepack will install the `pnpm` package manager specified in your package.json

# alternatively, you can also install `pnpm` with mise

postinstall = 'npx corepack enable'

[settings]

# This must be enabled to make the hooks work

experimental = true

[env]
_.path = ['./node_modules/.bin']

[tasks.pnpm-install]
description = 'Installs dependencies with pnpm'
run = 'pnpm install'
sources = ['package.json', 'pnpm-lock.yaml', 'mise.toml']
outputs = ['node_modules/.pnpm/lock.yaml']

[tasks.dev]
description = 'Calls your dev script in `package.json`'
run = 'node --run dev'
depends = ['pnpm-install']

```

----------------------------------------

TITLE: Manual Plugin Testing Commands
DESCRIPTION: Demonstrates manual testing procedures for a plugin, including linking for development and testing within different environments like Docker.

SOURCE: https://github.com/jdx/mise/blob/main/docs/plugin-publishing.md#_snippet_8

LANGUAGE: bash
CODE:
```

# Link for development

mise plugin link my-plugin /path/to/plugin

# Test all functionality

mise ls-remote my-plugin
mise install my-plugin@latest
mise use my-plugin@latest

# Test in different environments

docker run --rm -it ubuntu:latest bash -c "
    curl -fsSL <https://mise.jdx.dev/install.sh> | sh
    mise plugin install my-plugin <https://github.com/username/my-plugin>
    mise install my-plugin@latest
"

```
