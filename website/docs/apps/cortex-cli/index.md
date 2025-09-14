---
title: Index
sidebar_label: Index
---

# Cortex CLI Documentation

This site documents the archived `@cortex-os/cli` package and guides migration to the actively maintained
[`cortex-code`](../cortex-code/docs).

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [CLI Reference](#cli-reference)
- [API Reference / SDK Overview](#api-reference--sdk-overview)
- [User Guide](#user-guide)
- [Best Practices](#best-practices)
- [Providers & Setup](#providers--setup)
- [Security](#security)
- [Policy & Terms](#policy--terms)
- [FAQ](#faq)
- [Roadmap & Quickstarts](#roadmap--quickstarts)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Changelog / Release Notes](#changelog--release-notes)
- [Migration & Upgrade](#migration--upgrade)
- [Testing & QA](#testing--qa)
- [Deployment Guides](#deployment-guides)
- [Examples & Tutorials](#examples--tutorials)
- [Performance & Benchmarking](#performance--benchmarking)
- [Logging & Monitoring](#logging--monitoring)
- [Glossary](#glossary)
- [Contributor / Developer Setup](#contributor--developer-setup)
- [Accessibility Guidelines](#accessibility-guidelines)

## Introduction

Cortex CLI delivered command-line access to Cortex OS features such as MCP server management, agent messaging and
retrieval‑augmented generation (RAG). The package is now **deprecated** and kept for archival purposes; all functionality lives
in `cortex-code`.

## Features

Current features are preserved in `cortex-code`:

- **MCP Management** - list, add, remove and bridge MCP servers.
- **A2A Messaging** - send and inspect agent-to-agent messages.
- **RAG Operations** - ingest, query and evaluate retrieval‑augmented data.
- **Simlab** - run and benchmark simulations.
- **Evaluation Gates** - execute automated quality checks.
- **Agent Lifecycle** - create agents from templates.
- **System Control** - health checks and diagnostics.

Planned features for `cortex-cli` are frozen; new capabilities target `cortex-code`.

## Getting Started

Prerequisites: Node.js ≥20 and `pnpm`.

Installation of the archived CLI:

```bash
pnpm add -g @cortex-os/cli
```

Launch with `cortex --help`.

New projects should install `cortex-code`:

```bash
cd apps/cortex-code
cargo build --release && ./target/release/cortex-code --help
```

## Configuration

Configuration files reside under `~/.cortex/`. MCP bridge settings use `~/.cortex/mcp/bridge-config.json`. Environment variables
such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `CORTEX_HOME` control provider credentials and data paths.

## Architecture

The CLI is a Node.js application built with [Commander](https://github.com/tj/commander.js). Command groups reside in
`src/commands` (for example `mcp`, `a2a`, `rag`). Each command delegates to `@cortex-os/*` libraries for registry access,
telemetry and simulations. The project has been superseded by a Rust implementation (`cortex-code`) for performance and
maintainability.

## CLI Reference

### MCP Management

- `cortex mcp list`
- `cortex mcp add &lt;name&gt; &lt;config&gt;`
- `cortex mcp remove &lt;name&gt;`
- `cortex mcp bridge` and `cortex mcp bridge --list`
- `cortex mcp search &lt;query&gt;`
- `cortex mcp show &lt;name&gt;`
- `cortex mcp doctor`

### A2A Messaging

- `cortex a2a send --type &lt;type&gt; --payload &lt;json&gt;`
- `cortex a2a list`
- `cortex a2a doctor`

### RAG Operations

- `cortex rag ingest &lt;path&gt;`
- `cortex rag query &lt;query&gt;`
- `cortex rag eval`

### Simlab

- `cortex simlab run &lt;name&gt;`
- `cortex simlab bench &lt;name&gt;`
- `cortex simlab report`
- `cortex simlab list`

### Evaluation

- `cortex eval gate &lt;name&gt;`

### Agent Management

- `cortex agent create &lt;name&gt;`

### Control

- `cortex ctl check`

### Interactive Mode

- `cortex` or `cortex code`

## API Reference / SDK Overview

The CLI does not expose a public API. For programmatic integrations use `@cortex-os` packages or invoke `cortex-code` with
`--json` output to consume machine-friendly responses. Authentication for remote services relies on provider tokens in
environment variables.

## User Guide

1. **List MCP servers**

   ```bash
   cortex mcp list
```

2. **Send an A2A message**

   ```bash
   cortex a2a send --type ping --payload '{"msg":"hi"}'
```

3. **Query RAG**

   ```bash
   cortex rag query "What is Cortex OS?"
```

4. **Run a simulation**

   ```bash
   cortex simlab run demo
```

5. **Check system status**

   ```bash
   cortex ctl check
```

## Best Practices

- Prefer `cortex-code` for new development.
- Store provider tokens in environment variables or secret managers, not in source control.
- Use `cortex mcp bridge --list` regularly to audit custom registries.
- Run `cortex mcp doctor` and `cortex a2a doctor` during diagnostics.

## Providers & Setup

Set environment variables for external services before running commands:

- `OPENAI_API_KEY` - OpenAI models for RAG or evaluations.
- `ANTHROPIC_API_KEY` - Anthropic model access.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` - AWS-based providers.
- `CORTEX_HOME` - override default config path (`~/.cortex`).

## Security

- Use HTTPS endpoints and verify certificates.
- Rotate provider tokens frequently and revoke unused keys.
- Avoid passing secrets on the command line; prefer env vars or config files.
- Telemetry is minimal; disable with `CORTEX_TELEMETRY&#61;0` if required.

## Policy & Terms

Usage is governed by the repository [LICENSE](../../LICENSE),
[COMMERCIAL-LICENSE](/docs/references/commercial-license for enterprise use, and the
[CODE OF CONDUCT](/docs/references/code-of-conduct. By invoking the CLI you accept these terms.

## FAQ

**Why is Cortex CLI deprecated?**

The project was consolidated into `cortex-code` for a unified, faster CLI.

**Can I still use Cortex CLI?**

Yes, but it receives no updates. Migration is strongly recommended.

**Where are configs stored?**

Under `~/.cortex/` unless `CORTEX_HOME` is set.

## Roadmap & Quickstarts

No new features are planned for `cortex-cli`. For upcoming capabilities and enterprise quickstarts such as MCP overlays or
enhanced simulations, see the `cortex-code` roadmap (if available).

## Troubleshooting Guide

- **Command not found** - ensure the package is installed globally and PATH includes the pnpm global bin.
- **Authentication errors** - verify provider environment variables are set and valid.
- **Network issues** - run `cortex mcp doctor` or check firewall rules.
- **Unexpected output** - rerun with `DEBUG&#61;cortex*` for verbose logs.

## Changelog / Release Notes

| Version | Date | Notes |
| ------- | ---------- | ---------------------------------- |
| 0.1.0 | 2024-01-01 | Initial release (project immediately archived). |

## Migration & Upgrade

Replace `cortex` with `cortex-code`:

| Cortex CLI Command | Cortex Code Equivalent |
| ------------------ | ---------------------- |
| `cortex mcp list` | `cortex-code mcp list` |
| `cortex a2a send --type foo --payload '{}'` | `cortex-code a2a send --type foo --payload '{}'` |
| `cortex rag query "question"` | `cortex-code rag query "question"` |
| `cortex simlab run test` | `cortex-code simlab run test` |
| `cortex eval gate security` | `cortex-code eval gate security` |
| `cortex agent create mybot` | `cortex-code agent create mybot` |
| `cortex ctl check` | `cortex-code ctl check` |

## Testing & QA

Unit tests use [Vitest](https://vitest.dev/). Run inside the project:

```bash
pnpm test
```

Coverage reporting is minimal and no longer enforced. For new development, run tests within `cortex-code`.

## Deployment Guides

The archived package is distributed via npm and requires no further deployment. To build locally:

```bash
pnpm build
```

The compiled output appears in `dist/`.

## Examples & Tutorials

```bash
# Create an agent skeleton
cortex agent create demo

# List MCP bridges
cortex mcp bridge --list

# Query RAG data
cortex rag query "hello world"
```

Additional walkthroughs now live in the `cortex-code` examples directory.

## Performance & Benchmarking

The Node.js implementation offers basic performance. For benchmarking simulations use:

```bash
cortex simlab bench &lt;name&gt;
```

Higher‑performance benchmarking is available in `cortex-code`.

## Logging & Monitoring

Enable verbose logging with:

```bash
DEBUG=cortex* cortex mcp list
```

Logs are written to stdout; integrate with observability stacks via shell redirection or external collectors.

## Glossary

- **A2A** - Agent‑to‑Agent messaging protocol.
- **MCP** - Model Context Protocol for registering model providers.
- **RAG** - Retrieval‑Augmented Generation.
- **Simlab** - Simulation and benchmarking toolkit.
- **CTL** - Control commands for health and diagnostics.

## Contributor / Developer Setup

1. Install Node.js ≥20 and `pnpm`.
2. Install dependencies:

   ```bash
   pnpm install
```

3. Run in watch mode:

   ```bash
   pnpm dev
```

4. Build:

   ```bash
   pnpm build
```

## Accessibility Guidelines

- The CLI outputs plain text compatible with screen readers.
- Disable colors with `--no-color` or `FORCE_COLOR=0` for high‑contrast terminals.
- Keyboard navigation follows standard shell conventions.
- For TUI mode, use terminal accessibility features and report issues upstream.
