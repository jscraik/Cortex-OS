# Cortex Code User Guide

This guide provides detailed instructions for using all features of the current Cortex Code implementation.

## Multi-View Interface

Cortex Code features a multi-view interface that can be navigated using keyboard shortcuts:

- `Alt+1`: AI Chat View
- `Alt+2`: GitHub Dashboard
- `Alt+3`: A2A Event Stream
- `Ctrl+P`: Command Palette

### AI Chat View

The AI Chat view provides an interactive conversation interface with AI agents.

#### Chat Features

- Real-time streaming responses
- Support for multiple AI providers
- Message history with scrollable interface
- Keyboard navigation and shortcuts

#### Usage

1. Type your message in the input field at the bottom of the screen
2. Press `Enter` to send a standard message
3. Press `Ctrl+Enter` to send a message with streaming enabled
4. Use `Up`/`Down` arrows to navigate through message history
5. Press `Tab` to cycle focus between the message list, input field, and send button

#### Supported AI Providers

- **GitHub Models**: Free tier AI models (default)
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 models (Sonnet, Haiku, Opus)
- **MLX**: Local inference for Apple Silicon

#### Streaming Responses

Streaming responses provide real-time feedback as the AI generates output:

- Messages are displayed as they are received
- A blinking cursor indicates active streaming
- The interface remains responsive during streaming

### GitHub Dashboard

The GitHub Dashboard provides real-time monitoring of GitHub activity.

#### Tabs

1. **Overview**: Repository statistics and health metrics
2. **Pull Requests**: PR tracking with status indicators
3. **Issues**: Issue tracking with priority categorization
4. **AI Tasks**: Monitoring of AI-assisted tasks
5. **Analytics**: Performance and usage metrics

#### Dashboard Navigation

- `Tab`: Switch between dashboard tabs
- `Enter`: Open selected item (PR, issue, etc.)
- `R`: Refresh data from GitHub
- `N`: Create new item (PR or issue, depending on context)
- `Up`/`Down`: Navigate lists

#### Pull Request View

- Color-coded status indicators (green for open, red for closed, etc.)
- Check status indicators (✅ for passing, ❌ for failing)
- AI review status indicators (🔍 for reviewed)
- Author and timestamp information

#### Issue View

- Priority indicators (red for critical, yellow for high, etc.)
- Status indicators (open, closed, in progress)
- AI triage indicators (🤖 for triaged)
- Assignee and label information

### A2A Event Stream

The A2A (Agent-to-Agent) Event Stream visualizes communications between agents.

#### A2A Features

- Live event streaming
- Event filtering by log level
- Agent status monitoring
- Detailed event inspection

#### Controls

- `Space`: Pause/resume the event stream
- `D`: Toggle detailed view
- `C`: Clear all events
- `1-5`: Filter by log level
  - `1`: Debug
  - `2`: Info
  - `3`: Warning
  - `4`: Error
  - `5`: Critical
- `Up`/`Down`: Navigate events

#### Event Information

Each event displays:

- Timestamp with millisecond precision
- Event type and status indicators
- Source and target agents
- Processing time (when available)
- Error information (when applicable)

#### Agent Status

The agent status bar shows:

- Agent name and status (🟢 Online, 🔴 Offline, 🔥 Error)
- Events sent and received
- Error count
- Average response time

### Command Palette

The Command Palette provides unified access to all Cortex Code operations.

#### Access

- `Ctrl+P`: Open command palette
- `Esc`: Close command palette
- `Enter`: Execute selected command

#### Command Palette Navigation

- Type to search commands
- `Up`/`Down`: Navigate command list
- Commands are categorized by function:
  - GitHub
  - MCP
  - A2A
  - TUI
  - AI
  - System

#### Available Commands

##### GitHub Commands

- `github.create_pr`: Create a new pull request
- `github.review_pr`: Trigger AI-powered code review
- `github.security_scan`: Run security analysis
- `github.issue_triage`: Intelligent issue triage

##### MCP Commands

- `mcp.list_servers`: List available MCP servers
- `mcp.start_server`: Start an MCP server
- `mcp.install_plugin`: Install an MCP plugin

##### A2A Commands

- `a2a.send_event`: Send an A2A event
- `a2a.list_agents`: List active agents

##### TUI Commands

- `tui.switch_view`: Switch between views
- `tui.theme_toggle`: Toggle between dark/light themes
- `tui.toggle_mouse_mode`: Toggle mouse handling mode

##### AI Commands

- `ai.switch_model`: Change AI model provider
- `ai.clear_context`: Clear conversation context

##### System Commands

- `system.export_logs`: Export system logs
- `system.health_check`: Run system diagnostics

### Cloudflare Tunnel Integration

The Cloudflare Tunnel integration allows secure remote access to your Cortex Code instance.

#### Setup

1. Install `cloudflared` on your system
2. Authenticate with Cloudflare: `cloudflared tunnel login`
3. Configure your tunnel in the Cortex Code configuration file
4. Start Cortex Code with tunnel support

#### Configuration

Add the following to your configuration file (`~/.cortex/cortex.json`):

