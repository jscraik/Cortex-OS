# @cortex-os/rag

**Shared Library** for Retrieval-Augmented Generation (RAG) functionality in the ASBR architecture.

## Overview

This package provides comprehensive RAG capabilities as a shared library that can be used by feature packages mounted by the ASBR Runtime (`apps/cortex-os/`). It includes all RAG-related functionality including chunking, embedding, storage, and pipeline operations.

## Features

### Core RAG Pipeline

- **RAGPipeline**: Main pipeline class for ingest and retrieval operations
- **Interfaces**: Type-safe interfaces for Embedder, Store, and core types
- **Chunk Management**: Text chunking with configurable size and overlap

### Chunking (`/chunk`)

- `byChars()`: Character-based text chunking with configurable size and overlap
- Support for overlapping chunks to maintain context

### Embedding (`/embed`)

- **Embedder Interface**: Abstraction for embedding providers
- **Python Client**: Integration with Python-based embedding services
- Support for batch embedding operations

### Storage (`/store`)

- **Store Interface**: Abstraction for vector storage
- **Memory Store**: In-memory storage for testing and development
- Support for vector similarity search

### Pipeline Operations (`/pipeline`)

- **Ingest**: Text ingestion with embedding and storage
- **Query**: Vector similarity search and retrieval
- **Batch Ingest**: Concurrent ingestion of multiple files with configurable limits (inspired by RAG-Anything)
- Type-safe pipeline operations

## Architecture

As a **shared library** in the ASBR architecture:

- **Location**: `packages/rag/` (shared service)
- **Purpose**: RAG functionality for feature packages
- **Usage**: Imported by feature packages via workspace references
- **Dependencies**: Can be used by any feature package that needs RAG capabilities

## Installation

This package is part of the workspace and is automatically available to other packages:

```bash
# Build the package
pnpm --filter @cortex-os/rag build

# Run tests
pnpm --filter @cortex-os/rag test
```

## Usage

### Basic RAG Pipeline

```typescript
import { RAGPipeline, type Embedder, type Store } from '@cortex-os/rag';

// Initialize with your embedder and store implementations
const pipeline = new RAGPipeline({
  embedder: myEmbedder,
  store: myStore,
  maxContextTokens: 4000,
});

// Ingest documents
await pipeline.ingest([
  { id: 'doc1', text: 'Document content...', source: 'file.txt' },
  { id: 'doc2', text: 'More content...', source: 'file2.txt' },
]);

// Retrieve relevant chunks
const results = await pipeline.retrieve('query text', 5);
console.log(results); // Array of chunks with similarity scores
```

### Text Chunking

```typescript
import { byChars } from '@cortex-os/rag/chunk';

const text = 'Your long document text...';
const chunks = byChars(text, 300, 50); // 300 chars with 50 char overlap
console.log(chunks); // Array of text chunks
```

### Individual Pipeline Operations

```typescript
import { ingestText } from '@cortex-os/rag/pipeline/ingest';
import { query } from '@cortex-os/rag/pipeline/query';

// Ingest individual text
await ingestText('source', 'text content', embedder, store);

// Query for similar content
const results = await query({ q: 'search query', topK: 5 }, embedder, store);
```

## Package Exports

The package provides multiple export paths for selective imports:

- `@cortex-os/rag` - Main exports (RAGPipeline, interfaces, types)
- `@cortex-os/rag/chunk` - Text chunking functionality
- `@cortex-os/rag/pipeline/ingest` - Ingest pipeline operations
- `@cortex-os/rag/pipeline/query` - Query pipeline operations
- `@cortex-os/rag/embed/python-client` - Python embedding client
- `@cortex-os/rag/store/memory` - In-memory storage implementation

## Integration with Feature Packages

Feature packages can use this RAG functionality:

```typescript
// In a feature package (e.g., apps/cortex-os/packages/agents/)
import { RAGPipeline } from '@cortex-os/rag';
import { byChars } from '@cortex-os/rag/chunk';

export class AgentWithRAG {
  constructor(private ragPipeline: RAGPipeline) {}

  async processDocument(text: string) {
    // Chunk the text
    const chunks = byChars(text, 500, 100);

    // Create chunk objects
    const chunkObjects = chunks.map((chunk, i) => ({
      id: `chunk-${i}`,
      text: chunk,
      source: 'agent-processing',
    }));

    // Ingest into RAG system
    await this.ragPipeline.ingest(chunkObjects);
  }

  async answerQuestion(question: string) {
    const relevantChunks = await this.ragPipeline.retrieve(question);
    // Use chunks to generate answer...
    return relevantChunks;
  }
}
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Development build with watch
pnpm dev
```

## Testing

The package includes comprehensive tests:

- **Unit Tests**: Test individual components (chunking, interfaces)
- **Integration Tests**: Test full pipeline operations
- **Deterministic Tests**: Ensure consistent behavior across runs

```bash
# Run all tests
pnpm test

# Run specific test patterns
pnpm test chunk
pnpm test pipeline
```

## Dependencies

- **TypeScript**: Type-safe implementation
- **Vitest**: Testing framework
- **tsup**: Build tooling

## Best Practices

1. **Interface Usage**: Always use the provided interfaces (Embedder, Store) for extensibility
2. **Chunking Strategy**: Choose appropriate chunk size based on your embedding model and use case
3. **Error Handling**: Implement proper error handling in pipeline operations
4. **Resource Management**: Properly manage embedding and storage resources
5. **Type Safety**: Leverage TypeScript types for safer RAG operations

## Architecture Notes

This package consolidates all RAG functionality that was previously split across multiple packages. The consolidation provides:

- **Simplified Dependencies**: Single package for all RAG needs
- **Better Cohesion**: Related functionality kept together
- **Easier Maintenance**: Single source of truth for RAG operations
- **Cleaner Imports**: Clear import paths for specific functionality

## Migration Note

This package consolidates functionality that was previously split between `@cortex-os/rag` and `@cortex-os/rag-ingest`. All functionality is now available through this single package with the same API.
