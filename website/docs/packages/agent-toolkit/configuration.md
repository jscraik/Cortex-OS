---
title: Configuration
sidebar_label: Configuration
---

# Configuration

The toolkit reads environment variables for optional behavior. Add them to your shell profile or `.env` file for consistent setup.

| Variable | Purpose |
| ---------- | --------- |
| `TS_LIB` | Path to tree-sitter compiled languages bundle |
| `TS_LANG` | Language name for tree-sitter queries |

Example `.env`:
```bash
TS_LIB=$HOME/.cache/tree-sitter/lib.so
TS_LANG=python
```

Configuration files are not required; tools inherit repository settings such as ESLint and Ruff configs.
