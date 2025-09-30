# MCP Hub Parity Test Checklist

## Overview

This checklist ensures parity between STDIO and HTTP/streamable transports for the MCP hub, verifying that both interfaces provide identical functionality and responses.

## Prerequisites

- Stack is running: `./scripts/bring-up.sh`
- Docker containers are healthy
- Agent-toolkit tools are mounted at `/Users/jamiecraik/.Cortex-OS/tools/agent-toolkit`

## Test Environment Setup

```bash
# Set test variables
export MCP_HTTP_URL="http://localhost:9600"
export MCP_STDIO_CMD="docker exec -i cortex-mcp node /app/dist/index.js --transport stdio"

# Create test data file
cat > test-memory.json << EOF
{
  "content": "Parity test memory - $(date)",
  "importance": 8,
  "tags": ["test", "parity", "$(date +%s)"],
  "domain": "testing"
}
EOF
```

## Test Cases

### 1. Health Checks ✅

**HTTP/streamable:**
```bash
curl -fsS $MCP_HTTP_URL/healthz | jq .
# Expected: {"healthy": true, "details": {...}}
```

**STDIO:**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | $MCP_STDIO_CMD
# Expected: {"jsonrpc":"2.0","id":1,"result":"pong"}
```

### 2. Tool List Verification ✅

**HTTP/streamable:**
```bash
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  jq '.result.tools[] | .name' | sort > http-tools.txt
```

**STDIO:**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  $MCP_STDIO_CMD | \
  jq '.result.tools[] | .name' | sort > stdio-tools.txt
```

**Verification:**
```bash
diff http-tools.txt stdio-tools.txt
# Expected: No output (identical)
```

### 3. Memory Operations Parity

#### 3.1 Store Memory ✅

**HTTP/streamable:**
```bash
HTTP_STORE_ID=$(curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "memory.store",
      "arguments": '"$(cat test-memory.json)"'
    }
  }' | jq -r '.result.id')
```

**STDIO:**
```bash
STDIO_STORE_ID=$(echo '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "memory.store",
      "arguments": '"$(cat test-memory.json)"'
    }
  }' | $MCP_STDIO_CMD | jq -r '.result.id')
```

**Verification:**
```bash
echo "HTTP ID: $HTTP_STORE_ID"
echo "STDIO ID: $STDIO_STORE_ID"
# Both should be valid UUIDs
```

#### 3.2 Search Memory ✅

**HTTP/streamable:**
```bash
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "memory.search",
      "arguments": {
        "query": "parity test",
        "limit": 5
      }
    }
  }' | jq '.result[] | {id: .id, content: .content}' > http-search.json
```

**STDIO:**
```bash
echo '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "memory.search",
      "arguments": {
        "query": "parity test",
        "limit": 5
      }
    }
  }' | $MCP_STDIO_CMD | jq '.result[] | {id: .id, content: .content}' > stdio-search.json
```

**Verification:**
```bash
# Sort results by ID for comparison
jq 'sort_by(.id)' http-search.json > http-sorted.json
jq 'sort_by(.id)' stdio-search.json > stdio-sorted.json
diff http-sorted.json stdio-sorted.json
# Expected: No output (identical)
```

### 4. Agent-Toolkit Tools Parity

#### 4.1 Tool Search ✅

**HTTP/streamable:**
```bash
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "agent_toolkit_search",
      "arguments": {
        "pattern": "TODO",
        "path": "/app"
      }
    }
  }' | jq '.result.matches | length' > http-toolkit-count.txt
```

**STDIO:**
```bash
echo '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "agent_toolkit_search",
      "arguments": {
        "pattern": "TODO",
        "path": "/app"
      }
    }
  }' | $MCP_STDIO_CMD | jq '.result.matches | length' > stdio-toolkit-count.txt
```

**Verification:**
```bash
echo "HTTP matches: $(cat http-toolkit-count.txt)"
echo "STDIO matches: $(cat stdio-toolkit-count.txt)"
# Both should return the same count
```

### 5. Error Handling Parity ✅

**HTTP/streamable:**
```bash
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "memory.nonexistent",
      "arguments": {}
    }
  }' | jq '.error.code' > http-error.txt
```

**STDIO:**
```bash
echo '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "memory.nonexistent",
      "arguments": {}
    }
  }' | $MCP_STDIO_CMD | jq '.error.code' > stdio-error.txt
```

**Verification:**
```bash
diff http-error.txt stdio-error.txt
# Expected: Both return the same error code (-32601)
```

### 6. A2A Event Emission ✅

Check that both transports emit A2A events:

