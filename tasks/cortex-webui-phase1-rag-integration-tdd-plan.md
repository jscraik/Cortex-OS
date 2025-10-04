# Phase 1: RAG Integration TDD Plan

## Overview

**Goal**: Integrate the production-ready `packages/rag` package into Cortex WebUI backend and build document workspace UI with citation-enabled chat.

**Duration**: 2 weeks (10 working days)  
**Priority**: High  
**Dependencies**: `packages/rag` (complete), backend services (stubbed)

## Success Criteria

✅ **Functional Requirements**:
1. Users can upload documents (PDF, TXT, MD) via UI
2. Documents are ingested into RAG pipeline with vector storage
3. Chat queries automatically retrieve relevant chunks
4. Chat responses include citations with source links
5. Document workspace shows uploaded docs with metadata
6. Search functionality across all documents

✅ **Non-Functional Requirements**:
1. Test coverage ≥ 90%
2. RAG retrieval latency < 500ms (p95)
3. Document ingest latency < 5s for typical PDFs
4. Support up to 1000 documents per user
5. OWASP security compliance
6. Accessibility (WCAG 2.2 AA)

## Architecture Design

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ DocumentUpload │  │ DocumentList   │  │ ChatWithCites  ││
│  │ Component      │  │ Component      │  │ Component      ││
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘│
│           │                   │                    │         │
│           └───────────────────┼────────────────────┘         │
│                               │                              │
└───────────────────────────────┼──────────────────────────────┘
                                │ HTTP/WebSocket
┌───────────────────────────────┼──────────────────────────────┐
│                    Backend (Express)                         │
│  ┌────────────────────────────┼──────────────────────────┐   │
│  │         Controllers        │                          │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  │   │
│  │  │ DocumentController   │  │ RAGController        │  │   │
│  │  └─────────┬────────────┘  └─────────┬────────────┘  │   │
│  └────────────┼───────────────────────────┼──────────────┘   │
│               │                           │                  │
│  ┌────────────┼───────────────────────────┼──────────────┐   │
│  │      Application Layer (Use Cases)     │              │   │
│  │  ┌─────────▼────────┐  ┌───────────────▼──────────┐  │   │
│  │  │ IngestDocUseCase │  │ RetrieveWithCitesUseCase │  │   │
│  │  └─────────┬────────┘  └───────────────┬──────────┘  │   │
│  └────────────┼───────────────────────────┼──────────────┘   │
│               │                           │                  │
│  ┌────────────┼───────────────────────────┼──────────────┐   │
│  │         Infrastructure (Adapters)      │              │   │
│  │  ┌─────────▼────────────────────┐      │              │   │
│  │  │   RAGPipelineAdapter         │      │              │   │
│  │  │  (wraps @cortex-os/rag)      │◄─────┘              │   │
│  │  │  - PythonEmbedder            │                     │   │
│  │  │  - FAISSStore (persistent)   │                     │   │
│  │  │  - RAGPipeline               │                     │   │
│  │  └──────────────────────────────┘                     │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Extensions

```typescript
// Add to Drizzle schema
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  status: text('status').$type<'processing' | 'ready' | 'failed'>().notNull(),
  errorMessage: text('error_message'),
  chunkCount: integer('chunk_count'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
});

export const documentChunks = sqliteTable('document_chunks', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  text: text('text').notNull(),
  embedding: text('embedding').notNull(), // JSON serialized
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export const citations = sqliteTable('citations', {
  id: text('id').primaryKey(),
  messageId: text('message_id').references(() => messages.id).notNull(),
  documentId: text('document_id').references(() => documents.id).notNull(),
  chunkId: text('chunk_id').references(() => documentChunks.id).notNull(),
  score: real('score').notNull(),
  position: integer('position').notNull(), // Position in message
});
```

### API Contracts (Zod Schemas)

