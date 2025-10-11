# Autostart Configuration - brAInwav Local Memory REST API

**Last Updated**: 2025-10-11  
**Platform**: macOS (LaunchAgent)  
**Status**: Optional Service

## ⚠️ Important Notice

This guide configures autostart for the **optional REST API server** (port 3028).

**Most users do NOT need this.** The **MCP Server** (port 3024) already provides full memory access and should be configured for autostart instead if needed.

**Only configure this if:**
- You specifically need the REST API server running at all times
- You have custom applications using the REST endpoints
- You understand you're running a separate service from the MCP server

## Overview

The REST API server can be configured to start automatically when your system boots up (at user login) and shutdown gracefully when you log out or shut down your system.

This is implemented using macOS LaunchAgent, which provides:
- ✅ Automatic startup at user login
- ✅ Graceful shutdown at logout/system shutdown
- ✅ Automatic restart if the service crashes
- ✅ System-level management with `launchctl`
- ✅ Proper logging and monitoring

---

## Quick Installation

```bash
# Navigate to local-memory directory
cd apps/cortex-os/packages/local-memory

# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Install autostart
bash scripts/install-autostart.sh
```

This will:
1. ✅ Verify prerequisites (Node.js, pnpm)
2. ✅ Build the service if needed
3. ✅ Create LaunchAgent plist with proper paths
4. ✅ Install to `~/Library/LaunchAgents/`
5. ✅ Load and start the service
6. ✅ Verify it's running

---

## What Gets Configured

### LaunchAgent Plist
Location: `~/Library/LaunchAgents/com.brainwav.local-memory.plist`

**Features:**
- **RunAtLoad**: Starts when you login
- **KeepAlive**: Automatically restarts if crashed
- **ThrottleInterval**: 30-second wait before restart
- **ProcessType**: Background service
- **StandardOutPath**: Logs to `logs/launchd-stdout.log`
- **StandardErrorPath**: Logs to `logs/launchd-stderr.log`

### Service Behavior

| Event | Action |
|-------|--------|
| User Login | Service starts automatically |
| Service Crashes | Restarts after 30 seconds |
| User Logout | Graceful shutdown |
| System Shutdown | Graceful shutdown |
| Manual Stop | Service stays stopped until restart or login |

---

## Service Management

### Check Status

```bash
# List all LaunchAgents
launchctl list | grep brainwav

# Detailed status
launchctl list com.brainwav.local-memory

# Test health endpoint
curl http://127.0.0.1:3028/healthz
```

### Manual Control

```bash
# Stop service
launchctl stop com.brainwav.local-memory

# Start service
launchctl start com.brainwav.local-memory

# Restart service (kills and restarts)
launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory

# Reload configuration (after plist changes)
launchctl unload ~/Library/LaunchAgents/com.brainwav.local-memory.plist
launchctl load ~/Library/LaunchAgents/com.brainwav.local-memory.plist
```

### View Logs

```bash
# LaunchAgent stdout (service startup)
tail -f logs/launchd-stdout.log

# LaunchAgent stderr (errors)
tail -f logs/launchd-stderr.log

# Application logs
tail -f logs/local-memory.log

# System logs (launchd)
log show --predicate 'process == "launchd"' --last 5m | grep brainwav
```

---

## Uninstallation

To remove the autostart configuration:

```bash
bash scripts/uninstall-autostart.sh
```

This will:
1. Stop the service
2. Unload the LaunchAgent
3. Remove the plist file
4. Clean up info files

The service can still be run manually after uninstallation.

---

## Troubleshooting

### Service Won't Start

**Check LaunchAgent logs:**
```bash
tail -f logs/launchd-stdout.log
tail -f logs/launchd-stderr.log
```

**Common issues:**

1. **Node not in PATH**
   - The plist includes `/opt/homebrew/bin` for Homebrew-installed Node
   - Edit the plist if Node is installed elsewhere

2. **Missing dependencies**
   ```bash
   cd apps/cortex-os/packages/local-memory
   pnpm install
   pnpm build
   ```

3. **Ollama not running**
   ```bash
   ollama serve
   ```

4. **Port 3028 in use**
   ```bash
   lsof -ti:3028 | xargs kill -9
   ```

### Service Keeps Crashing

**Check application logs:**
```bash
tail -f logs/local-memory.log
```

**Common causes:**
- Ollama not running or models not installed
- Qdrant configuration issues
- Port conflicts
- Permission issues

**Disable automatic restart:**
Edit `~/Library/LaunchAgents/com.brainwav.local-memory.plist`:
```xml
<key>KeepAlive</key>
<false/>
```

Then reload:
```bash
launchctl unload ~/Library/LaunchAgents/com.brainwav.local-memory.plist
launchctl load ~/Library/LaunchAgents/com.brainwav.local-memory.plist
```

### Service Not Loading

