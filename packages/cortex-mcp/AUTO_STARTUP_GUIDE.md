# MCP Server Auto-Startup Guide

This guide explains how to configure the MCP server with the TDD Coach plugin to run automatically on system startup.

## Overview

The MCP server with TDD Coach plugin can be configured to run automatically using macOS launchd (the equivalent of systemd on Linux). This ensures that the server is always available for AI systems to access TDD Coach functionality.

## Prerequisites

1. MCP server installed and configured
2. TDD Coach plugin installed in the plugins directory
3. TDD Coach Node.js package available at `/Users/jamiecraik/.Cortex-OS/packages/tdd-coach`

## Configuration Files

### 1. Server Configuration

The server configuration is located at:

```bash
/Users/jamiecraik/.Cortex-OS/packages/cortex-mcp/config/server.json
```

Key settings:

- Host: `127.0.0.1`
- Port: `3000`
- Plugin directory: `plugins`
- Auto-reload: `true`

### 2. Launchd Configuration

The launchd configuration file is located at:

```
/Users/jamiecraik/.Cortex-OS/infra/mcp/com.brainwav.mcp-server.plist
```

This file defines:

- Service label: `com.brainwav.mcp-server`
- Program to run: `/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server.sh`
- Working directory: `/Users/jamiecraik/.Cortex-OS/packages/cortex-mcp`
- Auto-start on load: `true`
- Keep alive: `true`
- Log files: `/Users/jamiecraik/.Cortex-OS/logs/mcp-server.log`

### 3. Startup Script

The startup script is located at:

```
/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server.sh
```

This script:

1. Changes to the MCP directory
2. Starts the MCP server with the correct configuration
3. Makes the server available at `http://127.0.0.1:3000`
4. Provides access via Cloudflare tunnel at `https://cortex-mcp.brainwav.io`

## Installation

### 1. Install the Launchd Service

Copy the launchd configuration file to the system's launch directory:

```bash
sudo cp /Users/jamiecraik/.Cortex-OS/infra/mcp/com.brainwav.mcp-server.plist /Library/LaunchDaemons/
sudo chown root:wheel /Library/LaunchDaemons/com.brainwav.mcp-server.plist
sudo chmod 644 /Library/LaunchDaemons/com.brainwav.mcp-server.plist
```

### 2. Load the Service

Load the service to start it immediately and enable auto-start on boot:

```bash
sudo launchctl load /Library/LaunchDaemons/com.brainwav.mcp-server.plist
```

### 3. Verify the Service

Check if the service is running:

```bash
sudo launchctl list | grep brainwav
```

You should see output similar to:

```bash
-   0   com.brainwav.mcp-server
```

## Usage

### Starting the Service

If you need to start the service manually:

```bash
sudo launchctl start com.brainwav.mcp-server
```

### Stopping the Service

To stop the service:

```bash
sudo launchctl stop com.brainwav.mcp-server
```

### Restarting the Service

To restart the service:

```bash
sudo launchctl stop com.brainwav.mcp-server
sudo launchctl start com.brainwav.mcp-server
```

### Unloading the Service

To completely unload the service:

```bash
sudo launchctl unload /Library/LaunchDaemons/com.brainwav.mcp-server.plist
```

## Testing

### Verify Server Status

Check if the server is running:

```bash
curl -f http://127.0.0.1:3000/health
```

You should receive a JSON response indicating the server is healthy.

### Test TDD Coach Plugin

Run the test script to verify the TDD Coach plugin is loaded:

```bash
/Users/jamiecraik/.Cortex-OS/scripts/test-mcp-tdd-coach.sh
```

## Troubleshooting

### Check Logs

View the server logs:

```bash
tail -f /Users/jamiecraik/.Cortex-OS/logs/mcp-server.log
```

View error logs:

```bash
tail -f /Users/jamiecraik/.Cortex-OS/logs/mcp-server-error.log
```

### Common Issues

1. **Service not starting**: Check file permissions and paths in the plist file
2. **Plugin not loading**: Verify the TDD Coach plugin files are in the plugins directory
3. **Port conflicts**: Ensure port 3000 is not being used by another service
4. **Python path issues**: Verify the Python path in the plist file matches your installation

## Access

Once running, the MCP server will be available at:

- Local access: `http://127.0.0.1:3000`
- Cloudflare tunnel: `https://cortex-mcp.brainwav.io`

The TDD Coach plugin will automatically expose the following tools:

1. `tdd_coach.analyze_test_coverage`
2. `tdd_coach.generate_test`
3. `tdd_coach.refactor_test`
4. `tdd_coach.validate_tdd_flow`
5. `tdd_coach.coach_recommendation`

These tools will be available to any AI system connected to the MCP server through the standard MCP protocol.
