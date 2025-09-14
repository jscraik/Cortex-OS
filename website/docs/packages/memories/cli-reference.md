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
- `init` - initialize stores and verify connections
- `index --path &lt;dir&gt;` - index files in a directory
- `search --query &lt;text&gt;` - semantic search with optional `--type`, `--source`, `--limit`
- `stats` - print storage statistics
- `demo` - run end-to-end demonstration

Options:
- `--path &lt;dir&gt;` directory to index
- `--query &lt;text&gt;` search text
- `--type &lt;type&gt;` filter by memory type
- `--source &lt;source&gt;` filter by source
- `--limit &lt;n&gt;` result count (default 10)
- `--embedding mock` use mock embeddings

## `init-memory`
Bootstraps the system by writing a health-check node.
```
init-memory

```