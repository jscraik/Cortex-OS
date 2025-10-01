# Pieces CLI Installation Guide for brAInwav Cortex-OS

## Overview

The Pieces CLI provides command-line access to Pieces OS Long-Term Memory (LTM) and integrates with the brAInwav MCP Hub for unified memory management.

## Prerequisites

1. **Pieces OS**: Must be installed and running
   - Download: https://docs.pieces.app/products/core-dependencies/pieces-os
   - Runs on: `localhost:39300`
   - MCP endpoint: `http://localhost:39300/model_context_protocol/2024-11-05/sse`

2. **Python 3.x**: Required for CLI installation
   - Check: `python3 --version`
   - Install: https://www.python.org/downloads/

3. **Sign in Required**: You'll be prompted to authenticate on first use

## Installation

### Option 1: Using pipx (Recommended)

```bash
# Install pipx if not already installed
python3 -m pip install --user pipx
python3 -m pipx ensurepath

# Install Pieces CLI
pipx install pieces-cli
```

### Option 2: Using pip

```bash
# Install for current user
python3 -m pip install --user pieces-cli

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="$PATH:$(python3 -m site --user-base)/bin"
```

### Option 3: Using Installation Script

```bash
# Run the provided installation script
bash /Users/jamiecraik/.Cortex-OS/scripts/install-pieces-cli.sh
```

## Verification

```bash
# Check version
pieces version

# Should output something like:
# Pieces OS Version: 10.x.x
# Pieces CLI Version: 8.x.x
```

## Onboarding

The first time you run Pieces CLI, it will guide you through onboarding:

```bash
# Start interactive mode
pieces run
```

The onboarding will cover:
1. **Save Your First Snippet**: Copy code and run `create`
2. **List Materials**: Use `list` to see saved snippets
3. **Search**: Use `search "query"` to find snippets
4. **Ask Copilot**: Use `ask 'your question'` for AI assistance

## Basic Usage

### Save a Snippet

```bash
# Copy code to clipboard, then:
pieces create

# Or in interactive mode:
pieces run
> create
```

### List Saved Snippets

```bash
pieces list

# Or in interactive mode:
> list
```

### Search for Snippets

```bash
# Fuzzy search (default)
pieces search "authentication"

# Neural Code Search
pieces search "authentication" --mode ncs

# Full Text Search
pieces search "authentication" --mode fts
```

### Ask Copilot

```bash
# Ask a question
pieces ask 'How do I implement async/await in TypeScript?'

# Or in interactive mode:
> ask 'How do I implement async/await in TypeScript?'
```

### Edit a Snippet

```bash
# Edit snippet metadata
pieces edit

# Follow prompts to select and modify snippet
```

### Delete a Snippet

```bash
# Delete a snippet
pieces delete

# Follow prompts to select snippet to delete
```

## Integration with brAInwav MCP Hub

The Pieces CLI works alongside the brAInwav MCP Hub to provide unified memory access:

### Architecture

```
MCP Clients (Claude, ChatGPT, etc.)
           ↓
brAInwav MCP Hub (port 3024)
           ↓
    ┌──────┴──────┐
    ↓             ↓
Local Memory   Pieces MCP Proxy
(memory-core)  (SSE to Pieces OS)
                   ↓
              Pieces CLI
            (localhost:39300)
```

### Configuration

Add to your environment (e.g., `~/.zshrc`):

```bash
# Enable Pieces MCP integration
export PIECES_MCP_ENABLED=true
export PIECES_MCP_ENDPOINT=http://localhost:39300/model_context_protocol/2024-11-05/sse
```

### MCP Tools Available

When connected, the following tools are available through MCP:

1. **pieces.ask_pieces_ltm** - Query Pieces Long-Term Memory
2. **pieces.create_pieces_memory** - Store new memories in Pieces
3. **memory.hybrid_search** - Search both local memory-core and Pieces LTM

### Usage Example

```bash
# Start Pieces OS (if not running)
# Open Pieces OS application

# Verify Pieces MCP is accessible
curl http://localhost:39300/health

# Start MCP server with Pieces integration
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server
PORT=3024 PIECES_MCP_ENABLED=true pnpm dev

# In another terminal, test the integration
curl -X POST http://localhost:3024/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Should show both local and pieces.* tools
```

