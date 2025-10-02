---
title: Cli Reference
sidebar_label: Cli Reference
---

# CLI Reference

## `memory-cli`
```
node memory-cli.js &lt;command&gt; [options]
```
### Commands
- `init` – initialize stores and verify connections
- `index --path <dir>` – index files in a directory
- `search --query <text>` – semantic search with optional `--type`, `--source`, `--limit`
- `stats` – print storage statistics
- `demo` – run end-to-end demonstration

Options:
- `--path <dir>` directory to index
- `--query <text>` search text
- `--type <type>` filter by memory type
- `--source <source>` filter by source
- `--limit <n>` result count (default 10)
- `--embedding mock` use mock embeddings

## `init-memory`
Bootstraps the system by writing a health-check node.
```
init-memory
```
