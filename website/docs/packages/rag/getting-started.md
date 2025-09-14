---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18+
- pnpm or npm
- Optional: Python 3.10+ for embedding service

## Installation
```bash
pnpm add @cortex-os/rag
# or
npm install @cortex-os/rag
```

## First Launch
1. Start a Python embedding server if required.
2. Create a script and import `RAGPipeline` and desired embedder.
3. Ingest documents and query the pipeline:

```typescript
import { RAGPipeline, PythonEmbedder, MemoryStore } from '@cortex-os/rag';

const embedder &#61; new PythonEmbedder({ endpoint: 'http://localhost:8000/embed' });
const store &#61; new MemoryStore();
const pipeline &#61; new RAGPipeline({ embedder, store });

await pipeline.ingest([{ id: 'doc-1', text: 'Hello world' }]);
const results &#61; await pipeline.retrieve('world');
```
