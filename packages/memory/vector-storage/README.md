# @cortex-os/memory-vector-storage

> **Location**: `apps/cortex-os/packages/memory/vector-storage/`  
> **Migrated from**: `packages/brainstore/` (2025-08-20)

## Overview

Vector database and knowledge storage package for Cortex OS. Provides LanceDB-based persistent vector storage for semantic search, RAG (Retrieval-Augmented Generation), and memory operations.

## Structure

```
apps/cortex-os/packages/memory/vector-storage/
├── src/                          # LanceDB client/server code
├── data/                         # Vector database storage
│   ├── brain.lance/              # Main brain vector database
│   └── brain_trulens_test.lance/ # Test/evaluation database
├── tests/                        # Package tests
├── package.json                  # @cortex-os/memory-vector-storage
└── README.md                     # This file
```

## Features

- **LanceDB Integration**: Zero-copy columnar vector database
- **1536-dimensional vectors**: OpenAI embedding compatible
- **Persistent Storage**: File-based storage with versioning
- **Semantic Search**: Vector similarity search operations
- **Memory Integration**: Works with unified memory system

## Usage

```typescript
import { BrainStore } from '@cortex-os/memory-vector-storage';

const store = new BrainStore('./data/brain.lance');
await store.search(query, { limit: 10 });
```

## Integration Points

- **Memory System**: `packages/memory/` - Unified memory operations
- **RAG Pipeline**: Vector similarity search for document retrieval
- **Knowledge Graph**: Hybrid graph+vector storage with Neo4j
- **AI Brain**: Reasoning chains and semantic embeddings

## Data Location

Vector database files are stored in `apps/cortex-os/packages/memory/vector-storage/data/`:

- Production data: `brain.lance/`
- Test data: `brain_trulens_test.lance/`

This follows proper monorepo package structure where code and data are co-located.
