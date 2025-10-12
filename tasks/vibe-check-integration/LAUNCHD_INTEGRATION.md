# 🚀 Vibe-Check LaunchD Integration

**Status**: ✅ Complete
**Date**: October 11, 2025
**Integration**: Vibe-Check server bundled with Local Memory LaunchAgent

---

## 📋 Integration Overview

The vibe-check MCP server is now integrated into the **Local Memory LaunchAgent** for automatic startup and management. This provides a unified brAInwav services experience.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                macOS LaunchAgent                         │
│         com.brainwav.local-memory.plist                 │
└───────────────┬───────────────────────────────────────────┘
                │
                │ Starts startup script
                ▼
┌─────────────────────────────────────────────────────────┐
│          Enhanced Startup Script                        │
│    start-local-memory.sh (7 steps)                     │
└───────────────┬───────────────────────────────────────────┘
                │
      ┌─────────┴─────────┐
      │                   │
      ▼                   ▼
┌─────────────┐    ┌─────────────────┐
│ Vibe-Check  │    │  Local Memory   │
│ Server      │    │  REST API       │
│ Port 2091   │    │  Port 3028      │
└─────────────┘    └─────────────────┘
```

---

## 🔧 Configuration Changes

### 1. LaunchAgent Environment Variables
```xml
<!-- Added to com.brainwav.local-memory.plist -->
<key>EnvironmentVariables</key>
<dict>
    <key>VIBE_CHECK_HTTP_URL</key>
    <string>http://127.0.0.1:2091</string>
    <key>VIBE_CHECK_ENABLED</key>
    <string>true</string>
