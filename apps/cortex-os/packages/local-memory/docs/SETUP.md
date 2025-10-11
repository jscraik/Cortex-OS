# Local Memory REST API Setup Guide - brAInwav Cortex-OS

**Last Updated**: 2025-10-11  
**Status**: Production Ready (Optional Service)
**Port**: 3028 (REST API)

## ⚠️ Important Notice

This guide is for setting up the **optional REST API server** (port 3028).

**Most users do NOT need this.** Memory access is already available through the **MCP Server** (port 3024), which provides:
- Full memory functionality via MCP protocol
- Integration with Claude Desktop, ChatGPT, VS Code
- Already running and operational

**Only use this REST API if:**
- You need direct HTTP REST access outside MCP protocol
- You're building custom applications that don't support MCP
- You have specific requirements for HTTP REST endpoints

## Quick Setup (5 Minutes)

### Prerequisites

1. **Node.js** v18+ with pnpm
2. **Ollama** for embeddings
3. **Qdrant** (optional, for enhanced performance)

### One-Command Setup

```bash
cd apps/cortex-os/packages/local-memory
pnpm start:service
```

This will:
- ✓ Check prerequisites (Ollama, models)
- ✓ Start Qdrant if installed
- ✓ Build TypeScript code
- ✓ Start REST API on port 3028
- ✓ Run health checks

### Verification

```bash
# Test the service
pnpm test:api

# Or manually
curl http://127.0.0.1:3028/healthz
```

Expected response:
```json
{"success":true,"data":{"healthy":true,"timestamp":"2025-10-11T..."}}
```

---

## Detailed Setup

### Step 1: Install Ollama

```bash
# macOS
brew install ollama

# Or download from https://ollama.ai/download
```

Install required models:
```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
```

Verify:
```bash
ollama list
```

### Step 2: Install Qdrant (Optional)

Qdrant provides better performance for vector search:

```bash
# Create directory
mkdir -p ~/.local-memory

# Download appropriate binary
# For Apple Silicon (M1/M2/M3)
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-aarch64-apple-darwin.tar.gz -o ~/.local-memory/qdrant.tar.gz

# For Intel Mac
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-apple-darwin.tar.gz -o ~/.local-memory/qdrant.tar.gz

# Extract and setup
cd ~/.local-memory
tar -xzf qdrant.tar.gz
chmod +x qdrant
rm qdrant.tar.gz

# Test
./qdrant --version
```

Start Qdrant:
```bash
cd ~/.local-memory && ./qdrant &
```

Verify:
```bash
curl http://localhost:6333/healthz
```

### Step 3: Build Local Memory

```bash
cd apps/cortex-os/packages/local-memory

# Install dependencies
pnpm install

# Build TypeScript
pnpm build
```

### Step 4: Configure Environment

The service uses `port.env` for configuration:

```bash
# Location: apps/cortex-os/packages/local-memory/port.env
MEMORY_API_PORT=3028
LOCAL_MEMORY_HOST=127.0.0.1
LOCAL_MEMORY_BASE_URL=http://127.0.0.1:3028
LOCAL_MEMORY_MODE=dual
MEMORY_LOG_LEVEL=info
```

### Step 5: Start the Service

#### Option A: Using Scripts (Recommended)

```bash
pnpm start:service
```

#### Option B: Manual Start

```bash
# Export environment variables
export MEMORY_API_PORT=3028
export LOCAL_MEMORY_HOST=0.0.0.0

# Start server
node ./dist/server.js
```

#### Option C: With PM2 (Production)

```bash
pm2 start ./dist/server.js --name local-memory \
  --env MEMORY_API_PORT=3028 \
  --env LOCAL_MEMORY_HOST=0.0.0.0
```

### Step 6: Test the Installation

```bash
# Run comprehensive tests
pnpm test:api

# Or test manually
curl http://127.0.0.1:3028/healthz

# Store a test memory
curl -X POST http://127.0.0.1:3028/memory/store \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Test memory from setup",
    "importance": 5,
    "tags": ["test", "setup"],
    "domain": "testing"
  }'
```

---

## REST API Endpoints

### Base URL
```
http://127.0.0.1:3028
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check with status |
| `/readyz` | GET | Readiness probe |
| `/memory/store` | POST | Store new memory |
| `/memory/search` | POST | Search memories |
| `/memory/analysis` | POST | Analyze memory patterns |
| `/memory/relationships` | POST | Manage relationships |
| `/memory/stats` | POST | Get statistics |
| `/maintenance/optimize` | POST | Optimize storage |
| `/maintenance/cleanup` | POST | Cleanup old data |

### Example: Store Memory

```bash
curl -X POST http://127.0.0.1:3028/memory/store \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "OpenAI Agents + Instructor plan (brAInwav)",
    "importance": 9,
    "tags": ["openai-agents", "instructor", "brainwav"],
    "domain": "github-integration",
    "metadata": {
      "branding": "brAInwav"
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "OpenAI Agents + Instructor plan (brAInwav)",
    "importance": 9,
    "tags": ["openai-agents", "instructor", "brainwav"],
    "timestamp": "2025-10-11T20:00:00Z"
  }
}
```

### Example: Search Memories

```bash
curl -X POST http://127.0.0.1:3028/memory/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "OpenAI agents",
    "search_type": "semantic",
    "use_ai": true,
    "limit": 5
  }'
