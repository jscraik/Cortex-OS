---
title: Architecture
sidebar_label: Architecture
---

# Architecture

Cortex RAG follows a modular pipeline architecture:

```
[Documents] -&gt; [Chunker] -&gt; [Embedder] -&gt; [Store] -&gt; [Retriever] -&gt; [Reranker]
```

## Components
- **RAGPipeline** orchestrates ingest and retrieval.
- **Chunker** splits text with configurable size and overlap.
- **Embedders** produce vector representations (Python client, composite chains).
- **Stores** persist vectors in memory or external backends.
- **Retriever** executes similarity search against the store.
- **Reranker** (Qwen3) orders results by semantic relevance.

Each component can be replaced via interfaces, enabling custom strategies and providers.