```typescript
// libs/typescript/contracts/src/webui/rag.ts
import { z } from 'zod';

export const DocumentUploadInput = z.object({
  file: z.instanceof(File),
  metadata: z.record(z.unknown()).optional(),
});

export const DocumentUploadOutput = z.object({
  id: z.string(),
  filename: z.string(),
  status: z.enum(['processing', 'ready', 'failed']),
  uploadedAt: z.string().datetime(),
});

export const DocumentListQuery = z.object({
  userId: z.string(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: z.enum(['processing', 'ready', 'failed']).optional(),
});

export const DocumentListOutput = z.object({
  documents: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    fileSize: z.number(),
    status: z.enum(['processing', 'ready', 'failed']),
    chunkCount: z.number().nullable(),
    uploadedAt: z.string().datetime(),
  })),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const ChatWithRAGInput = z.object({
  conversationId: z.string(),
  message: z.string(),
  useRAG: z.boolean().default(true),
  topK: z.number().int().positive().default(5),
});

export const Citation = z.object({
  documentId: z.string(),
  documentName: z.string(),
  chunkText: z.string(),
  score: z.number(),
  pageNumber: z.number().optional(),
});

export const ChatWithRAGOutput = z.object({
  messageId: z.string(),
  content: z.string(),
  citations: z.array(Citation),
  timestamp: z.string().datetime(),
});

export const DocumentSearchInput = z.object({
  query: z.string(),
  userId: z.string(),
  topK: z.number().int().positive().default(10),
  filters: z.record(z.unknown()).optional(),
});

export const DocumentSearchOutput = z.object({
  results: z.array(z.object({
    documentId: z.string(),
    documentName: z.string(),
    chunkText: z.string(),
    score: z.number(),
    metadata: z.record(z.unknown()),
  })),
});
```

## Test-Driven Development Plan

### Day 1-2: Infrastructure Setup

#### Test 1: RAG Pipeline Initialization
**File**: `apps/cortex-webui/backend/src/__tests__/infra/RAGPipelineAdapter.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RAGPipelineAdapter } from '../../infra/rag/RAGPipelineAdapter';

describe('RAGPipelineAdapter', () => {
  let adapter: RAGPipelineAdapter;
  
  beforeAll(async () => {
    adapter = new RAGPipelineAdapter({
      embeddingServiceUrl: 'http://localhost:8000',
      vectorStorePath: './test-data/vectors',
    });
    await adapter.initialize();
  });
  
  afterAll(async () => {
    await adapter.cleanup();
  });
  
  it('should initialize RAG pipeline with embedder and store', () => {
    expect(adapter.getPipeline()).toBeDefined();
    expect(adapter.getEmbedder()).toBeDefined();
    expect(adapter.getStore()).toBeDefined();
  });
  
  it('should use PythonEmbedder with correct endpoint', () => {
    const embedder = adapter.getEmbedder();
    expect(embedder.constructor.name).toBe('PythonEmbedder');
  });
  
  it('should use FAISSStore with persistent storage', () => {
    const store = adapter.getStore();
    expect(store.constructor.name).toBe('FAISSStore');
  });
});
```

**Implementation Path**:
1. Create `apps/cortex-webui/backend/src/infra/rag/RAGPipelineAdapter.ts`
2. Import `RAGPipeline`, `PythonEmbedder`, `FAISSStore` from `@cortex-os/rag`
3. Implement initialization with config
4. Add cleanup method for tests

#### Test 2: Document Ingestion
**File**: `apps/cortex-webui/backend/src/__tests__/app/IngestDocumentUseCase.test.ts`

```typescript
describe('IngestDocumentUseCase', () => {
  it('should ingest document and store chunks in DB', async () => {
    const useCase = new IngestDocumentUseCase(ragAdapter, documentRepo);
    
    const result = await useCase.execute({
      userId: 'user-1',
      filename: 'test.txt',
      content: 'This is a test document with some content to chunk.',
      mimeType: 'text/plain',
    });
    
    expect(result.documentId).toBeDefined();
    expect(result.chunkCount).toBeGreaterThan(0);
    expect(result.status).toBe('ready');
    
    // Verify DB storage
    const doc = await documentRepo.findById(result.documentId);
    expect(doc).toBeDefined();
    expect(doc.chunkCount).toBe(result.chunkCount);
  });
  
  it('should handle PDF extraction', async () => {
    const pdfBuffer = fs.readFileSync('./test-fixtures/sample.pdf');
    const result = await useCase.execute({
      userId: 'user-1',
      filename: 'sample.pdf',
      content: pdfBuffer,
      mimeType: 'application/pdf',
    });
    
    expect(result.status).toBe('ready');
    expect(result.chunkCount).toBeGreaterThan(0);
  });
  
  it('should set status to failed on error', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      filename: 'bad.txt',
      content: '', // Empty content should fail
      mimeType: 'text/plain',
    });
    
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBeDefined();
  });
});
```