## LaunchAgent Configuration

To auto-start Pieces MCP integration with macOS:

```xml
<!-- ~/Library/LaunchAgents/com.cortexos.mcp.server.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cortexos.mcp.server</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PIECES_MCP_ENDPOINT</key>
        <string>http://localhost:39300/model_context_protocol/2024-11-05/sse</string>
        <key>PIECES_MCP_ENABLED</key>
        <string>true</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load the LaunchAgent:

```bash
launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.plist
```

## Troubleshooting

### Pieces CLI Not Found

**Problem**: `pieces: command not found`

**Solution**:

```bash
# Check if installed
python3 -m pip list | grep pieces-cli

# If installed, add to PATH
export PATH="$PATH:$(python3 -m site --user-base)/bin"

# Or run directly
python3 -m pieces version
```

### Cannot Connect to Pieces OS

**Problem**: `Failed to connect to Pieces OS`

**Solution**:

1. Ensure Pieces OS application is running
2. Check Pieces OS is listening on port 39300:
   ```bash
   lsof -i :39300
   ```
3. Verify Pieces OS health:
   ```bash
   curl http://localhost:39300/health
   ```
4. Check Pieces OS logs for errors

### MCP Integration Not Working

**Problem**: Pieces tools not appearing in MCP Hub

**Solution**:

1. Verify `PIECES_MCP_ENABLED=true` is set
2. Check MCP server logs:
   ```bash
   tail -f /path/to/mcp-server/logs/mcp-server.log
   ```
3. Look for connection messages:
   - `brAInwav: Connected to Pieces MCP server` (success)
   - `brAInwav: Pieces MCP unavailable` (failure)
4. Test Pieces SSE endpoint directly:
   ```bash
   curl -H "Accept: text/event-stream" \
     http://localhost:39300/model_context_protocol/2024-11-05/sse
   ```

### Authentication Issues

**Problem**: Prompted to sign in repeatedly

**Solution**:

1. Sign in via Pieces Desktop app first
2. Ensure you're signed into the same account across all Pieces products
3. Check Pieces OS authentication status in app settings

## Advanced Configuration

### Custom Pieces OS Port

If Pieces OS runs on a non-default port:

```bash
export PIECES_MCP_ENDPOINT=http://localhost:YOUR_PORT/model_context_protocol/2024-11-05/sse
```

### Disable Pieces Integration Temporarily

```bash
# Disable Pieces MCP integration
export PIECES_MCP_ENABLED=false

# MCP Hub will continue with local tools only
```

### Enable Debug Logging

```bash
# Enable verbose Pieces CLI logging
pieces --verbose run

# Enable MCP server debug logging
MCP_LOG_LEVEL=debug PORT=3024 PIECES_MCP_ENABLED=true pnpm dev
```

## Useful Commands

```bash
# Get help
pieces help

# Check status
pieces version

# Open GitHub discussions for feedback
pieces feedback

# View source code
pieces contribute

# Start interactive session
pieces run

# Exit interactive session
exit
```

## Resources

- **Pieces CLI Documentation**: https://docs.pieces.app/products/cli
- **Pieces OS Documentation**: https://docs.pieces.app/products/core-dependencies/pieces-os
- **MCP Integration Guide**: `/Users/jamiecraik/.Cortex-OS/website/docs/architecture/mcp-memory-integration.md`
- **brAInwav MCP Server**: `/Users/jamiecraik/.Cortex-OS/packages/mcp-server/README.md`
- **Installation Script**: `/Users/jamiecraik/.Cortex-OS/scripts/install-pieces-cli.sh`

## Next Steps

After installing Pieces CLI:

1. ✅ Install and start Pieces OS
2. ✅ Complete Pieces CLI onboarding: `pieces run`
3. ✅ Save a few test snippets
4. ✅ Start MCP server with Pieces integration enabled
5. ✅ Test hybrid search via MCP tools
6. ✅ Configure LaunchAgent for auto-start (optional)

---

**Last Updated**: 2025-10-01  
**Maintained by**: brAInwav Development Team
