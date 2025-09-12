# Configuration

Configuration is supplied via a JSON file or constructor options.

## Config File
Create `rag.config.json` in your project root:
```json
{
  "embedder": {
    "type": "python",
    "endpoint": "http://localhost:8000/embed",
    "batchSize": 32
  },
  "store": { "type": "memory" },
  "chunkSize": 500,
  "chunkOverlap": 100,
  "freshnessEpsilon": 0.02
}
```
Load this file and pass it to `RAGPipeline`.

## Environment Variables
| Variable | Description |
|---|---|
| `RAG_EMBED_ENDPOINT` | Override embedder HTTP endpoint |
| `RAG_MAX_CONTEXT` | Maximum tokens per query context |
| `RAG_LOG_LEVEL` | Verbose logging when set to `debug` |

Constructor options take precedence over config file and env variables.
