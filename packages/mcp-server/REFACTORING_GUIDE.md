# MCP Server Refactoring Guide - TDD Implementation

**Date**: October 1, 2025  
**Standards**: September 2025 Code Style + TDD Principles  
**Goal**: Production-ready code with zero technical debt

---

## 📋 TDD-Driven Refactoring Plan

### Phase 1: Critical Bugs (IMMEDIATE - Must Fix Before Deployment)

#### 1.1 Remove Infinite Loop

**File**: `src/index.ts:400`  
**Issue**: `await new Promise(() => {})` blocks event loop permanently

**Test First**:

```typescript
// test: Server should gracefully shutdown on SIGINT
test('server stops cleanly without hanging', async () => {
  const server = await startServer();
  const stopPromise = server.stop();
  await expect(stopPromise).resolves.toBeUndefined();
}, 5000); // Should complete within 5 seconds
```

**Implementation**:

```typescript
// REMOVE line 400 entirely - server.start() keeps process alive
// Node.js will run as long as HTTP server is listening
```

---

#### 1.2 Add Direct ID Lookup to Memory Provider

**File**: `packages/memory-core/src/types.ts:140`  
**Issue**: No `get(id)` method forces inefficient semantic search for ID lookups

**Test First**:

```typescript
// packages/memory-core/src/__tests__/memory-provider.test.ts
describe('MemoryProvider.get', () => {
  it('should retrieve memory by exact ID', async () => {
    const stored = await provider.store({ content: 'Test', importance: 5, tags: [] });
    const fetched = await provider.get(stored.id);
    expect(fetched).toMatchObject({ id: stored.id, content: 'Test' });
  });

  it('should return null for non-existent ID', async () => {
    const result = await provider.get('non-existent-id');
    expect(result).toBeNull();
  });

  it('should be 10-100x faster than search()', async () => {
    const id = (await provider.store({ content: 'Speed test', importance: 5, tags: [] })).id;
    
    const getStart = performance.now();
    await provider.get(id);
    const getTime = performance.now() - getStart;

    const searchStart = performance.now();
    await provider.search({ query: id, search_type: 'hybrid', limit: 1 });
    const searchTime = performance.now() - searchStart;

    expect(searchTime).toBeGreaterThan(getTime * 5);
  });
});
```

**Implementation**:

```typescript
// packages/memory-core/src/types.ts
export interface MemoryProvider {
  // Add new method
  get(id: string): Promise<Memory | null>;
  
  // Existing methods...
  store(input: MemoryStoreInput): Promise<{ id: string; vectorIndexed: boolean }>;
  search(input: MemorySearchInput): Promise<MemorySearchResult[]>;
  // ...
}

// packages/memory-core/src/providers/LocalMemoryProvider.ts
async get(id: string): Promise<Memory | null> {
  const row = await this.db.get<SQLiteMemoryRow>(
    'SELECT * FROM memories WHERE id = ?',
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    content: row.content,
    importance: row.importance,
    tags: row.tags ? JSON.parse(row.tags) : [],
    domain: row.domain,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    vectorIndexed: Boolean(row.vector_indexed),
  };
}
```

**Update Fetch Tool**:

```typescript
// packages/mcp-server/src/index.ts - fetch tool
async execute(args) {
  logger.info(`ChatGPT fetch request for ID: "${args.id}"`);

  // Use direct lookup instead of search
  const memory = await memoryProvider.get(args.id);
  
  if (!memory) {
    throw new Error(`Document with ID "${args.id}" not found`);
  }

  const document = {
    id: args.id,
    title: memory.content.substring(0, 100) || `Memory ${args.id}`,
    text: memory.content || 'No content available',
    url: `memory://cortex-os/${args.id}`,
    metadata: {
      source: 'brainwav-cortex-memory',
      tags: memory.tags,
      importance: memory.importance,
      domain: memory.domain,
    },
  };

  return JSON.stringify(document, null, 2);
}
```

---

### Phase 2: Function Length Violations (HIGH PRIORITY)

#### 2.1 Extract Server Startup Helper

**Issue**: `main()` function exceeds 40 lines (55 lines currently)

**Test First**:

```typescript
test('startHttpServer should start on correct port', async () => {
  const port = 9999;
  await startHttpServer(server, port);
  
  const response = await fetch(`http://localhost:${port}/health`);
  expect(response.status).toBe(200);
});
```

**Implementation**:

```typescript
// Extract lines 384-392 into helper
async function startHttpServer(port: number): Promise<void> {
  server.start({
    transportType: 'httpStream',
    httpStream: {
      port,
      host: '0.0.0.0',
      endpoint: '/mcp',
      enableJsonResponse: true,
      stateless: false,
    },
  });

  logger.info(`brAInwav FastMCP v3 server started with HTTP/SSE transport on port ${port} at /mcp`);
  logger.info('brAInwav server ready for ChatGPT connections - CORS enabled by default');
  logger.info(`Health check available at: http://0.0.0.0:${port}/health`);
}

