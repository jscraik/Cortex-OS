<<<<<<< HEAD

# Cortex Code (Rust) – Overview

This directory vendors the Rust workspace for Codex CLI. For upstream sync details, see `apps/cortex-code/UPSTREAM_SYNC.md`.

## MCP Integration

Cortex Code now provides comprehensive MCP (Model Context Protocol) integration with 5 development tools:

### Available MCP Tools

- **file_operations** - File system operations (read, write, list, create_dir)
- **file_search** - Fuzzy file searching with pattern matching
- **apply_patch** - Apply unified diff patches to files
- **code_analysis** - Code metrics, dependency analysis, and structure detection
- **echo** - Testing and validation tool

These tools expose cortex-code's core capabilities through MCP, enabling AI agents and external tools
to interact with the development environment programmatically.

### MCP Server

The MCP server is located in `mcp-server/` and can be built and run:

```bash
cd apps/cortex-code/mcp-server
cargo build
cargo run
```

## Documentation

Project documentation has been migrated from the backup into:

- `project-documentation/cortex-code/README.md`
- `project-documentation/cortex-code/SOFTWARE_ENGINEERING_PLAN.md`
- `project-documentation/cortex-code/TASKS.md`
- `project-documentation/cortex-code/TASK_TRACKER.md`

The old `apps/cortex-code.backup/` directory is kept temporarily for safety and will be removed
once documentation stabilizes and CI docs lint passes.

## Quick Start

```bash
cd apps/cortex-code
cargo build
```

=======
<h1 align="center">OpenAI Codex CLI</h1>

<p align="center"><code>npm i -g @openai/codex</code><br />or <code>brew install codex</code></p>

<p align="center"><strong>Codex CLI</strong> is a coding agent from OpenAI that runs locally on your computer.
</br>
</br>If you want Codex in your code editor (VS Code, Cursor, Windsurf), <a href="https://developers.openai.com/codex/ide">install in your IDE</a>
</br>If you are looking for the <em>cloud-based agent</em> from OpenAI, <strong>Codex Web</strong>, go to <a href="https://chatgpt.com/codex">chatgpt.com/codex</a></p>

<!-- Cortex Code MCP Integration -->
# Cortex Code MCP Integration

This directory vendors the Rust workspace for Codex CLI. For MCP integration and local documentation, see:

- `apps/cortex-code/UPSTREAM_SYNC.md`
- `project-documentation/cortex-code/README.md`
- `project-documentation/cortex-code/SOFTWARE_ENGINEERING_PLAN.md`
- `project-documentation/cortex-code/TASKS.md`
- `project-documentation/cortex-code/TASK_TRACKER.md`

The MCP server is located in `mcp-server/` and can be built and run:

```bash
cd apps/cortex-code/mcp-server
cargo build
cargo run
```

---

<!-- Upstream OpenAI Codex CLI README follows -->

<h1 align="center">OpenAI Codex CLI</h1>

<p align="center"><code>npm i -g @openai/codex</code><br />or <code>brew install codex</code></p>

<p align="center"><strong>Codex CLI</strong> is a coding agent from OpenAI that runs locally on your computer.
</br>
</br>If you want Codex in your code editor (VS Code, Cursor, Windsurf), <a href="https://developers.openai.com/codex/ide">install in your IDE</a>
</br>If you are looking for the <em>cloud-based agent</em> from OpenAI, <strong>Codex Web</strong>, go to <a href="https://chatgpt.com/codex">chatgpt.com/codex</a></p>

<p align="center">
  <img src="./.github/codex-cli-splash.png" alt="Codex CLI splash" width="80%" />
  </p>

---

## Quickstart

### Installing and running Codex CLI

Install globally with your preferred package manager. If you use npm:

```shell
npm install -g @openai/codex
```

Alternatively, if you use Homebrew:

```shell
brew install codex
```

Then simply run `codex` to get started:

```shell
codex
```

<details>
<summary>You can also go to the <a href="https://github.com/openai/codex/releases/latest">latest GitHub Release</a> and download the appropriate binary for your platform.</summary>

Each GitHub Release contains many executables, but in practice, you likely want one of these:

- macOS
  - Apple Silicon/arm64: `codex-aarch64-apple-darwin.tar.gz`
  - x86_64 (older Mac hardware): `codex-x86_64-apple-darwin.tar.gz`
- Linux
  - x86_64: `codex-x86_64-unknown-linux-musl.tar.gz`
  - arm64: `codex-aarch64-unknown-linux-musl.tar.gz`

Each archive contains a single entry with the platform baked into the name (e.g., `codex-x86_64-unknown-linux-musl`), so you likely want to rename it to `codex` after extracting it.

</details>

### Using Codex with your ChatGPT plan

<p align="center">
  <img src="./.github/codex-cli-login.png" alt="Codex CLI login" width="80%" />
  </p>