**Implementation Path**:
1. Create `IngestDocumentUseCase` class
2. Use `RAGPipelineAdapter.ingest()` for chunking/embedding
3. Store document metadata in `documents` table
4. Store chunks in `documentChunks` table
5. Handle errors gracefully

### Day 3-4: Retrieval & Citations

#### Test 3: Retrieval with Citations
**File**: `apps/cortex-webui/backend/src/__tests__/app/RetrieveWithCitationsUseCase.test.ts`

```typescript
describe('RetrieveWithCitationsUseCase', () => {
  beforeEach(async () => {
    // Seed test documents
    await seedTestDocuments();
  });
  
  it('should retrieve relevant chunks for query', async () => {
    const useCase = new RetrieveWithCitationsUseCase(ragAdapter, documentRepo);
    
    const result = await useCase.execute({
      userId: 'user-1',
      query: 'What is RAG?',
      topK: 5,
    });
    
    expect(result.chunks).toHaveLength(5);
    expect(result.chunks[0].score).toBeGreaterThan(0.5);
    expect(result.chunks[0].documentId).toBeDefined();
    expect(result.chunks[0].text).toBeDefined();
  });
  
  it('should filter by user documents only', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      query: 'test',
      topK: 10,
    });
    
    // Verify all chunks belong to user-1's documents
    for (const chunk of result.chunks) {
      const doc = await documentRepo.findById(chunk.documentId);
      expect(doc.userId).toBe('user-1');
    }
  });
  
  it('should return empty array if no documents found', async () => {
    const result = await useCase.execute({
      userId: 'user-no-docs',
      query: 'test',
      topK: 5,
    });
    
    expect(result.chunks).toHaveLength(0);
  });
});
```

**Implementation Path**:
1. Create `RetrieveWithCitationsUseCase`
2. Call `RAGPipelineAdapter.retrieve()` with query
3. Filter results by user ownership
4. Map chunks to citation format
5. Return structured citations

#### Test 4: Chat with RAG Integration
**File**: `apps/cortex-webui/backend/src/__tests__/app/SendChatMessageWithRAGUseCase.test.ts`

```typescript
describe('SendChatMessageWithRAGUseCase', () => {
  it('should augment chat with retrieved context', async () => {
    const useCase = new SendChatMessageWithRAGUseCase(
      ragAdapter,
      chatService,
      citationRepo,
    );
    
    const result = await useCase.execute({
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'What is the capital of France?',
      useRAG: true,
    });
    
    expect(result.messageId).toBeDefined();
    expect(result.content).toContain('Paris'); // Assuming doc contains this
    expect(result.citations).toHaveLength(expect.any(Number));
  });
  
  it('should save citations to database', async () => {
    const result = await useCase.execute({
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'test query',
      useRAG: true,
    });
    
    const citations = await citationRepo.findByMessageId(result.messageId);
    expect(citations.length).toBe(result.citations.length);
  });
  
  it('should work without RAG if useRAG is false', async () => {
    const result = await useCase.execute({
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'test',
      useRAG: false,
    });
    
    expect(result.citations).toHaveLength(0);
  });
});
```

**Implementation Path**:
1. Retrieve relevant chunks if `useRAG` is true
2. Build augmented prompt with context
3. Send to AI model
4. Extract and save citations
5. Return message with citations

### Day 5-6: REST API Controllers

#### Test 5: Document Upload Endpoint
**File**: `apps/cortex-webui/backend/src/__tests__/controllers/documentController.test.ts`

