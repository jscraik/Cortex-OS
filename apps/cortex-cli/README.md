# @cortex-os/cli - DEPRECATED

⚠️ **This package has been deprecated and archived.**

## Migration

All CLI functionality has been moved to **cortex-code**. Please use cortex-code instead:

```bash
# Instead of:
# cortex mcp list

# Use:
cortex-code mcp list
```

## Available Commands in cortex-code

### MCP Management

- `cortex-code mcp list` - List MCP servers
- `cortex-code mcp add <name> <config>` - Add MCP server
- `cortex-code mcp remove <name>` - Remove MCP server
- `cortex-code mcp search <query>` - Search MCP marketplace
- `cortex-code mcp show <name>` - Show MCP server details
- `cortex-code mcp bridge` - Bridge MCP servers
- `cortex-code mcp doctor` - Diagnose MCP issues

### A2A Messaging

- `cortex-code a2a send --type <type> --payload <json>` - Send A2A message
- `cortex-code a2a list` - List A2A messages
- `cortex-code a2a doctor` - Diagnose A2A system

### RAG Operations

- `cortex-code rag ingest <path>` - Ingest documents
- `cortex-code rag query <query>` - Query RAG system
- `cortex-code rag eval` - Evaluate RAG performance

### Simlab Operations

- `cortex-code simlab run <name>` - Run simulation
- `cortex-code simlab bench <name>` - Run benchmark
- `cortex-code simlab report` - Generate report
- `cortex-code simlab list` - List simulations

### Evaluation

- `cortex-code eval gate <name>` - Run evaluation gate

### Agent Management

- `cortex-code agent create <name>` - Create agent

### Control Operations

- `cortex-code ctl check` - Check system status

### Interactive Mode

- `cortex-code` or `cortex-code code` - Interactive TUI mode

## Why the Migration?

1. **Unified Interface**: All Cortex-OS functionality is now available through a single binary
2. **Better Performance**: Rust-based implementation with improved performance
3. **Enhanced Features**: Better error handling, diagnostics, and enterprise features
4. **Maintenance**: Reduced maintenance burden by consolidating CLI tools

## Migration Guide

For each cortex-cli command, simply replace `cortex` with `cortex-code`:

| Old Command | New Command |
|-------------|-------------|
| `cortex mcp list` | `cortex-code mcp list` |
| `cortex a2a send --type foo --payload '{}'` | `cortex-code a2a send --type foo --payload '{}'` |
| `cortex rag query "question"` | `cortex-code rag query "question"` |
| `cortex simlab run test` | `cortex-code simlab run test` |
| `cortex eval gate security` | `cortex-code eval gate security` |
| `cortex agent create mybot` | `cortex-code agent create mybot` |
| `cortex ctl check` | `cortex-code ctl check` |

## Build cortex-code

```bash
cd apps/cortex-code
cargo build --release
```

The binary will be available at `target/release/cortex-code`.