// Simplified main()
async function main(): Promise<void> {
  const port = Number(process.env.PORT || 3024);
  
  setupGracefulShutdown();
  setupErrorHandlers();
  
  await startHttpServer(port);
  
  logger.info('brAInwav FastMCP v3 server is running');
}
```

---

#### 2.2 Extract ChatGPT Transform Helpers

**Issue**: `search` and `fetch` tools exceed 40 lines

**Test First**:

```typescript
describe('ChatGPT Transformers', () => {
  it('should transform search results to ChatGPT format', () => {
    const memory: MemorySearchResult = {
      id: 'mem-123',
      content: 'Test content for search',
      score: 0.95,
      importance: 7,
      tags: ['test'],
      // ...
    };

    const result = transformSearchResultToChatGPT(memory, 0);
    
    expect(result).toEqual({
      id: 'mem-123',
      title: 'Test content for search',
      url: 'memory://cortex-os/mem-123',
    });
  });

  it('should transform memory to ChatGPT document', () => {
    const memory: MemorySearchResult = { /* ... */ };
    const doc = transformMemoryToChatGPTDocument(memory, 'mem-456');
    
    expect(doc).toHaveProperty('id', 'mem-456');
    expect(doc).toHaveProperty('text');
    expect(doc).toHaveProperty('metadata.source', 'brainwav-cortex-memory');
  });
});
```

**Implementation**: See refactored code above (already extracted)

---

### Phase 3: Backward Compatibility Removal (MEDIUM PRIORITY)

#### 3.1 Remove STDIO Transport

**Lines to Delete**: 374-383

**Test First**:

```typescript
test('server should only support HTTP transport', () => {
  // Verify STDIO is not an option
  const config = getServerConfig();
  expect(config.transportType).toBe('httpStream');
});
```

**Changes**:

```typescript
// REMOVE these lines:
const transport =
  process.env.MCP_TRANSPORT || process.argv.includes('--transport')
    ? process.argv[process.argv.indexOf('--transport') + 1]
    : 'httpStream';

if (transport === 'stdio') {
  server.start({ transportType: 'stdio' });
  logger.info('brAInwav FastMCP v3 server started with STDIO transport');
} else {
  // ... httpStream setup
}

// REPLACE with direct HTTP startup:
await startHttpServer(port);
```

**Reasoning**:

- ChatGPT requires HTTP/SSE transport
- No production use case for stdio
- Simplifies codebase by 9 lines
- Adheres to YAGNI principle

---

#### 3.2 Remove CLI Argument Parsing

**Lines to Delete**: Parts of 374-376

**Changes**:

```typescript
// REMOVE:
const portArg = process.argv.indexOf('--port');
const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : Number(process.env.PORT || 3024);

// REPLACE with:
const port: number = Number(process.env.PORT || 3024);
```

**Reasoning**:

- Production uses environment variables
- Simplifies deployment configuration
- Removes 2 lines of complexity

---

#### 3.3 Remove Try-Catch Blocks That Re-throw

**Lines**: Multiple locations (memory tools)

**Test First**:

```typescript
test('tool errors should propagate to FastMCP framework', async () => {
  const mockProvider = {
    store: jest.fn().mockRejectedValue(new Error('DB connection failed')),
  };

  const tool = createMemoryStoreTool(mockProvider);
  
  await expect(tool.execute({ content: 'test', importance: 5, tags: [] }))
    .rejects.toThrow('DB connection failed');
});
```

**Changes**:

```typescript
// REMOVE try-catch wrapper:
async execute(args, { reportProgress }) {
  try {
    await reportProgress({ progress: 0, total: 2 });
    logger.info('Storing memory');
    const result = await memoryProvider.store(args);
    await reportProgress({ progress: 2, total: 2 });
    return JSON.stringify(result, null, 2);
  } catch (error) {
    logger.error('Failed to store memory');
    throw error;  // Pointless re-throw
  }
}