```typescript
describe('POST /api/documents/upload', () => {
  it('should accept file upload and return document metadata', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', './test-fixtures/test.txt')
      .field('metadata', JSON.stringify({ source: 'test' }));
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.filename).toBe('test.txt');
    expect(res.body.status).toBe('processing');
  });
  
  it('should reject unauthorized requests', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', './test-fixtures/test.txt');
    
    expect(res.status).toBe(401);
  });
  
  it('should validate file type', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', './test-fixtures/malware.exe');
    
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported file type/i);
  });
  
  it('should enforce file size limit', async () => {
    // Create large file > 50MB
    const largeFile = Buffer.alloc(51 * 1024 * 1024);
    
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', largeFile, 'large.txt');
    
    expect(res.status).toBe(413);
  });
});
```

**Implementation Path**:
1. Add multer middleware for file upload
2. Validate file type and size
3. Call `IngestDocumentUseCase`
4. Return document metadata
5. Process ingestion asynchronously

#### Test 6: Document List Endpoint
**File**: Same file as Test 5

```typescript
describe('GET /api/documents', () => {
  it('should return paginated document list', async () => {
    const res = await request(app)
      .get('/api/documents?page=1&limit=10')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.documents).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(0);
    expect(res.body.page).toBe(1);
  });
  
  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/documents?status=ready')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.body.documents.every((d: any) => d.status === 'ready')).toBe(true);
  });
});
```

#### Test 7: Document Search Endpoint
**File**: Same file as Test 5

```typescript
describe('POST /api/documents/search', () => {
  it('should return search results', async () => {
    const res = await request(app)
      .post('/api/documents/search')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: 'test query', topK: 5 });
    
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(expect.any(Number));
    expect(res.body.results[0].score).toBeDefined();
  });
});
```

### Day 7-8: Frontend Components

#### Test 8: DocumentUpload Component
**File**: `apps/cortex-webui/frontend/src/components/__tests__/DocumentUpload.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentUpload } from '../Documents/DocumentUpload';

describe('DocumentUpload Component', () => {
  it('should render file input', () => {
    render(<DocumentUpload onUploadComplete={vi.fn()} />);
    expect(screen.getByLabelText(/upload document/i)).toBeInTheDocument();
  });
  
  it('should upload file on selection', async () => {
    const onComplete = vi.fn();
    render(<DocumentUpload onUploadComplete={onComplete} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload document/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'test.txt',
        status: 'processing',
      }));
    });
  });
  
  it('should show progress indicator during upload', async () => {
    render(<DocumentUpload onUploadComplete={vi.fn()} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload document/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('should show error on upload failure', async () => {
    // Mock API error
    vi.mocked(uploadDocument).mockRejectedValue(new Error('Upload failed'));
    
    render(<DocumentUpload onUploadComplete={vi.fn()} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload document/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });
});
```

**Implementation Path**:
1. Create `DocumentUpload.tsx` component
2. Use file input with drag-and-drop
3. Call upload API with FormData
4. Show progress bar
5. Handle errors with toast/alert

#### Test 9: DocumentList Component
**File**: `apps/cortex-webui/frontend/src/components/__tests__/DocumentList.test.tsx`

```typescript
describe('DocumentList Component', () => {
  it('should render list of documents', async () => {
    const documents = [
      { id: '1', filename: 'doc1.txt', status: 'ready', uploadedAt: new Date() },
      { id: '2', filename: 'doc2.pdf', status: 'processing', uploadedAt: new Date() },
    ];
    
    render(<DocumentList documents={documents} />);
    
    expect(screen.getByText('doc1.txt')).toBeInTheDocument();
    expect(screen.getByText('doc2.pdf')).toBeInTheDocument();
  });
  
  it('should show status badges', () => {
    const documents = [
      { id: '1', filename: 'doc.txt', status: 'ready', uploadedAt: new Date() },
    ];
    
    render(<DocumentList documents={documents} />);
    
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });
  
  it('should allow document deletion', async () => {
    const onDelete = vi.fn();
    const documents = [
      { id: '1', filename: 'doc.txt', status: 'ready', uploadedAt: new Date() },
    ];
    
    render(<DocumentList documents={documents} onDelete={onDelete} />);
    
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('1');
    });
  });
});
```

