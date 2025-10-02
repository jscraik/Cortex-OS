# RAG Integration TDD Plan - Phase 2.1

## Research Summary

**Current State Analysis:**
- **Backend**: Express.js with TypeScript, SQLite (Drizzle ORM), comprehensive auth system
- **Document Processing**: Existing PDF, TXT, MD support with file upload middleware
- **Database**: Users, conversations, messages, models, approvals, files tables
- **API Patterns**: RESTful with /api/v1 prefix, authentication middleware, CSRF protection
- **Testing**: Vitest with comprehensive coverage, security scanning
- **Dependencies**: pdf-parse, multer, zod, drizzle-orm, better-auth

## Implementation Plan

### 1. Database Schema Extensions
**Priority: High**

```typescript
// Add to existing schema
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  totalChunks: integer('total_chunks').notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  metadata: text('metadata'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const documentChunks = sqliteTable('document_chunks', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  startPage: integer('start_page'),
  endPage: integer('end_page'),
  embedding: text('embedding'), // JSON array of vector values
  metadata: text('metadata'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});
```

### 2. Document Processing Service
**Priority: High**

```typescript
export interface DocumentProcessingService {
  parseDocument(buffer: Buffer, filename: string): Promise<ParseResult>;
  chunkDocument(text: string, options: ChunkOptions): Promise<DocumentChunk[]>;
  generateEmbeddings(chunks: DocumentChunk[]): Promise<number[][]>;
  storeDocument(document: StoredDocument): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
}
```

### 3. Vector Database Integration
**Priority: High**

**Strategy**: Use SQLite with FTS5 extension for initial implementation, with Qdrant as future upgrade path.

```typescript
export interface VectorSearchService {
  indexDocuments(chunks: DocumentChunk[]): Promise<void>;
  search(query: string, limit: number): Promise<SearchResult[]>;
  deleteDocument(documentId: string): Promise<void>;
  getDocument(documentId: string): Promise<StoredDocument | null>;
}
```

### 4. RAG API Endpoints
**Priority: Medium**

#### Document Management
- `POST /api/v1/rag/documents/upload` - Upload and index document
- `GET /api/v1/rag/documents` - List user documents
- `GET /api/v1/rag/documents/:id` - Get document details
- `DELETE /api/v1/rag/documents/:id` - Delete document

#### Search and Retrieval
- `POST /api/v1/rag/search` - Semantic search with citations
- `POST /api/v1/rag/query` - RAG query with context retrieval

### 5. File Upload and Processing Pipeline
**Priority: Medium**

```typescript
export class DocumentUploadPipeline {
  async processUpload(file: Express.Multer.File, userId: string): Promise<UploadResult> {
    // 1. Validate file
    // 2. Parse document content
    // 3. Split into chunks
    // 4. Generate embeddings
    // 5. Store in database
    // 6. Index for search
  }
}
```

### 6. Text Chunking Strategy
**Priority: Medium**

```typescript
export interface ChunkOptions {
  chunkSize: number; // Default: 1000
  chunkOverlap: number; // Default: 200
  maxChunkSize: number; // Default: 2000
  minChunkSize: number; // Default: 200
}

// Semantic chunking with sentence boundary awareness
export class DocumentChunker {
  chunkText(text: string, options: ChunkOptions): DocumentChunk[];
}
```

### 7. Embedding Generation
**Priority: Medium**

**Strategy**: Use Node.js compatible sentence-transformers or OpenAI embeddings API

```typescript
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getEmbeddingDimensions(): number;
}
```

### 8. Search with Citations
**Priority: Medium**

```typescript
export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  score: number;
  citations: Citation[];
  metadata: ChunkMetadata;
}

export interface Citation {
  documentId: string;
  filename: string;
  page?: number;
  text: string;
  score: number;
}
```

### 9. Error Handling and Validation
**Priority: Medium**

- Document type validation
- File size limits
- Processing status tracking
- BrAInwav error messaging
- Input sanitization

### 10. Security Considerations
**Priority: High**

- User isolation (documents only visible to owner)
- File upload security
- Rate limiting for expensive operations
- Input validation for search queries
- Audit logging for document operations

## Testing Strategy

### Unit Tests
- Document parsing and chunking
- Embedding generation
- Vector search functionality
- Database operations
- Error handling

### Integration Tests
- Full upload pipeline
- Search with citations
- Document management workflows
- Authentication integration

### E2E Tests
- Document upload → search → retrieval flow
- Error scenarios and edge cases
- Performance under load

## Implementation Order

1. **Phase 1**: Database schema and migrations
2. **Phase 2**: Document processing and chunking
3. **Phase 3**: Vector search implementation
4. **Phase 4**: API endpoints and controllers
5. **Phase 5**: Integration testing and optimization
6. **Phase 6**: Documentation and deployment

## Success Criteria

- Document upload and processing成功率 > 95%
- Search accuracy (relevant documents in top 5) > 80%
- Response time < 2s for 1000 documents
- Full citation tracking with page numbers
- Compliance with brAInwav security standards