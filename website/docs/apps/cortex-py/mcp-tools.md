---
title: Mcp Tools
sidebar_label: Mcp Tools
---

# cortex-py MCP Tools

The cortex-py application now exposes a FastMCP v2 server that mirrors the existing
embedding HTTP API. Tools are backed by the shared `EmbeddingService`, ensuring
consistent validation, caching, security checks, and observability.

## Available Tools

| Tool Name | Description |
|-----------|-------------|
| `embedding.generate` | Generate an embedding vector for a single text input. |
| `embedding.batch` | Generate embeddings for multiple texts with cache-aware batching. |
| `model.info` | Retrieve metadata about the active embedding backend. |
| `health.status` | Report health metrics, cache usage, and rate limiting state. |

## Contracts

Each tool exposes an MCP contract derived from the Pydantic models in
`cortex_py.mcp.models`. Input, output, and error schemas are published via
`cortex_py.mcp.server.TOOL_CONTRACTS` for automated inspection.

### `embedding.generate`

- **Input:**
  ```json
  {
    "text": "string",
    "normalize": true
  }
  ```
- **Output:**
  ```json
  {
    "embedding": [0.0, 0.0, ...],
    "metadata": {
      "model_name": "string",
      "dimensions": 384,
      "backend": "string | null",
      "cached": false,
      "source": "generator | cache",
      "generated_at": "ISO timestamp",
      "cache_metrics": {
        "cache_hits": 0,
        "cache_misses": 1,
        "rate_limited": 0
      }
    }
  }
  ```
- **Error Codes:** `VALIDATION_ERROR`, `SECURITY_VIOLATION`, `RATE_LIMITED`, `INTERNAL_ERROR`.

### `embedding.batch`

- **Input:**
  ```json
  {
    "texts": ["text-1", "text-2"],
    "normalize": true
  }
  ```
- **Output:** mirrors the single embedding response but includes `count` and
  `cached_hits` metadata.
- **Error Codes:** same as `embedding.generate`.

### `model.info`

- **Output:**
  ```json
  {
    "model_name": "string",
    "dimensions": 384,
    "backend": "mlx",
    "model_loaded": true,
    "extras": {"sentence_transformers_available": false}
  }
  ```

### `health.status`

- **Output:**
  ```json
  {
    "status": "healthy",
    "platform": "Darwin",
    "backends_available": {
      "mlx": true,
      "sentence_transformers": false
    },
    "rate_limit": 120,
    "cache_size": 256,
    "metrics": {
      "cache_hits": 5,
      "cache_misses": 10,
      "rate_limited": 0
    }
  }
  ```

## Error Handling

All tool handlers return structured `ToolErrorResponse` payloads containing
`code`, `message`, and optional `details`. Error codes align with the HTTP API
(e.g., `TEXT_TOO_LONG`, `VALIDATION_ERROR`) so existing clients can share
handling logic.

## Usage Examples

```python
from cortex_py.mcp.server import create_mcp_server

server = create_mcp_server()
# register server with FastMCP CLI or ChatGPT MCP client
```

```python
from cortex_py.mcp.tools import CortexPyMCPTools
from cortex_py.services import EmbeddingService

service = EmbeddingService(generator=my_generator)
tools = CortexPyMCPTools(service)
result = await tools.embedding_generate(text="hello world")
```