#### Test 10: ChatWithCitations Component
**File**: `apps/cortex-webui/frontend/src/components/__tests__/ChatWithCitations.test.tsx`

```typescript
describe('ChatWithCitations Component', () => {
  it('should render message with citations', () => {
    const message = {
      content: 'The capital of France is Paris.',
      citations: [
        { documentName: 'geography.pdf', chunkText: 'Paris is the capital...' },
      ],
    };
    
    render(<ChatMessage message={message} />);
    
    expect(screen.getByText(/paris/i)).toBeInTheDocument();
    expect(screen.getByText(/geography.pdf/i)).toBeInTheDocument();
  });
  
  it('should expand citations on click', () => {
    const message = {
      content: 'Test content',
      citations: [
        { documentName: 'doc.pdf', chunkText: 'Full citation text here...' },
      ],
    };
    
    render(<ChatMessage message={message} />);
    
    const citationButton = screen.getByText(/1 citation/i);
    fireEvent.click(citationButton);
    
    expect(screen.getByText(/full citation text/i)).toBeInTheDocument();
  });
  
  it('should link to source document', () => {
    const message = {
      content: 'Test',
      citations: [
        { documentId: 'doc-1', documentName: 'source.pdf', chunkText: 'text' },
      ],
    };
    
    render(<ChatMessage message={message} />);
    
    const link = screen.getByRole('link', { name: /source.pdf/i });
    expect(link).toHaveAttribute('href', '/documents/doc-1');
  });
});
```

### Day 9: Integration Testing

#### Test 11: End-to-End RAG Flow
**File**: `apps/cortex-webui/__tests__/e2e/rag-integration.e2e.test.ts`

```typescript
describe('RAG E2E Flow', () => {
  it('should complete full RAG workflow', async () => {
    // 1. Upload document
    const uploadRes = await uploadDocument(userToken, testFile);
    expect(uploadRes.status).toBe('processing');
    
    // 2. Wait for processing
    await waitForDocumentReady(uploadRes.id);
    
    // 3. Send chat message with RAG
    const chatRes = await sendChatMessage({
      conversationId: 'conv-1',
      message: 'What does the document say about RAG?',
      useRAG: true,
    });
    
    expect(chatRes.citations).toHaveLength(expect.any(Number));
    expect(chatRes.content).toBeDefined();
    
    // 4. Verify citations saved
    const message = await getMessage(chatRes.messageId);
    expect(message.citations).toEqual(chatRes.citations);
  });
  
  it('should handle concurrent document uploads', async () => {
    const uploads = await Promise.all([
      uploadDocument(userToken, file1),
      uploadDocument(userToken, file2),
      uploadDocument(userToken, file3),
    ]);
    
    expect(uploads).toHaveLength(3);
    
    // Wait for all to process
    await Promise.all(uploads.map(u => waitForDocumentReady(u.id)));
    
    // Query should retrieve from all docs
    const chatRes = await sendChatMessage({
      message: 'test query',
      useRAG: true,
    });
    
    const docIds = chatRes.citations.map(c => c.documentId);
    expect(new Set(docIds).size).toBeGreaterThan(1);
  });
});
```

### Day 10: Performance & Security

#### Test 12: Performance Benchmarks
**File**: `apps/cortex-webui/__tests__/performance/rag-performance.test.ts`

```typescript
describe('RAG Performance', () => {
  it('should ingest document in < 5s', async () => {
    const start = Date.now();
    
    await ingestDocument({
      filename: 'test.txt',
      content: 'x'.repeat(10000), // 10KB document
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
  
  it('should retrieve results in < 500ms (p95)', async () => {
    const latencies: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await retrieveWithCitations({ query: 'test', topK: 5 });
      latencies.push(Date.now() - start);
    }
    
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    
    expect(p95).toBeLessThan(500);
  });
});
```