```

---

## Troubleshooting

### Issue: REST API Not Reachable

**Error**: `REST is unreachable (http://127.0.0.1:3028)`

**Solutions**:

1. **Check if service is running**:
   ```bash
   ps aux | grep "node.*server.js"
   lsof -i :3028
   ```

2. **Start the service**:
   ```bash
   pnpm start:service
   ```

3. **Check logs**:
   ```bash
   tail -f logs/local-memory.log
   ```

4. **Verify port is available**:
   ```bash
   # If port is in use
   lsof -ti:3028 | xargs kill -9
   ```

5. **Rebuild if needed**:
   ```bash
   rm -rf dist
   pnpm build
   pnpm start
   ```

### Issue: Build Fails

**Error**: `memory-rest-api fails to build`

**Solutions**:

1. **Clean and rebuild**:
   ```bash
   rm -rf node_modules dist
   pnpm install
   pnpm build
   ```

2. **Check dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Verify TypeScript config**:
   ```bash
   pnpm typecheck
   ```

### Issue: Qdrant Not Running

**Error**: Qdrant connection failed

**Solutions**:

1. **Start Qdrant**:
   ```bash
   cd ~/.local-memory && ./qdrant &
   ```

2. **Verify Qdrant**:
   ```bash
   curl http://localhost:6333/healthz
   ```

3. **Check Qdrant logs**:
   ```bash
   tail -f ~/.local-memory/qdrant.log
   ```

### Issue: Models Not Found

**Error**: Ollama models not available

**Solutions**:

1. **Install models**:
   ```bash
   ollama pull nomic-embed-text
   ollama pull qwen2.5:3b
   ```

2. **Verify models**:
   ```bash
   ollama list
   ```

3. **Check Ollama is running**:
   ```bash
   ollama serve
   ```

---

## Service Management

### Start Service
```bash
pnpm start:service
```

### Stop Service
```bash
pnpm stop:service
```

### Restart Service
```bash
pnpm restart:service
```

### Check Status
```bash
# View logs
tail -f logs/local-memory.log

# Check process
ps aux | grep "node.*server.js"

# Check port
lsof -i :3028

# Test health
curl http://127.0.0.1:3028/healthz
```

---

## Integration

### With MCP (Claude Desktop)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "local-memory": {
      "command": "local-memory",
      "args": ["--mcp"],
      "env": {
        "MEMORY_API_PORT": "3028",
        "LOCAL_MEMORY_BASE_URL": "http://127.0.0.1:3028"
      }
    }
  }
}
```

### With TypeScript

```typescript
// Example client
const baseUrl = 'http://127.0.0.1:3028';

async function storeMemory(content: string, importance: number) {
  const response = await fetch(`${baseUrl}/memory/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      importance,
      tags: ['typescript', 'integration'],
      domain: 'application'
    })
  });
  
  return response.json();
}
```

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_API_PORT` | `3028` | REST API port |
| `LOCAL_MEMORY_HOST` | `127.0.0.1` | Bind address |
| `LOCAL_MEMORY_BASE_URL` | `http://127.0.0.1:3028` | Base URL |
| `LOCAL_MEMORY_MODE` | `dual` | Mode: mcp, rest, dual |
| `MEMORY_LOG_LEVEL` | `info` | Log level |
| `NO_AUTH` | `false` | Disable auth (dev only) |

### Port Configuration

Ports are defined in `config/ports.env`:
- `MEMORY_API_PORT=3028` - REST API
- `LOCAL_MEMORY_MCP_PORT=3026` - MCP protocol

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Build | `pnpm build` | Compile TypeScript |
| Start (manual) | `pnpm start` | Start server directly |
| Start (service) | `pnpm start:service` | Start with checks |
| Stop | `pnpm stop:service` | Stop service |
| Restart | `pnpm restart:service` | Restart service |
| Test API | `pnpm test:api` | Run API tests |
| Dev Watch | `pnpm dev` | Watch mode |

---

## Support

- **Documentation**: See `apps/cortex-os/packages/local-memory/README.md`
- **Issues**: Check logs at `logs/local-memory.log`
- **Health Check**: `curl http://127.0.0.1:3028/healthz`

---

**brAInwav Development Team**  
**Cortex-OS Local Memory**