```json
{
  "features": {
    "daemon": { "enabled": true },
    "tui": { "enabled": true }
  },
  "security": {},
  "ui": {},
  "providers": {},
  "server": {
    "cloudflare": {
      "tunnel_name": "cortex-code",
      "auto_start": true,
      "health_checks": true
      /* "tunnel_token": "your-tunnel-token-here", */
      /* "domain": "cortex.example.com" */
    }
  },
  "webui": { "enabled": true, "port": 3000, "host": "127.0.0.1" }
}
```

#### CLI Commands

You can manage tunnels using Cortex Code's CLI:

- `cortex-code tunnel setup`: Setup tunnel configuration
- `cortex-code tunnel start [--port <PORT>]`: Start Cloudflare tunnel
- `cortex-code tunnel stop`: Stop Cloudflare tunnel
- `cortex-code tunnel status`: Get tunnel status

#### Security

When using Cloudflare Tunnels:

1. Use custom domains for production deployments
2. Enable authentication for WebUI when exposed via tunnels
3. Monitor access logs through the Cloudflare dashboard
4. Leverage Cloudflare's built-in DDoS protection and rate limiting

## Application Configuration

Config is stored at `$HOME/.cortex/cortex.json`.

### UI Configuration

```json
{ "ui": { "theme": "dark" } }
```

### GitHub Configuration

```json
{ "providers": { "config": { "github": { "token": "ghp_token" } } } }
```

### AI Configuration

```json
{ "providers": { "default": "github" }, "features": { "streaming": { "enabled": true } } }
```

### Logging Configuration

```json
{ "logging": { "level": "info", "file": "$HOME/.cortex/logs/tui.log" } }
```

## Mouse Support

Cortex Code includes configurable mouse support:

### Modes

1. **TUI Mode**: Mouse controls interface elements
2. **Terminal Mode**: Mouse enables copy/paste (Alt+drag to select)
3. **Hybrid Mode**: Automatic switching based on context

### Mouse Controls

- `Ctrl+M`: Toggle mouse mode
- Left-click: Select items
- Scroll wheel: Navigate lists
- Right-click: Context menu (planned)

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action                         |
| -------- | ------------------------------ |
| `Ctrl+Q` | Quit application               |
| `Esc`    | Cancel/close current operation |
| `Ctrl+P` | Open command palette           |
| `Alt+1`  | Switch to AI Chat view         |
| `Alt+2`  | Switch to GitHub Dashboard     |
| `Alt+3`  | Switch to A2A Event Stream     |
| `Ctrl+M` | Toggle mouse mode              |

### AI Chat Shortcuts

| Shortcut     | Action                   |
| ------------ | ------------------------ |
| `Enter`      | Send message             |
| `Ctrl+Enter` | Send streaming message   |
| `Up`/`Down`  | Navigate message history |
| `Tab`        | Cycle focus              |

### GitHub Dashboard Shortcuts

| Shortcut | Action             |
| -------- | ------------------ |
| `Tab`    | Switch tabs        |
| `Enter`  | Open selected item |
| `R`      | Refresh data       |
| `N`      | Create new item    |

### A2A Event Stream Shortcuts

| Shortcut    | Action               |
| ----------- | -------------------- |
| `Space`     | Pause/resume stream  |
| `D`         | Toggle detailed view |
| `C`         | Clear events         |
| `1-5`       | Filter by log level  |
| `Up`/`Down` | Navigate events      |

## Themes

Cortex Code supports both dark and light themes:

### Dark Theme (Default)

- Optimized for terminal usage
- Reduced eye strain in low-light conditions
- Consistent with modern development environments

### Light Theme

- Alternative color scheme for bright environments
- High contrast for better visibility
- Accessible color palette

### Switching Themes

- Use the command palette: `tui.theme_toggle`
- Configure in the config file: `ui.theme = "light"`
- Theme changes take effect immediately

## Performance Monitoring

Cortex Code includes built-in performance monitoring:

### Metrics Displayed

- Memory usage
- CPU usage
- Event processing rate
- Response times

### Performance Tips

1. Adjust refresh rate in config for slower systems
2. Use event filtering to reduce load
3. Clear event streams periodically
4. Monitor resource usage with system tools

## Troubleshooting

### Common Issues and Solutions

#### Terminal Compatibility

**Issue**: Display issues or missing characters
**Solution**:

```bash
export TERM=xterm-256color
```

#### High CPU Usage

**Issue**: Excessive CPU consumption
**Solution**:

```json
{ "ui": { "refresh_rate": 30 } }
```

#### Memory Leaks

**Issue**: Increasing memory usage over time
**Solution**:

```bash
RUST_BACKTRACE=1 cargo run  # Run with debugging
```

#### GitHub API Rate Limits

**Issue**: GitHub requests failing
**Solution**:

- Check GitHub token permissions
- Use a higher-tier GitHub account
- Implement request throttling

### Debugging

Enable debug logging:

```bash
RUST_LOG=debug cargo run -- --debug
```

Export logs for support:

```bash
# Using command palette
Ctrl+P → system.export_logs
```

### Getting Help

1. Check the [FAQ](faq.md) for common questions
2. Review the [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
3. Join our [Discord Community](https://discord.gg/brainwav)
4. Contact [Support](https://support.brainwav.com)
