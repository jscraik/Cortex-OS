# Cortex TUI

Terminal User Interface for Cortex-OS AI coding agent, built with Ratatui 0.29.0 following Test-Driven Development principles.

## Features

- **Modern TUI**: Built with Ratatui 0.29.0 (same as OpenAI Codex CLI)
- **Provider-Agnostic**: Supports GitHub Models, OpenAI, Anthropic, and local MLX
- **CI Mode**: Non-interactive mode for automation and GitHub Actions
- **MCP Support**: Model Context Protocol integration
- **Agent Memory**: AGENTS.md compatible memory system with audit trails
- **Privacy-First**: Zero-data-retention mode and local execution

## Installation

### From Source
```bash
cd apps/cortex-tui
cargo build --release
./target/release/cortex-tui --help
```

### Configuration

Copy the example configuration:
```bash
mkdir -p ~/.cortex
cp config.toml.example ~/.cortex/config.toml
# Edit ~/.cortex/config.toml with your settings
```

## Usage

### Interactive TUI Mode
```bash
cortex-tui
# or
cortex-tui tui
```

### CI Mode (Non-Interactive)
```bash
# Text output
cortex-tui run "explain this code"

# JSON output for automation
cortex-tui run "review this PR" --output json
```

### Daemon Mode
```bash
cortex-tui daemon --port 8080
```

### MCP Server Management
```bash
cortex-tui mcp list
cortex-tui mcp add my-server "config here"
cortex-tui mcp remove my-server
```

## GitHub Actions Integration

Add `/cortex` comments to issues or PRs to trigger the agent:

```
/cortex explain this bug report
/cortex review this code change
/cortex suggest improvements
```

## Architecture

Built following SOLID principles and TDD methodology:

- **Model**: Data structures and business logic
- **View**: Ratatui TUI components (ChatWidget, DiffViewer, CommandPalette)
- **Controller**: Event handling and user input coordination
- **Providers**: Abstraction layer for different AI models
- **Memory**: Agent memory with audit trails
- **MCP**: Model Context Protocol integration

## Testing

```bash
# Run all tests
cargo test

# Run with coverage
cargo tarpaulin --out Html

# Run specific test module
cargo test providers::tests

# Snapshot testing for TUI
cargo insta test
cargo insta review  # Review snapshot changes
```

## Development

This project follows strict TDD (Test-Driven Development):

1. Write failing test (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor and improve (REFACTOR)

See [TDD Plan](docs/tdd-plan-upgrade.md) for implementation roadmap.

## License

MIT License - see LICENSE file for details.