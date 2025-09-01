<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Semantic headings with logical order
- Descriptive link text
- High contrast code blocks
-->

# MCP Registry

## Purpose

`@cortex-os/mcp-registry` provides JSON schemas and validation utilities for Model Context Protocol (MCP) server manifests and registry indexes. It combines [AJV](https://ajv.js.org/) and [Zod](https://zod.dev/) to ensure every input is fully validated before use.

## Installation

```bash
# Install workspace dependencies
pnpm install

# Build the registry package
pnpm --filter @cortex-os/mcp-registry build
```

## CLI Usage

The package ships with a CLI named **`mcp-validate`** for validating manifests on the command line.

```bash
# Validate a registry or manifest file
pnpm --filter @cortex-os/mcp-registry exec mcp-validate path/to/registry.json
```

## Schema Validation

```ts
import { validateRegistry, validateServerManifest } from '@cortex-os/mcp-registry';
import { readFile } from 'fs/promises';

const manifest = JSON.parse(await readFile('server-manifest.json', 'utf8'));
const result = validateServerManifest(manifest);

if (!result.valid) {
  console.error(result.errors);
}
```

The schemas live in [`schemas/`](./schemas) and enforce MCP boundaries, deterministic inputs, and security best practices.

## Testing

```bash
# Run package tests
pnpm --filter @cortex-os/mcp-registry exec vitest run
```