</dict>
```

### 2. Startup Script Enhancement
- **Step 6**: Start vibe-check server on port 2091
- **Step 7**: Start local-memory REST API on port 3028
- **Health Checks**: Both services verified during startup
- **Process Management**: PIDs tracked for graceful shutdown

### 3. Stop Script Enhancement
- Automatic detection and shutdown of vibe-check server
- Graceful then forceful termination
- Unified service management

---

## 🚀 Automatic Startup (LaunchAgent)

### Installation
```bash
cd apps/cortex-os/packages/local-memory
chmod +x scripts/*.sh
pnpm install:autostart
```

### What Happens on Login
1. **LaunchAgent** loads at user login
2. **Environment Variables** set for both services
3. **Startup Script** executes:
   - ✅ Check prerequisites (Ollama, Qdrant)
   - ✅ Start Qdrant if needed
   - ✅ Build local-memory service
   - ✅ **Start vibe-check server (port 2091)**
   - ✅ **Start local-memory REST API (port 3028)**
   - ✅ Health checks for both services

### Service Management
```bash
# Check status
launchctl list | grep brainwav

# View logs
tail -f apps/cortex-os/packages/local-memory/logs/launchd-stdout.log
tail -f apps/cortex-os/packages/local-memory/logs/launchd-stderr.log

# Restart services
launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory

# Stop services
launchctl stop com.brainwav.local-memory
```

---

## 🔍 Service Logs & Monitoring

### Log Locations
```
apps/cortex-os/packages/local-memory/logs/
├── launchd-stdout.log     # LaunchAgent output
├── launchd-stderr.log     # LaunchAgent errors
├── local-memory.log       # Local Memory REST API
├── vibe-check.log         # Vibe-Check server
└── server.pid            # Local Memory process ID
```

### Monitoring Commands
```bash
# Check both services are running
curl -s http://127.0.0.1:2091/healthz  # Vibe-Check
curl -s http://127.0.0.1:3028/healthz   # Local Memory

# Monitor vibe-check activity in Cortex-OS
grep "brAInwav-vibe-check" /var/log/cortex-os/cortex-os.log

# Run comprehensive monitoring
./scripts/monitor-vibe-check.sh
```

---

## 🎯 Integration Benefits

### ✅ Unified Management
- **Single LaunchAgent** manages both services
- **Coordinated startup** with dependency handling
- **Graceful shutdown** of all services
- **Consistent logging** and monitoring

### ✅ Automatic Recovery
- **KeepAlive** configuration restarts crashed services
- **ThrottleInterval** prevents rapid restart loops
- **Health checks** verify service readiness
- **Error logging** for troubleshooting

### ✅ Production Ready
- **Background execution** with low priority
- **Resource limits** and nice values
- **Session management** for user login
- **Environment isolation** for each service

---

## 🔧 Troubleshooting

### Vibe-Check Server Issues
```bash
# Check if running
pgrep -f "vibe-check-mcp.*2091"

# Check port
lsof -i :2091

# Check logs
tail -f apps/cortex-os/packages/local-memory/logs/vibe-check.log

# Manual restart
pkill -f "vibe-check-mcp.*2091"
launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory
```

### Local Memory Issues
```bash
# Check if running
pgrep -f "node.*server.js"

# Check port
lsof -i :3028

# Check logs
tail -f apps/cortex-os/packages/local-memory/logs/local-memory.log

# Manual restart
pkill -f "node.*server.js"
launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory
```

### LaunchAgent Issues
```bash
# Check LaunchAgent status
launchctl list | grep brainwav

# Load/unload LaunchAgent
launchctl unload ~/Library/LaunchAgents/com.brainwav.local-memory.plist
launchctl load ~/Library/LaunchAgents/com.brainwav.local-memory.plist

# Check LaunchAgent logs
log show --predicate 'process == "launchd"' --info --debug | grep brainwav
```

---

## 📊 Service Status Dashboard

### Quick Health Check
```bash
#!/bin/bash
echo "=== brAInwav Services Status ==="
echo ""

# Check vibe-check
if curl -s http://127.0.0.1:2091/healthz > /dev/null; then
    echo "✅ Vibe-Check Server: RUNNING (port 2091)"
else
    echo "❌ Vibe-Check Server: DOWN"
fi

# Check local-memory
if curl -s http://127.0.0.1:3028/healthz > /dev/null; then
    echo "✅ Local Memory API: RUNNING (port 3028)"
else
    echo "❌ Local Memory API: DOWN"
fi

# Check LaunchAgent
if launchctl list | grep -q "com.brainwav.local-memory"; then
    echo "✅ LaunchAgent: LOADED"
else
    echo "❌ LaunchAgent: NOT LOADED"
fi

echo ""
echo "=== Process Information ==="
ps aux | grep -E "(vibe-check|node.*server)" | grep -v grep || echo "No processes found"
```

---

## 🎓 Key Learnings

### LaunchAgent Integration Benefits
1. **Single Point of Management**: One LaunchAgent handles multiple services
2. **Dependency Management**: Ordered startup with health verification
3. **Automatic Recovery**: KeepAlive ensures service reliability
4. **Production Stability**: Background service with proper resource management

### Architecture Decisions
1. **Shared Environment**: Both services inherit same PATH and environment
2. **Separate Logs**: Each service maintains independent log files
3. **Graceful Degradation**: Local Memory starts even if vibe-check fails
4. **Unified Shutdown**: Stop script handles all services cleanly

### Operational Excellence
1. **Health Monitoring**: Both services have health endpoints
2. **Process Tracking**: PIDs saved for graceful management
3. **Error Handling**: Comprehensive error logging and recovery
4. **User Experience**: Automatic startup at login, invisible to user

---

## 📚 References

- **LaunchAgent Config**: `apps/cortex-os/packages/local-memory/launchd/com.brainwav.local-memory.plist`
- **Startup Script**: `apps/cortex-os/packages/local-memory/scripts/start-local-memory.sh`
- **Stop Script**: `apps/cortex-os/packages/local-memory/scripts/stop-local-memory.sh`
- **Service Logs**: `apps/cortex-os/packages/local-memory/logs/`
- **Monitoring Script**: `scripts/monitor-vibe-check.sh`

---

**Integration Status**: ✅ COMPLETE
**Automatic Startup**: ✅ ENABLED
**Production Ready**: ✅ VERIFIED