**HTTP/streamable:**
```bash
# Check container logs for A2A events
docker logs cortex-mcp 2>&1 | grep -i "a2a\|tool.execution" | tail -5
```

**STDIO:**
```bash
# Execute a command and check for events
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"memory.stats","arguments":{}}}' | \
  $MCP_STDIO_CMD > /dev/null
docker logs cortex-mcp 2>&1 | grep -i "tool.execution.completed" | tail -1
```

## Stress Testing

### Concurrent Requests

```bash
# HTTP concurrent test
seq 10 | xargs -I{} -P 10 curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":{},"method":"tools/list"}' > http-concurrent.txt

# Check all responses are successful
grep -c '"result"' http-concurrent.txt
# Expected: 10
```

### Large Payload Test

```bash
# Create large memory payload
cat > large-memory.json << EOF
{
  "content": "$(printf 'Large test data. %.0s' {1..1000})",
  "importance": 5,
  "tags": $(printf '["tag%0d"]' {1..100} | tr '\n' ' '),
  "domain": "stress-test"
}
EOF

# Test with HTTP
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "memory.store",
      "arguments": '"$(cat large-memory.json)"'
    }
  }' | jq '.result.id' > large-http-result.txt

# Test with STDIO
echo '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "memory.store",
      "arguments": '"$(cat large-memory.json)"'
    }
  }' | $MCP_STDIO_CMD | jq '.result.id' > large-stdio-result.txt

# Both should succeed
wc -c large-http-result.txt large-stdio-result.txt
```

## Fallback Testing

### Qdrant Fallback ✅

1. Stop Qdrant:
```bash
docker stop memory-stack_qdrant_1
```

2. Test search still works (FTS only):
```bash
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "memory.search",
      "arguments": {
        "query": "test",
        "limit": 5
      }
    }
  }' | jq '.result | length'
# Expected: > 0 (FTS results)
```

3. Restart Qdrant:
```bash
docker start memory-stack_qdrant_1
```

4. Verify semantic search resumes:
```bash
sleep 10
curl -s -X POST $MCP_HTTP_URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "memory.search",
      "arguments": {
        "query": "test",
        "limit": 5
      }
    }
  }' | jq '.result | length'
# Expected: >= previous results (with vector search)
```

## Performance Benchmarks

### Response Time Comparison

```bash
# Measure HTTP response times
echo "HTTP response times:"
for i in {1..5}; do
  start=$(date +%s%N)
  curl -s -X POST $MCP_HTTP_URL/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":9,"method":"tools/list"}' > /dev/null
  end=$(date +%s%N)
  echo "  Request $i: $(((end - start) / 1000000))ms"
done

# Note: STDIO timing is harder to measure precisely due to process overhead
```

## Cleanup

```bash
# Remove test files
rm -f test-memory.json *.txt *.json
```

## Success Criteria

- [ ] All tests pass with identical results between HTTP and STDIO
- [ ] Tool lists match exactly
- [ ] Memory operations return consistent results
- [ ] Agent-toolkit tools work through both transports
- [ ] Error codes are consistent
- [ ] A2A events are emitted for all operations
- [ ] Fallback to FTS works when Qdrant is down
- [ ] Performance is acceptable (< 100ms for simple operations)

## Troubleshooting

### Common Issues

1. **Docker mount issues**
   ```bash
   # Check if agent-toolkit is mounted
   docker exec cortex-mcp ls /opt/cortex-home/tools/agent-toolkit
   # Should show your tool scripts
   ```

2. **Container not healthy**
   ```bash
   # Check container health
   docker-compose -f docker-compose.new.yml ps
   # View logs for issues
   docker-compose -f docker-compose.new.yml logs cortex-mcp
   ```

3. **Network connectivity**
   ```bash
   # Test network connectivity
   docker exec cortex-mcp curl -fSs http://local-memory:3028/healthz
   ```

4. **Permission issues**
   ```bash
   # Check file permissions
   ls -la ~/.Cortex-OS/tools/agent-toolkit/*.sh
   # Should be executable
   chmod +x ~/.Cortex-OS/tools/agent-toolkit/*.sh
   ```

## Automation Script

For automated testing, create `run-parity-tests.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "Running MCP Hub Parity Tests..."

# Run all tests and capture results
./parity-http-tests.sh > http-results.log 2>&1
./parity-stdio-tests.sh > stdio-results.log 2>&1

# Compare results
if diff http-results.log stdio-results.log > /dev/null; then
    echo "✅ All parity tests passed!"
    exit 0
else
    echo "❌ Parity tests failed!"
    diff http-results.log stdio-results.log
    exit 1
fi
```