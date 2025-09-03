# Cortex Code Documentation

## Overview

Cortex Code is a terminal-based user interface (TUI) for the Cortex-OS AI coding agent ecosystem. It provides developers with a comprehensive view of AI agent activities, GitHub integrations, and real-time system monitoring. Built with Rust and Ratatui for maximum performance and reliability.

## Key Features

### 1. Multi-View Interface

#### AI Chat View

- Interactive conversation with AI agents
- Streaming responses with real-time updates
- Message history with scrollable interface
- Support for multiple AI providers (GitHub, OpenAI, Anthropic, MLX)

#### GitHub Dashboard

- Real-time GitHub activity monitoring
- Pull request management with status tracking
- Issue tracking with priority categorization
- AI task monitoring and management
- Repository analytics and health metrics

#### A2A Event Stream

- Live visualization of agent-to-agent communications
- Event filtering by log level (Debug, Info, Warning, Error, Critical)
- Agent status monitoring
- Detailed event inspection capabilities

#### Command Palette

- Unified command interface with 30+ operations
- Fuzzy search across all available commands
- Categorized commands (GitHub, MCP, A2A, TUI, AI, System)
- Parameter input for complex commands

### 2. User Experience

#### Navigation

- Fast view switching with `Alt+1/2/3`
- Command palette access with `Ctrl+P`
- Intuitive keyboard shortcuts for all operations
- Mouse support with configurable modes

#### Real-time Updates

- Live streaming of AI responses
- Real-time GitHub activity updates
- Continuous A2A event monitoring
- Automatic refresh of dashboard data

#### Rich Visualization

- Syntax highlighting for code snippets
- Color-coded status indicators
- Progress bars and gauges for metrics
- Scrollable lists with pagination

### 3. Developer Features

#### MCP Integration

- Model Context Protocol server management
- Plugin system for extending functionality
- Tool registry for available operations
- Remote procedure call capabilities

#### System Monitoring

- Performance metrics tracking
- Resource usage monitoring
- Health check diagnostics
- Error rate and response time analytics

#### Event Filtering

- Configurable log levels
- Search and filtering capabilities
- Real-time event filtering
- Custom filter rules

#### Command History

- Persistent command history
- Conversation history storage
- Export capabilities for logs and diagnostics

## Architecture

### Component Structure

```
src/
├── main.rs              # Application entry point and TUI loop
├── app.rs               # Core application state and logic
├── config.rs            # Configuration management
├── view/                # UI components
│   ├── chat.rs         # AI chat interface
│   ├── github_dashboard.rs  # GitHub activity monitoring
│   ├── a2a_stream.rs   # Event stream visualization
│   ├── cortex_command_palette.rs  # Command interface
│   └── mod.rs          # View module exports
├── github/             # GitHub API integration
│   ├── client.rs       # API client and authentication
│   ├── types.rs        # GitHub data structures
│   └── mod.rs          # GitHub module exports
├── mcp/                # MCP integration
│   ├── client.rs       # MCP client implementation
│   ├── service.rs      # MCP service management
│   └── mod.rs          # MCP module exports
└── memory/             # Persistent storage
    ├── storage.rs      # Memory management
    └── mod.rs          # Memory module exports
```

### Key Technologies

- **Ratatui** - Modern TUI framework
- **Crossterm** - Cross-platform terminal handling
- **Tokio** - Async runtime for concurrent operations
- **Serde** - Serialization for configuration and data
- **Clap** - Command-line argument parsing

## Usage

### Basic Navigation

| Shortcut | Action                         |
| -------- | ------------------------------ |
| `Alt+1`  | Switch to AI Chat view         |
| `Alt+2`  | Switch to GitHub Dashboard     |
| `Alt+3`  | Switch to A2A Event Stream     |
| `Ctrl+P` | Open command palette           |
| `Ctrl+Q` | Exit application               |
| `Esc`    | Cancel/close current operation |

### AI Chat View

- **Enter**: Send message to AI
- **Ctrl+Enter**: Send streaming message
- **Up/Down**: Navigate message history
- **Tab**: Switch between input modes

### GitHub Dashboard

- **Tab**: Switch between dashboard tabs (Overview, PRs, Issues, AI Tasks, Analytics)
- **Enter**: Open selected item
- **R**: Refresh data
- **N**: Create new PR/issue (context-dependent)

### A2A Event Stream

- **Space**: Pause/resume stream
- **D**: Toggle detailed view
- **C**: Clear all events
- **1-5**: Filter by log level (Debug, Info, Warning, Error, Critical)
- **Up/Down**: Navigate event list

### Command Palette

The command palette provides unified access to 30+ operations across 6 categories:

#### GitHub Commands

- `@cortex review` - AI code review on PR
- `@cortex analyze` - Comprehensive PR analysis
- `@cortex secure` - Security vulnerability scan
- `@cortex document` - Generate documentation

#### MCP Commands

- List/start/stop MCP servers
- Install/manage MCP plugins
- View MCP tool registry

#### System Commands

- Export logs and diagnostics
- Health check and monitoring
- Configuration management

## Configuration

### CLI Options

```bash
cortex-code [OPTIONS] [COMMAND]

Options:
    -c, --config <FILE>     Configuration file path
    -d, --debug             Enable debug logging
        --ci                Run in CI mode (non-interactive)

Commands:
    code                    Interactive TUI mode (default)
    run <PROMPT>            Execute single command
    daemon                  Start daemon server
    mcp <ACTION>            MCP server management
```

### Configuration File

Create `$HOME/.cortex/config.toml`:

```toml
[ui]
theme = "dark"
refresh_rate = 60
enable_mouse = true

[github]
token = "ghp_your_token_here"
default_org = "your-org"

[ai]
default_provider = "github"
streaming = true
max_tokens = 4096

[logging]
level = "info"
file = "$HOME/.cortex/logs/tui.log"
```

## Security

### Security Features

- **Secure Token Storage**: GitHub tokens encrypted at rest
- **Network Security**: TLS encryption for all API calls
- **Input Validation**: All user inputs sanitized and validated
- **Audit Logging**: Comprehensive logging of user actions
- **Privilege Separation**: Minimal required permissions

## Performance

### Benchmarks

| Metric           | Value          | Notes             |
| ---------------- | -------------- | ----------------- |
| Startup Time     | <100ms         | Cold start        |
| Memory Usage     | 8-15MB         | Typical operation |
| CPU Usage        | <5%            | Idle state        |
| Event Processing | 10k events/sec | A2A stream        |
| Render Rate      | 60 FPS         | UI refresh        |

## Testing

### Running Tests

```bash
# Unit tests
cargo test

# Integration tests
cargo test --test integration

# Test with coverage (requires cargo-tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out html
```

## Deployment

### Binary Distribution

```bash
# Build optimized release
cargo build --release

# Create distribution package
tar -czf cortex-code-linux-x64.tar.gz -C target/release cortex-code

# Install system-wide (Linux/macOS)
sudo cp target/release/cortex-code /usr/local/bin/
```

### Docker Deployment

```dockerfile
FROM rust:1.70-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates
COPY --from=builder /app/target/release/cortex-code /usr/local/bin/
CMD ["cortex-code"]
```