#### Test 13: Security Validation
**File**: `apps/cortex-webui/__tests__/security/rag-security.test.ts`

```typescript
describe('RAG Security', () => {
  it('should prevent path traversal in filenames', async () => {
    const res = await uploadDocument(userToken, {
      filename: '../../etc/passwd',
      content: 'malicious',
    });
    
    expect(res.status).toBe(400);
  });
  
  it('should sanitize metadata inputs', async () => {
    const res = await uploadDocument(userToken, {
      filename: 'test.txt',
      content: 'test',
      metadata: { xss: '<script>alert("xss")</script>' },
    });
    
    const doc = await getDocument(res.id);
    expect(doc.metadata.xss).not.toContain('<script>');
  });
  
  it('should prevent user from accessing other users documents', async () => {
    const res = await getDocument('other-user-doc-id', userToken);
    expect(res.status).toBe(403);
  });
  
  it('should validate Zod schemas on all inputs', async () => {
    const res = await sendChatMessage({
      message: 123, // Invalid type
      useRAG: 'yes', // Invalid type
    });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });
});
```

## Implementation Checklist

### Backend Tasks
- [ ] Create `infra/rag/RAGPipelineAdapter.ts`
- [ ] Add Drizzle migrations for documents, chunks, citations
- [ ] Create `app/IngestDocumentUseCase.ts`
- [ ] Create `app/RetrieveWithCitationsUseCase.ts`
- [ ] Create `app/SendChatMessageWithRAGUseCase.ts`
- [ ] Create `controllers/documentController.ts`
- [ ] Add multer middleware for file uploads
- [ ] Update `controllers/ragController.ts`
- [ ] Add WebSocket events for document processing status
- [ ] Add Zod contracts to `libs/typescript/contracts`

### Frontend Tasks
- [ ] Create `components/Documents/DocumentUpload.tsx`
- [ ] Create `components/Documents/DocumentList.tsx`
- [ ] Create `components/Documents/DocumentWorkspace.tsx`
- [ ] Update `components/Chat/Message.tsx` to show citations
- [ ] Create `components/Chat/CitationCard.tsx`
- [ ] Add `hooks/useDocuments.ts`
- [ ] Add `services/documentApi.ts`
- [ ] Add document workspace route
- [ ] Style with Tailwind (accessible)

### Testing Tasks
- [ ] Write all 13 test suites (listed above)
- [ ] Achieve 90%+ coverage
- [ ] Run performance benchmarks
- [ ] Run security scans
- [ ] Manual accessibility testing

### Documentation Tasks
- [ ] Update `apps/cortex-webui/README.md`
- [ ] Add RAG integration guide
- [ ] Document API endpoints
- [ ] Update CHANGELOG.md
- [ ] Add screenshots to docs

## Quality Gates

Before merging to main:
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All tests passing
- [ ] `pnpm test:coverage` - ≥ 90% coverage
- [ ] `pnpm security:scan` - No high/critical issues
- [ ] `pnpm structure:validate` - No violations
- [ ] Manual E2E testing in browser
- [ ] Accessibility audit (Lighthouse/axe)

## Risk Mitigation

### Risk 1: Python Embedding Service Unavailable
**Mitigation**: 
- Add fallback to local embedder
- Health check on startup
- Graceful error handling

### Risk 2: FAISS Index Corruption
**Mitigation**:
- Regular backups
- Index rebuild functionality
- Validation on load

### Risk 3: Large Document Performance
**Mitigation**:
- Chunk size optimization
- Batch processing
- Background workers for ingestion

## Success Metrics

- [ ] Documents uploaded: >0 (smoke test)
- [ ] Retrieval latency: p95 < 500ms
- [ ] Ingest latency: p95 < 5s
- [ ] Test coverage: ≥ 90%
- [ ] Zero high/critical security issues
- [ ] Accessibility score: ≥ 90 (Lighthouse)

---

**Next Step**: Begin implementation with Test 1 (RAG Pipeline Initialization)

**brAInwav Agent**: Ready to proceed with TDD implementation. Shall I start coding?
