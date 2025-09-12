# Architecture

```
+--------------+        +-------------------------+
| FastAPI App  | <----> | MLXEmbeddingGenerator   |
+--------------+        +-------------------------+
          |                       |
          v                       v
   HTTP `/embed`          Qwen MLX Models
```

The FastAPI layer validates requests and delegates embedding generation to `MLXEmbeddingGenerator`, which loads Qwen models via MLX. Command line utilities reuse the same generator or the `MLXUnified` interface for chat and rerank workflows.
