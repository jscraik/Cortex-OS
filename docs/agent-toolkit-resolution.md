# Agent-Toolkit Resolution Guide

## Overview

This document explains how agent-toolkit tools are resolved and exposed through the MCP hub in Cortex-OS. The system prioritizes local tool installation while providing fallback mechanisms for development environments.

## Tool Path Resolution Priority

The system resolves agent-toolkit tools using the following priority order:

1. **`$AGENT_TOOLKIT_TOOLS_DIR`** (explicit override)
   - Environment variable for explicit tool directory
   - Use case: Custom tool locations in CI/CD or specialized environments

2. **`$CORTEX_HOME/tools/agent-toolkit`**
   - Cortex-OS home directory tools
   - Use case: System-wide Cortex-OS installation

3. **`$HOME/.Cortex-OS/tools/agent-toolkit`** ← **Primary Path**
   - User-local tool installation
   - Recommended for developers and local deployments
   - Automatically mounted in Docker containers

4. **Repo fallback: `packages/agent-toolkit/tools`**
   - Built-in tools from the repository
   - Use case: Fresh installations without local tools

## Implementation Details

### Path Resolution Module

```typescript
// packages/agent-toolkit/src/infra/paths.ts
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ToolResolutionOptions {
  explicitDir?: string;
  cortexHome?: string;
  userHome?: string;
}

export function resolveToolsDir(options: ToolResolutionOptions = {}): string {
  const {
    explicitDir = process.env.AGENT_TOOLKIT_TOOLS_DIR,
    cortexHome = process.env.CORTEX_HOME,
    userHome = options.userHome ?? homedir()
  } = options;

  // Priority 1: Explicit override
  if (explicitDir) {
    return explicitDir;
  }

  // Priority 2: Cortex home
  if (cortexHome) {
    const cortexToolsDir = join(cortexHome, 'tools', 'agent-toolkit');
    if (existsSync(cortexToolsDir)) {
      return cortexToolsDir;
    }
  }

  // Priority 3: User home (primary path)
  const userToolsDir = join(userHome, '.Cortex-OS', 'tools', 'agent-toolkit');
  if (existsSync(userToolsDir)) {
    return userToolsDir;
  }

  // Priority 4: Repo fallback
  const repoDir = process.cwd();
  const fallbackDir = join(repoDir, 'packages', 'agent-toolkit', 'tools');
  if (existsSync(fallbackDir)) {
    return fallbackDir;
  }

  throw new Error('No valid agent-toolkit directory found');
}
```

### Docker Integration

The Docker Compose configuration automatically mounts the primary tool path:

```yaml
# docker/memory-stack/docker-compose.yml
services:
  cortex-mcp:
    volumes:
      - ~/.Cortex-OS/tools/agent-toolkit:/tools/agent-toolkit:ro
    environment:
      - AGENT_TOOLKIT_TOOLS_DIR=/tools/agent-toolkit
```

## MCP Tool Exposure

The MCP hub exposes agent-toolkit tools with the `agent_toolkit_` prefix:

### Available Tools

| Tool Name | Description | Script |
|-----------|-------------|---------|
| `agent_toolkit_search` | Multi-tool search (ripgrep + semgrep + ast-grep) | `search.sh` |
| `agent_toolkit_multi` | Parallel search across multiple tools | `multi.sh` |
| `agent_toolkit_codemod` | Structural modifications via Comby | `codemod.sh` |
| `agent_toolkit_validate` | Project validation based on file types | `validate.sh` |
| `agent_toolkit_scout` | Fast code pattern detection | `scout.sh` |

### Tool Implementation Example

```typescript
// packages/mcp-server/src/tool-handlers/agent-toolkit.ts
import { resolveToolsDir } from '@cortex-os/agent-toolkit';

export async function handleAgentToolkitSearch(
  args: { pattern: string; path?: string }
): Promise<any> {
  const toolsDir = resolveToolsDir();
  const scriptPath = join(toolsDir, 'search.sh');

  const result = await execFile(scriptPath, [
    args.pattern,
    args.path || '.'
  ]);

  return JSON.parse(result.stdout);
}
```

## Installation Guide

### Local Development Setup

1. **Create the tools directory:**
   ```bash
   mkdir -p ~/.Cortex-OS/tools/agent-toolkit
   ```

2. **Install tools (if not already present):**
   ```bash
   # Install required tools
   npm install -g @comby/comby
   brew install ripgrep semgrep

   # Or use the installation script
   ./scripts/install-agent-toolkit.sh
   ```

3. **Verify installation:**
   ```bash
   ls ~/.Cortex-OS/tools/agent-toolkit
   # Should show: search.sh, multi.sh, codemod.sh, validate.sh, scout.sh
   ```

