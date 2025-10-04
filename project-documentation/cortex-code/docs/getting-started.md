# Getting Started with Cortex Code

This guide will help you set up and start using Cortex Code, the terminal-based user interface (TUI) for the Cortex-OS AI coding agent ecosystem.

## Prerequisites

- Rust 1.70+ (for building from source)
- Cargo (bundled with Rust)
- Terminal with Unicode and 256-color support (e.g., Alacritty, iTerm2)
- GitHub token (for GitHub integration features)

## Installation

### Option 1: Build from Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os/apps/cortex-code

# Build the project
cargo build --release

# Run Cortex Code
./target/release/codex
```

### Option 2: Install via Cargo

```bash
# Install directly from crates.io (when available)
# Create a convenient alias so you can run `cortex`
echo 'alias cortex="codex"' >> ~/.zshrc && source ~/.zshrc

# Run Cortex Code
cortex
```

## Configuration

Cortex Code uses a JSON configuration. Create `$HOME/.cortex/cortex.json`:

```json
{
 "providers": {
  "default": "github",
  "fallback": ["openai", "anthropic", "mlx"],
  "config": {
   "github": { "base_url": "https://models.inference.ai.azure.com" }
  }
 },
 "ui": { "theme": "dark", "keybindings": "default", "vim_mode": false },
 "features": {
  "tui": { "enabled": true },
  "daemon": { "enabled": true, "port": 8080, "bind_address": "127.0.0.1" }
 }
}
```

### Environment Variables

You can also configure Cortex Code using environment variables:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
export CORTEX_AI_PROVIDER="openai"
export CORTEX_DEBUG="true"
```

## First Launch

After installation, launch Cortex Code:

```bash
cortex
```

Upon first launch, you'll be presented with the multi-view TUI interface:

1. **AI Chat View** (`Alt+1`): Interactive conversation with AI agents
2. **GitHub Dashboard** (`Alt+2`): Real-time GitHub activity monitoring
3. **A2A Event Stream** (`Alt+3`): Live visualization of agent-to-agent communications

## Basic Navigation

| Shortcut | Action                         |
| -------- | ------------------------------ |
| `Alt+1`  | Switch to AI Chat view         |
| `Alt+2`  | Switch to GitHub Dashboard     |
| `Alt+3`  | Switch to A2A Event Stream     |
| `Ctrl+P` | Open command palette           |
| `Ctrl+Q` | Exit application               |
| `Esc`    | Cancel/close current operation |

## AI Chat View

In the AI Chat view:

1. Type your message in the input field at the bottom
2. Press `Enter` to send a message
3. Press `Ctrl+Enter` to send a streaming message
4. Use `Up`/`Down` arrows to navigate message history

## GitHub Dashboard

In the GitHub Dashboard:

1. Use `Tab` to switch between dashboard tabs (Overview, PRs, Issues, AI Tasks, Analytics)
2. Press `Enter` to open selected items
3. Press `R` to refresh data
4. Press `N` to create new PR/issue (context-dependent)

## A2A Event Stream

In the A2A Event Stream:

1. Press `Space` to pause/resume the stream
2. Press `D` to toggle detailed view
3. Press `C` to clear all events
4. Press `1-5` to filter by log level (Debug, Info, Warning, Error, Critical)
5. Use `Up`/`Down` arrows to navigate the event list

## Command Palette

Access the command palette with `Ctrl+P` to access 30+ operations across 6 categories:

- **GitHub Commands**: AI code review, PR analysis, security scans
- **MCP Commands**: Server management, plugin installation
- **A2A Commands**: Event sending, agent listing
- **TUI Commands**: View switching, theme toggling
- **AI Commands**: Model switching, context clearing
- **System Commands**: Log export, health checks

## Next Steps

1. Explore the [User Guide](user-guide.md) for detailed feature documentation
2. Review the [Configuration](configuration.md) options
3. Check the [CLI Reference](cli-reference.md) for command-line usage
4. Learn about the [Architecture](architecture.md) of Cortex Code

## Troubleshooting

### Common Issues

### Terminal Rendering Issues

```bash
# Ensure TERM is set correctly
export TERM=xterm-256color

# Check terminal capabilities
infocmp $TERM
```

### High CPU Usage

```json
{
    "ui": { "refresh_rate": 30 }
}
```

### Memory Leaks

```bash
# Monitor memory usage
RUST_BACKTRACE=1 cargo run
```

### Debug Mode

Enable comprehensive debugging:

```bash
RUST_LOG=debug cargo run -- --debug
```

> 💡 **Pro Tip**: Use `cortex --help` to see all available commands and flags.
