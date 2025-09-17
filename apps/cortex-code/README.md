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
