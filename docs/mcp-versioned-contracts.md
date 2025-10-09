# MCP Versioned Contracts Implementation

This document describes the implementation of MCP versioned contracts, including notifications, tool versioning, and resource management in Cortex-OS.

## Overview

Cortex-OS implements the MCP (Model Context Protocol) specification with support for:

- **Real-time notifications** for prompts, resources, and tools changes
- **Semantic versioning** for tools (SEP-1575)
- **Resource subscriptions** with change notifications
- **Manual refresh** capabilities for clients that don't support notifications
- **File system watching** with debounced change detection

## MCP Capabilities

### Prompts
```json
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

**Notification**: `notifications/prompts/list_changed`

### Resources
```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    }
  }
}
```

**Notifications**:
- `notifications/resources/list_changed`
- `notifications/resources/updated`

### Tools
```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```

**Notification**: `notifications/tools/list_changed`

## Tool Versioning (SEP-1575)

When `CORTEX_MCP_TOOLS_VERSIONING=true`, tools support semantic versioning constraints:

### Tool Definition
```json
{
  "name": "echo",
  "version": "1.1.0",
  "description": "Enhanced echo tool",
  "inputSchema": {
    "type": "object",
    "properties": {
      "text": { "type": "string" }
    }
  },
  "metadata": {
    "author": "Cortex-OS Team",
    "tags": ["utility", "echo"],
    "securityLevel": "low"
  }
}
```

### Version Constraints
```javascript
// Exact version
await callTool("echo", { text: "hello" }, {
  tool_requirements: { echo: "1.1.0" }
});

// Version range
await callTool("echo", { text: "hello" }, {
  tool_requirements: { echo: "^1.0.0" }
});

// Compatible version
await callTool("echo", { text: "hello" }, {
  tool_requirements: { echo: "~1.1.0" }
});
```

### Constraint Resolution
- Uses `semver` library for constraint satisfaction
- Returns the latest version that satisfies the constraint
- Falls back to unversioned tools if no versioned tool satisfies constraint
- Returns `UNSATISFIED_TOOL_VERSION` error if no tool matches

## File System Watching

The MCP server includes a debounced file system watcher that monitors:

- **Prompts directory** (`prompts/` by default)
- **Resources directory** (`resources/` by default)
- **Tools directory** (`tools/` by default)

### Configuration
```bash
CORTEX_MCP_FS_WATCHER_ENABLED=true
CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS=250
CORTEX_MCP_PROMPTS_PATH=prompts
CORTEX_MCP_RESOURCES_PATH=resources
CORTEX_MCP_TOOLS_PATH=tools
```

### Debounced Notifications
- File changes are batched within the debounce window (default 250ms)
- Single `list_changed` notification is emitted per batch
- Resource content changes trigger individual `updated` notifications

## Manual Refresh Tool

For clients that don't support MCP notifications (e.g., Claude Code), a manual refresh tool is provided:

```javascript
// Refresh all resources
await callTool("cortex_mcp_refresh", {
  scope: "all",
  force: false
});

// Refresh only prompts
await callTool("cortex_mcp_refresh", {
  scope: "prompts",
  force: true
});
```

### Response Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "[brAInwav] Successfully refreshed: prompts, resources, tools"
    }
  ],
  "correlationId": "refresh_1234567890_abc123",
  "refreshed": {
    "prompts": true,
    "resources": true,
    "tools": true
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Client Compatibility

### Supported Clients
- **Full MCP Support**: Clients that support all notification types
- **Partial Support**: Clients that support some notifications but need manual refresh
- **No Notification Support**: Clients that require manual refresh

### Detection
```javascript
import { needsManualRefresh } from '@cortex-os/mcp';

const clientInfo = { name: 'claude-code', version: '1.0.0' };
if (needsManualRefresh(clientInfo)) {
  // Use manual refresh tool
}
```

## Configuration

### Environment Variables
```bash
# Notification capabilities
CORTEX_MCP_PROMPTS_LIST_CHANGED=true
CORTEX_MCP_RESOURCES_LIST_CHANGED=true
CORTEX_MCP_RESOURCES_SUBSCRIBE=true
CORTEX_MCP_TOOLS_LIST_CHANGED=true