Run `codex` and select **Sign in with ChatGPT**. We recommend signing into your ChatGPT account to use Codex as part of your Plus, Pro, Team, Edu, or Enterprise plan. [Learn more about what's included in your ChatGPT plan](https://help.openai.com/en/articles/11369540-codex-in-chatgpt).

You can also use Codex with an API key, but this requires [additional setup](./docs/authentication.md#usage-based-billing-alternative-use-an-openai-api-key). If you previously used an API key for usage-based billing, see the [migration steps](./docs/authentication.md#migrating-from-usage-based-billing-api-key). If you're having trouble with login, please comment on [this issue](https://github.com/openai/codex/issues/1243).

### Model Context Protocol (MCP)

Codex CLI supports [MCP servers](./docs/advanced.md#model-context-protocol-mcp). Enable by adding an `mcp_servers` section to your `~/.codex/config.toml`.

### Configuration

Codex CLI supports a rich set of configuration options, with preferences stored in `~/.codex/config.toml`. For full configuration options, see [Configuration](./docs/config.md).

---

### Docs & FAQ

- [**Getting started**](./docs/getting-started.md)
  - [CLI usage](./docs/getting-started.md#cli-usage)
  - [Running with a prompt as input](./docs/getting-started.md#running-with-a-prompt-as-input)
  - [Example prompts](./docs/getting-started.md#example-prompts)
  - [Memory with AGENTS.md](./docs/getting-started.md#memory-with-agentsmd)
  - [Configuration](./docs/config.md)
- [**Sandbox & approvals**](./docs/sandbox.md)
- [**Authentication**](./docs/authentication.md)
  - [Auth methods](./docs/authentication.md#forcing-a-specific-auth-method-advanced)
  - [Login on a "Headless" machine](./docs/authentication.md#connecting-on-a-headless-machine)
- [**Advanced**](./docs/advanced.md)
  - [Non-interactive / CI mode](./docs/advanced.md#non-interactive--ci-mode)
  - [Tracing / verbose logging](./docs/advanced.md#tracing--verbose-logging)
  - [Model Context Protocol (MCP)](./docs/advanced.md#model-context-protocol-mcp)
- [**Zero data retention (ZDR)**](./docs/zdr.md)
- [**Contributing**](./docs/contributing.md)
- [**Install & build**](./docs/install.md)
  - [System Requirements](./docs/install.md#system-requirements)
  - [DotSlash](./docs/install.md#dotslash)
  - [Build from source](./docs/install.md#build-from-source)
- [**FAQ**](./docs/faq.md)
- [**Open source fund**](./docs/open-source-fund.md)

---

## License

This repository is licensed under the [Apache-2.0 License](LICENSE).

Run `codex` and select **Sign in with ChatGPT**. We recommend signing into your ChatGPT account to use Codex as part of your Plus, Pro, Team, Edu, or Enterprise plan. [Learn more about what's included in your ChatGPT plan](https://help.openai.com/en/articles/11369540-codex-in-chatgpt).

You can also use Codex with an API key, but this requires [additional setup](./docs/authentication.md#usage-based-billing-alternative-use-an-openai-api-key). If you previously used an API key for usage-based billing, see the [migration steps](./docs/authentication.md#migrating-from-usage-based-billing-api-key). If you're having trouble with login, please comment on [this issue](https://github.com/openai/codex/issues/1243).

### Model Context Protocol (MCP)

Codex CLI supports [MCP servers](./docs/advanced.md#model-context-protocol-mcp). Enable by adding an `mcp_servers` section to your `~/.codex/config.toml`.

### Configuration

Codex CLI supports a rich set of configuration options, with preferences stored in `~/.codex/config.toml`. For full configuration options, see [Configuration](./docs/config.md).

---

### Docs & FAQ

- [**Getting started**](./docs/getting-started.md)
  - [CLI usage](./docs/getting-started.md#cli-usage)
  - [Running with a prompt as input](./docs/getting-started.md#running-with-a-prompt-as-input)
  - [Example prompts](./docs/getting-started.md#example-prompts)
  - [Memory with AGENTS.md](./docs/getting-started.md#memory-with-agentsmd)
  - [Configuration](./docs/config.md)
- [**Sandbox & approvals**](./docs/sandbox.md)
- [**Authentication**](./docs/authentication.md)
  - [Auth methods](./docs/authentication.md#forcing-a-specific-auth-method-advanced)
  - [Login on a "Headless" machine](./docs/authentication.md#connecting-on-a-headless-machine)
- [**Advanced**](./docs/advanced.md)
  - [Non-interactive / CI mode](./docs/advanced.md#non-interactive--ci-mode)
  - [Tracing / verbose logging](./docs/advanced.md#tracing--verbose-logging)
  - [Model Context Protocol (MCP)](./docs/advanced.md#model-context-protocol-mcp)
- [**Zero data retention (ZDR)**](./docs/zdr.md)
- [**Contributing**](./docs/contributing.md)
- [**Install & build**](./docs/install.md)
  - [System Requirements](./docs/install.md#system-requirements)
  - [DotSlash](./docs/install.md#dotslash)
  - [Build from source](./docs/install.md#build-from-source)
- [**FAQ**](./docs/faq.md)
- [**Open source fund**](./docs/open-source-fund.md)

---

## License

This repository is licensed under the [Apache-2.0 License](LICENSE).

>>>>>>> da5e59c32eac48fd01530cbf1ac0175d9626678e
