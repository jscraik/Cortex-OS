---
title: Cli Reference
sidebar_label: Cli Reference
---

# CLI Reference

The `mcp-server` script exposes management commands.

## Global Options
- `--config-dir PATH` - configuration directory (default `~/.mcp`)
- `--log-level [DEBUG|INFO|WARNING|ERROR]`
- `--debug` - enable verbose logs

## Commands
| Command | Description |
| --- | --- |
| `serve` | Start FastAPI server with optional `--host`, `--port`, `--workers`, `--reload`, `--plugin-dir`, `--config-dir` |
| `shutdown` | Gracefully stop server and task queue |
| `version` | Display version info |

Subcommand groups `server`, `tools`, `plugins`, `tasks`, and `auth` provide additional operations for managing their respective resources.