# Versioning features
CORTEX_MCP_TOOLS_VERSIONING=false
CORTEX_MCP_PROMPTS_VERSIONING=true
CORTEX_MCP_RESOURCES_VERSIONING=true

# File system watching
CORTEX_MCP_FS_WATCHER_ENABLED=true
CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS=250

# Security and performance
CORTEX_MCP_ENABLE_SECURITY_VALIDATION=true
CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS=10
CORTEX_MCP_NOTIFICATION_TIMEOUT_MS=5000

# Debug options
CORTEX_MCP_DEBUG_NOTIFICATIONS=false
CORTEX_MCP_LOG_NOTIFICATION_PAYLOADS=false
```

### Configuration Loading
```typescript
import { loadMCPConfig, getMCPServerCapabilities } from '@cortex-os/mcp';

const config = loadMCPConfig();
const capabilities = getMCPServerCapabilities(config);
```

## Security Considerations

### Tool Version Validation
- All tool versions are validated against SemVer format
- Tool constraints are validated before execution
- Security levels are enforced based on tool metadata

### File System Access
- File watcher only monitors configured directories
- Ignored patterns prevent watching sensitive files:
  - `**/node_modules/**`
  - `**/.git/**`
  - `**/dist/**`
  - `**/*.tmp`
  - `**/*.log`

### Resource Subscriptions
- Subscription validation ensures authorized access
- Resource access is logged with correlation IDs
- Access controls are enforced via security metadata

## Error Handling

### Tool Version Errors
```json
{
  "error": {
    "code": -32001,
    "message": "[brAInwav] Tool echo constraint ^2.0.0 is not satisfiable"
  },
  "id": "call_123"
}
```

### Resource Subscription Errors
```json
{
  "error": {
    "code": -32003,
    "message": "[brAInwav] Resource subscription failed: access denied"
  },
  "id": "sub_456"
}
```

## Monitoring and Observability

### Structured Logging
All events include brAInwav branding and correlation IDs:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "event": "tool_resolved",
  "brand": "brAInwav",
  "service": "cortex-os-mcp-tool-registry",
  "toolName": "echo",
  "resolvedVersion": "1.1.0",
  "constraint": "^1.0.0",
  "correlationId": "tool_1234567890_abc123"
}
```

### Metrics
- Tool registration and resolution counts
- Notification emission rates
- File system change detection latency
- Version constraint satisfaction rates

## Testing

### Unit Tests
- Tool contract schema validation
- SemVer constraint resolution
- Notification emission logic
- File system watcher debouncing

### Integration Tests
- End-to-end notification flows
- Tool version constraint satisfaction
- Client compatibility scenarios
- File system change propagation

### Contract Tests
- MCP protocol compliance
- SEP-1575 specification adherence
- Notification format validation
- Error response standardization

## Migration Guide

### From Basic MCP
1. Enable notification capabilities in server configuration
2. Add file system watcher configuration
3. Implement manual refresh tool for backward compatibility
4. Add versioned tool contracts (optional)

### For Tool Authors
1. Update tool definitions to include version field
2. Add metadata for security and categorization
3. Follow file naming convention: `{name}.v{version}.tool.json`
4. Test with version constraints

## Troubleshooting

### Common Issues

**Notifications not received**
- Check client notification support
- Verify `CORTEX_MCP_*_LIST_CHANGED` flags
- Use manual refresh tool as fallback

**Tool version constraint failures**
- Verify SemVer format in tool definitions
- Check constraint syntax (^, ~, exact)
- Ensure tool registry has loaded the versions

**File system watcher not detecting changes**
- Verify `CORTEX_MCP_FS_WATCHER_ENABLED=true`
- Check directory paths in configuration
- Review ignored patterns for conflicts

### Debug Mode
```bash
CORTEX_MCP_DEBUG_NOTIFICATIONS=true
CORTEX_MCP_LOG_NOTIFICATION_PAYLOADS=true
```

This enables detailed logging of all notification events and payloads.