### Docker Setup

The Docker configuration automatically mounts your local tools:

```bash
# Start with local tools
docker-compose up -d

# Verify tools are accessible
docker exec cortex-mcp ls /tools/agent-toolkit
```

### CI/CD Configuration

For CI/CD environments, use the explicit override:

```yaml
# .github/workflows/ci.yml
env:
  AGENT_TOOLKIT_TOOLS_DIR: ${{ github.workspace }}/tools/agent-toolkit
steps:
  - name: Install agent-toolkit
    run: |
      mkdir -p $AGENT_TOOLKIT_TOOLS_DIR
      cp -r packages/agent-toolkit/tools/* $AGENT_TOOLKIT_TOOLS_DIR/
```

## Usage Examples

### Via MCP (Claude Desktop)

```json
{
  "mcpServers": {
    "cortex-memory": {
      "command": "docker",
      "args": [
        "exec", "-i", "cortex-mcp",
        "node", "/app/dist/index.js",
        "--transport", "stdio"
      ]
    }
  }
}
```

### Via REST API

```javascript
// Search for a pattern
const response = await fetch('http://localhost:3028/api/v1/tools/agent_toolkit_search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pattern: 'TODO|FIXME',
    path: './src'
  })
});

const results = await response.json();
console.log(results.matches);
```

### Direct Tool Usage

```bash
# Use the tools directly
~/.Cortex-OS/tools/agent-toolkit/search.sh "async.*await" ./src

# Or via the MCP wrapper
docker exec cortex-mcp /tools/agent-toolkit/search.sh "pattern" "path"
```

## Troubleshooting

### Common Issues

1. **Tools not found**
   ```bash
   # Check which directory is being used
   node -e "console.log(require('@cortex-os/agent-toolkit').resolveToolsDir())"

   # Verify tools exist
   ls -la ~/.Cortex-OS/tools/agent-toolkit
   ```

2. **Permission denied**
   ```bash
   # Fix permissions
   chmod +x ~/.Cortex-OS/tools/agent-toolkit/*.sh
   ```

3. **Docker mount issues**
   ```bash
   # Check mount exists
   docker exec cortex-mcp ls /tools/agent-toolkit

   # Recreate container if needed
   docker-compose down && docker-compose up -d
   ```

### Debug Mode

Enable debug logging to see resolution path:

```bash
# Set debug flag
export AGENT_TOOLKIT_DEBUG=1

# Run MCP server
node packages/mcp-server/dist/index.js --transport stdio
```

Output:
```
[agent-toolkit] Resolving tools directory...
[agent-toolkit] Checking AGENT_TOOLKIT_TOOLS_DIR: undefined
[agent-toolkit] Checking CORTEX_HOME/tools/agent-toolkit: /opt/cortex/tools/agent-toolkit
[agent-toolkit] Checking ~/.Cortex-OS/tools/agent-toolkit: /home/user/.Cortex-OS/tools/agent-toolkit ✓
[agent-toolkit] Using: /home/user/.Cortex-OS/tools/agent-toolkit
```

## Best Practices

1. **Use the primary path** (`~/.Cortex-OS/tools/agent-toolkit`) for local development
2. **Version your tools** alongside your project for reproducibility
3. **Customize tools** for your specific workflows
4. **Use explicit override** in CI/CD for deterministic builds
5. **Mount tools read-only** in Docker for security

## Migration Guide

### From Legacy Setup

If you're upgrading from a legacy setup:

1. **Move existing tools:**
   ```bash
   mv ~/.cortex-tools ~/.Cortex-OS/tools/agent-toolkit
   ```

2. **Update environment variables:**
   ```bash
   # Old
   export CORTEX_TOOLS_DIR=~/.cortex-tools

   # New (recommended - no change needed)
   # Tools automatically resolved from ~/.Cortex-OS/tools/agent-toolkit
   ```

3. **Update MCP configuration:**
   ```json
   {
     "mcpServers": {
       "cortex-memory": {
-        "command": "cortex-mcp",
-        "args": ["--tools-dir", "~/.cortex-tools"]
+        "command": "docker",
+        "args": ["exec", "-i", "cortex-mcp", "node", "/app/dist/index.js", "--transport", "stdio"]
       }
     }
   }
   ```

## Architecture Impact

The agent-toolkit resolution system supports the following architectural goals:

- **Local-first development** - Tools live in user's home directory
- **Docker compatibility** - Seamless mount in containers
- **CI/CD flexibility** - Explicit override for reproducible builds
- **Fallback safety** - Repository tools always available
- **MCP integration** - First-class tool exposure via MCP hub

This approach ensures that agent-toolkit tools are always available regardless of the deployment environment while prioritizing local customization and developer experience.