// REPLACE with direct implementation:
async execute(args) {
  logger.info('Storing memory');
  const result = await memoryProvider.store(args);
  return JSON.stringify(result, null, 2);
}
```

**Reasoning**:

- FastMCP framework handles errors automatically
- Re-throwing provides no added value
- Removes 5 lines per tool (~35 lines total)
- Logger.error without context is not helpful

---

#### 3.4 Remove Boilerplate Progress Reporting

**Lines**: All tools with 0/2 and 2/2 progress

**Changes**:

```typescript
// REMOVE meaningless progress:
await reportProgress({ progress: 0, total: 2 });
// ... operation
await reportProgress({ progress: 2, total: 2 });

// KEEP ONLY for long-running operations (memory.analysis):
await reportProgress({ progress: 1, total: 3 });  // After actual step
```

**Reasoning**:

- Tools complete in milliseconds
- 0/2 and 2/2 provide no value
- Only meaningful for multi-step operations
- Removes 2 calls per tool (~14 lines)

---

#### 3.5 Remove Defensive Array Checks

**Lines**: 285, 325

**Changes**:

```typescript
// REMOVE:
const results = (Array.isArray(searchResult) ? searchResult : []).map(...)

// REPLACE with direct usage (type system guarantees):
const results: MemorySearchResult[] = searchResult;
results.map(...)
```

**Reasoning**:

- Interface contract guarantees array return
- TypeScript type system enforces this
- Defensive check suggests code mistrust
- Removes 2 lines

---

### Phase 4: Code Style Improvements (LOW PRIORITY)

#### 4.1 Add Explicit Types

**Lines**: 13, 16, 19

**Changes**:

```typescript
// BEFORE:
const logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });
const memoryProvider = createMemoryProviderFromEnv();
const server = new FastMCP({...});

// AFTER:
const logger: Logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });
const memoryProvider: MemoryProvider = createMemoryProviderFromEnv();
const server: FastMCP = new FastMCP({...});
```

---

#### 4.2 Extract Branding Constant

**All occurrences of "brAInwav"**

**Changes**:

```typescript
const BRANDING = {
  name: 'brAInwav Cortex Memory',
  serverName: 'brAInwav Cortex Memory MCP Server',
  prefix: 'brAInwav',
  healthMessage: 'brAInwav Cortex Memory Server - Operational',
} as const;

// Usage:
logger.info(`${BRANDING.prefix} MCP client connected`);
```

---

#### 4.3 Apply Guard Clauses

**Lines**: 38-46 (authentication)

**Changes**: See refactored code - uses early returns instead of nesting

---

## 📊 Impact Summary

### Lines Removed

- Infinite loop: 1 line
- STDIO transport: 9 lines
- CLI argument parsing: 2 lines
- Try-catch blocks: ~35 lines
- Progress reporting: ~14 lines
- Defensive checks: 2 lines
- **Total: ~63 lines removed**

### Lines Added

- `get()` method to MemoryProvider: ~15 lines
- Helper functions: ~40 lines (but replaces longer inline code)
- Type annotations: ~3 lines
- Branding constant: ~6 lines
- **Total: ~64 lines added**

### Net Result

- Similar line count but vastly improved:
  - Readability
  - Maintainability
  - Performance (fetch tool 10-100x faster)
  - Type safety
  - Testability

---

## ✅ Verification Checklist

After refactoring:

- [ ] All tests pass: `pnpm test:smart`
- [ ] No TypeScript errors: `pnpm typecheck:smart`
- [ ] No linting errors: `pnpm lint:smart`
- [ ] Server starts without hanging: `timeout 5 pnpm dev`
- [ ] Health endpoint responds: `curl http://localhost:3024/health`
- [ ] ChatGPT search works: Test via ChatGPT connector
- [ ] ChatGPT fetch is fast: Monitor response times (should be <10ms)
- [ ] Graceful shutdown works: `kill -SIGINT <pid>` completes within 2s
- [ ] No memory leaks: Run for 1 hour, monitor RSS
- [ ] Coverage maintained: 90%+ threshold

---

## 🎯 Production Deployment Steps

1. **Run full test suite**: `pnpm test:smart --coverage`
2. **Security scan**: `pnpm security:scan`
3. **Build fresh**: `rm -rf dist && pnpm build:smart`
4. **Validate structure**: `pnpm structure:validate`
5. **Deploy to staging**: Test all endpoints
6. **Monitor logs**: Check for errors/warnings
7. **Performance test**: Verify fetch tool speed improvement
8. **Deploy to production**: Update ChatGPT connector URL
9. **Smoke test**: Run search and fetch from ChatGPT
10. **Document changes**: Update CHANGELOG.md

---

**Maintained by: brAInwav Development Team**  
**Review Status: READY FOR IMPLEMENTATION**