**Check plist syntax:**
```bash
plutil -lint ~/Library/LaunchAgents/com.brainwav.local-memory.plist
```

**Check launchd logs:**
```bash
log show --predicate 'process == "launchd"' --last 10m | grep -i error
```

**Verify file permissions:**
```bash
chmod 644 ~/Library/LaunchAgents/com.brainwav.local-memory.plist
```

### Health Check Fails

**Test manually:**
```bash
# Stop LaunchAgent
launchctl stop com.brainwav.local-memory

# Start manually to see errors
cd apps/cortex-os/packages/local-memory
bash scripts/start-local-memory.sh
```

---

## Advanced Configuration

### Environment Variables

Edit the plist at `~/Library/LaunchAgents/com.brainwav.local-memory.plist`:

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>MEMORY_API_PORT</key>
    <string>3028</string>
    <key>LOCAL_MEMORY_HOST</key>
    <string>127.0.0.1</string>
    <key>MEMORY_LOG_LEVEL</key>
    <string>info</string>
    <!-- Add more variables here -->
</dict>
```

After editing, reload:
```bash
launchctl unload ~/Library/LaunchAgents/com.brainwav.local-memory.plist
launchctl load ~/Library/LaunchAgents/com.brainwav.local-memory.plist
```

### Resource Limits

Add to plist:
```xml
<!-- Soft memory limit (bytes) -->
<key>SoftResourceLimits</key>
<dict>
    <key>MemoryLimit</key>
    <integer>2147483648</integer> <!-- 2GB -->
</dict>

<!-- CPU usage (0.0 to 1.0) -->
<key>ProcessType</key>
<string>Background</string>
<key>Nice</key>
<integer>5</integer>
```

### Startup Delay

Add to plist to wait before starting:
```xml
<key>StartInterval</key>
<integer>30</integer> <!-- Wait 30 seconds after login -->
```

---

## Linux Alternative (systemd)

For Linux systems, create a systemd service:

**File**: `~/.config/systemd/user/local-memory.service`

```ini
[Unit]
Description=brAInwav Local Memory Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/apps/cortex-os/packages/local-memory
ExecStart=/bin/bash /path/to/scripts/start-local-memory.sh
Restart=on-failure
RestartSec=30
StandardOutput=append:/path/to/logs/systemd-stdout.log
StandardError=append:/path/to/logs/systemd-stderr.log

[Install]
WantedBy=default.target
```

**Enable and start:**
```bash
systemctl --user daemon-reload
systemctl --user enable local-memory
systemctl --user start local-memory
```

---

## Windows Alternative (Task Scheduler)

For Windows systems:

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When I log on"
4. Action: "Start a program"
5. Program: `cmd.exe`
6. Arguments: `/c cd /d C:\path\to\local-memory && start-local-memory.bat`

---

## Monitoring

### Health Checks

Create a monitoring script that runs periodically:

```bash
#!/bin/bash
# Check if service is healthy
if ! curl -f -s http://127.0.0.1:3028/healthz > /dev/null 2>&1; then
  echo "Service unhealthy, restarting..."
  launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory
fi
```

### Log Rotation

LaunchAgent logs can grow large. Add log rotation:

**File**: `/etc/newsyslog.d/local-memory.conf`
```
/path/to/logs/launchd-*.log  644  5  10000  *  JC
```

---

## Security Considerations

### Permissions

- LaunchAgent plist should be owned by you and readable by system
- Logs directory should have proper permissions
- Service runs with your user privileges (not root)

### Network Binding

By default, service binds to `127.0.0.1` (localhost only). To allow network access:

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>LOCAL_MEMORY_HOST</key>
    <string>0.0.0.0</string>
</dict>
```

⚠️ **Warning**: Only bind to `0.0.0.0` if you have proper firewall rules and authentication.

---

## Quick Reference

| Task | Command |
|------|---------|
| Install autostart | `bash scripts/install-autostart.sh` |
| Uninstall autostart | `bash scripts/uninstall-autostart.sh` |
| Check status | `launchctl list \| grep brainwav` |
| Stop service | `launchctl stop com.brainwav.local-memory` |
| Start service | `launchctl start com.brainwav.local-memory` |
| Restart service | `launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory` |
| View logs | `tail -f logs/launchd-stdout.log` |
| Test health | `curl http://127.0.0.1:3028/healthz` |
| Edit config | `edit ~/Library/LaunchAgents/com.brainwav.local-memory.plist` |

---

## Support

- **Installation Guide**: See `docs/SETUP.md`
- **Main README**: `README.md`
- **Logs Location**: `logs/` directory
- **Plist Location**: `~/Library/LaunchAgents/com.brainwav.local-memory.plist`
- **Info File**: `AUTOSTART-INFO.txt` (created after installation)

---

**brAInwav Development Team**  
**Status**: Production Ready  
**Platform**: macOS LaunchAgent
