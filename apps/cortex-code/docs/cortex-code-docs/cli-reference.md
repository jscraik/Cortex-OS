# CLI Reference

This document provides detailed information about the command-line interface (CLI) for Cortex Code.

## Overview

Cortex Code can be launched and controlled through command-line arguments. The CLI provides options for configuration, debugging, and mode selection.

## Basic Usage

```bash
cortex [OPTIONS] [COMMAND]
```

## Options

### General Options

| Option                    | Description                                                      | Default                 |
| ------------------------- | ---------------------------------------------------------------- | ----------------------- |
| `-h`, `--help`            | Print help information                                           |                         |
| `-V`, `--version`         | Print version information                                        |                         |
| `-c`, `--config <CONFIG>` | Path to configuration file                                       | `~/.cortex/cortex.json` |
| `--debug`                 | Enable debug logging                                             | `false`                 |
| `--log-level <LOG_LEVEL>` | Set log level [possible values: trace, debug, info, warn, error] | `info`                  |

### Daemon Mode Options

| Option           | Description                    | Default     |
| ---------------- | ------------------------------ | ----------- |
| `-d`, `--daemon` | Run in daemon mode             | `false`     |
| `--port <PORT>`  | Port for daemon server         | `8080`      |
| `--bind <BIND>`  | Bind address for daemon server | `127.0.0.1` |

### Profile Options

| Option                | Description                  | Default   |
| --------------------- | ---------------------------- | --------- |
| `--profile <PROFILE>` | Configuration profile to use | `default` |

## Commands

### Main Command

Launches the TUI interface:

```bash
cortex
```

### Daemon Mode

Starts Cortex Code in daemon mode, which exposes a REST API:

```bash
cortex daemon [--port <PORT>] [--bind <BIND>]
```

### MCP Commands

Manage Model Context Protocol servers:

```bash
cortex mcp <SUBCOMMAND>
```

Subcommands:

- `list` - List available MCP servers
- `add <NAME> <CONFIG>` - Add a new MCP server
- `remove <NAME>` - Remove an MCP server

### Tunnel Commands

Manage Cloudflare tunnel integration:

```bash
cortex tunnel <SUBCOMMAND>
```

Subcommands:

- `setup` - Setup tunnel configuration
- `start [--port <PORT>]` - Start Cloudflare tunnel
- `stop` - Stop Cloudflare tunnel
- `status` - Get tunnel status

### Brainwav Commands

Manage Brainwav MCP integration:

```bash
cortex brainwav <SUBCOMMAND>
```

Subcommands:

- `test` - Test connection to MCP server
- `init` - Initialize Brainwav integration
- `status` - Get integration status
- `tools` - List available MCP tools
- `exec <TOOL> [--args <ARGS>]` - Execute an MCP tool

### Diagnostics Commands

Run diagnostics and health checks:

```bash
cortex diagnostics <SUBCOMMAND>
```

Subcommands:

- `report` - Generate comprehensive diagnostic report
- `health` - Run health checks
- `monitor` - Monitor system in real-time
- `export [--format <FORMAT>] [--output <OUTPUT>]` - Export diagnostic history

### Cloud Commands

Manage cloud provider integration:

```bash
cortex cloud <SUBCOMMAND>
```

Subcommands:

- `list` - List configured cloud providers
- `connect <PROVIDER>` - Connect to a cloud provider
- `status` - Get cloud connection status
- `failover` - Force failover to next available provider

### Help

Display help information:

```bash
cortex --help
```

### Version

Display version information:

```bash
cortex --version
```

## Environment Variables

Cortex Code also respects several environment variables that can modify its behavior:

| Variable              | Description                                     | Default                 |
| --------------------- | ----------------------------------------------- | ----------------------- |
| `CORTEX_CONFIG`       | Path to configuration file                      | `~/.cortex/cortex.json` |
| `CORTEX_PROFILE`      | Configuration profile to use                    | `default`               |
| `CORTEX_LOG_LEVEL`    | Log level for application                       | `info`                  |
| `CORTEX_DAEMON_PORT`  | Port for daemon mode                            | `8080`                  |
| `CORTEX_BIND_ADDRESS` | Bind address for daemon mode                    | `127.0.0.1`             |
| `RUST_LOG`            | Rust logging level (overrides CORTEX_LOG_LEVEL) |                         |

## Configuration File

While not strictly a CLI option, Cortex Code's behavior is heavily influenced by its configuration file. The configuration file can be specified via the `--config` option or the `CORTEX_CONFIG` environment variable.

### Default Locations

On macOS, Cortex Code looks for configuration files in the following locations (in order of precedence):

1. Current directory: `./cortex.json`
2. Home directory: `~/.cortex/cortex.json`
3. System config directory: `~/Library/Application Support/ai.cortex-os.cortex/cortex.json`

## Examples

### Launch with Custom Configuration

```bash
cortex --config /path/to/custom-config.json
```

### Launch in Daemon Mode

```bash
cortex daemon --port 9090 --bind 0.0.0.0
```

### Enable Debug Logging

```bash
cortex --debug
```

### Use Specific Profile

```bash
cortex --profile development
```

### Combine Multiple Options

```bash
cortex --config ~/.cortex/prod.json --profile production --log-level warn
```

### Setup Cloudflare Tunnel

```bash
cortex tunnel setup
```

### Start Tunnel on Custom Port

```bash
cortex tunnel start --port 3000
```

## Exit Codes

| Code | Description          |
| ---- | -------------------- |
| `0`  | Success              |
| `1`  | General error        |
| `2`  | Configuration error  |
| `3`  | Network error        |
| `4`  | Authentication error |

## Logging

Cortex Code outputs logs to stderr by default. When running in daemon mode, logs can also be written to a file as specified in the configuration.

Log levels (from most to least verbose):

- `trace`: Very detailed diagnostic information
- `debug`: Detailed diagnostic information
- `info`: General information about application execution
- `warn`: Warning conditions that don't stop execution
- `error`: Error conditions that may affect functionality

## macOS Specific Considerations

On macOS, Cortex Code follows standard conventions for application data storage:

- Configuration files are stored in `~/Library/Application Support/ai.cortex-os.cortex/`
- Log files are stored in `~/Library/Logs/ai.cortex-os.cortex/`
- Cache data is stored in `~/Library/Caches/ai.cortex-os.cortex/`

These locations are used when no explicit configuration file is specified and the default locations are used.

## Troubleshooting

### Command Not Found

If you get a "command not found" error, ensure that:

1. Cortex Code is properly installed
2. The installation directory is in your PATH
3. On macOS, you may need to add the installation directory to your shell profile:

```bash
# For zsh (default on macOS)
echo 'alias cortex="codex"' >> ~/.zshrc && source ~/.zshrc
source ~/.zshrc
```

### Permission Denied

If you encounter permission issues:

1. Ensure the cortex binary is available (via alias or symlink to the built `codex` binary):

   ```bash
   ln -sf /path/to/codex ~/.local/bin/cortex
   ```

2. On macOS, you may need to grant terminal access in System Preferences > Security & Privacy > Privacy > Developer Tools

### Configuration Issues

If Cortex Code fails to start due to configuration issues:

1. Validate your JSON configuration file syntax
2. Check that all required fields are present
3. Verify file permissions on the configuration file
4. Use the `--debug` flag to get more detailed error information
