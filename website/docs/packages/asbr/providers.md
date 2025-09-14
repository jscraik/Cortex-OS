---
title: Providers
sidebar_label: Providers
---

# Providers & Setup

ASBR integrates with external services through environment variables.

| Service | Variables |
| ------- | --------- |
| Local Memory | `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY` |
| Ollama Embedder | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| MLX Embedder | `MLX_EMBED_BASE_URL`, `MLX_MODEL` |

Set variables before starting the runtime so dependent modules can detect them.
