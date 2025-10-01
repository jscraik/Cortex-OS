# ChatGPT Content Structure Fix - IMMEDIATE

**Priority**: 🔴 CRITICAL - BLOCKS ALL CHATGPT FUNCTIONALITY  
**Estimated Time**: 30 minutes  
**Impact**: Without this fix, ChatGPT integration is completely non-functional

---

## Problem

Current `search` and `fetch` tools return plain JSON strings, but ChatGPT requires MCP content array structure.

**Current (BROKEN)**:

```typescript
return JSON.stringify({ results }, null, 2);  // ❌
```

**Required (CORRECT)**:

```typescript
return {
  content: [
    {
      type: "text",
      text: JSON.stringify({ results }, null, 2)
    }
  ]
};  // ✅
```

---

## Implementation

### File: `/packages/mcp-server/src/index.ts`

### Fix #1: Search Tool (Line 293)

**Find** (lines 268-296):

```typescript
// Add ChatGPT-compatible 'search' tool
server.addTool({
  name: 'search',
  description: 'Search for relevant documents and memories. Returns a list of results with id, title, and url for citation.',
  parameters: z.object({
    query: z.string().describe('Search query string'),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Search (ChatGPT Compatible)',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info(`ChatGPT search query: "${args.query}"`);

      // Use memory provider's search functionality
      const searchResult = await memoryProvider.search({
        query: args.query,
        search_type: 'hybrid',
        limit: 10,
        offset: 0,
        session_filter_mode: 'all',
        score_threshold: 0.3,
        hybrid_weight: 0.7,
      });

      // Transform results to ChatGPT format
      const results = (Array.isArray(searchResult) ? searchResult : []).map((memory, index: number) => ({
        id: memory.id || `memory-${index}`,
        title: memory.content?.substring(0, 100) || `Memory ${index + 1}`,
        url: `memory://cortex-os/${memory.id || index}`,
      }));

      await reportProgress({ progress: 2, total: 2 });

      // Return in ChatGPT-required format: single text content with JSON string
      return JSON.stringify({ results }, null, 2);
    } catch (error) {
      logger.error('Failed to execute ChatGPT search');
      throw error;
    }
  },
});
```

**Replace With**:

```typescript
// Add ChatGPT-compatible 'search' tool
server.addTool({
  name: 'search',
  description: 'Search for relevant documents and memories. Returns a list of results with id, title, and url for citation.',
  parameters: z.object({
    query: z.string().describe('Search query string'),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Search (ChatGPT Compatible)',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info(`ChatGPT search query: "${args.query}"`);

      // Use memory provider's search functionality
      const searchResult = await memoryProvider.search({
        query: args.query,
        search_type: 'hybrid',
        limit: 10,
        offset: 0,
        session_filter_mode: 'all',
        score_threshold: 0.3,
        hybrid_weight: 0.7,
      });

      // Transform results to ChatGPT format
      const results = (Array.isArray(searchResult) ? searchResult : []).map((memory, index: number) => ({
        id: memory.id || `memory-${index}`,
        title: memory.content?.substring(0, 100) || `Memory ${index + 1}`,
        url: `memory://cortex-os/${memory.id || index}`,
      }));

      await reportProgress({ progress: 2, total: 2 });

      // Return in ChatGPT MCP format: content array with text type
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to execute ChatGPT search');
      throw error;
    }
  },
});
```

---

### Fix #2: Fetch Tool (Line 337)

**Find** (lines 308-344):

```typescript
// Add ChatGPT-compatible 'fetch' tool
server.addTool({
  name: 'fetch',
  description: 'Retrieve complete document content by ID for detailed analysis and citation.',
  parameters: z.object({
    id: z.string().describe('Unique identifier for the document to fetch'),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Fetch (ChatGPT Compatible)',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info(`ChatGPT fetch request for ID: "${args.id}"`);

      // Search for the specific memory by ID
      const searchResult = await memoryProvider.search({
        query: args.id,
        search_type: 'hybrid',
        limit: 1,
        offset: 0,
        session_filter_mode: 'all',
        score_threshold: 0,
        hybrid_weight: 0.5,
      });

      const results = Array.isArray(searchResult) ? searchResult : [];
      if (results.length === 0) {
        throw new Error(`Document with ID "${args.id}" not found`);
      }

      const memory = results[0];

      // Transform to ChatGPT format
      const document = {
        id: args.id,
        title: memory.content?.substring(0, 100) || `Memory ${args.id}`,
        text: memory.content || 'No content available',
        url: `memory://cortex-os/${args.id}`,
        metadata: {
          source: 'brainwav-cortex-memory',
          tags: memory.tags || [],
          importance: memory.importance,
          domain: memory.domain,
        },
      };

      await reportProgress({ progress: 2, total: 2 });

      // Return in ChatGPT-required format: single text content with JSON string
      return JSON.stringify(document, null, 2);
    } catch (error) {
      logger.error('Failed to execute ChatGPT fetch');
      throw error;
    }
  },
});
```

**Replace With**:

```typescript
// Add ChatGPT-compatible 'fetch' tool
server.addTool({
  name: 'fetch',
  description: 'Retrieve complete document content by ID for detailed analysis and citation.',
  parameters: z.object({
    id: z.string().describe('Unique identifier for the document to fetch'),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Fetch (ChatGPT Compatible)',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info(`ChatGPT fetch request for ID: "${args.id}"`);

      // Search for the specific memory by ID
      const searchResult = await memoryProvider.search({
        query: args.id,
        search_type: 'hybrid',
        limit: 1,
        offset: 0,
        session_filter_mode: 'all',
        score_threshold: 0,
        hybrid_weight: 0.5,
      });

      const results = Array.isArray(searchResult) ? searchResult : [];
      if (results.length === 0) {
        throw new Error(`Document with ID "${args.id}" not found`);
      }

      const memory = results[0];

      // Transform to ChatGPT format
      const document = {
        id: args.id,
        title: memory.content?.substring(0, 100) || `Memory ${args.id}`,
        text: memory.content || 'No content available',
        url: `memory://cortex-os/${args.id}`,
        metadata: {
          source: 'brainwav-cortex-memory',
          tags: memory.tags || [],
          importance: memory.importance,
          domain: memory.domain,
        },
      };

      await reportProgress({ progress: 2, total: 2 });

      // Return in ChatGPT MCP format: content array with text type
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(document, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to execute ChatGPT fetch');
      throw error;
    }
  },
});
```

---

## Testing

After implementing these fixes:

### 1. Build and Restart

```bash
pnpm build:smart
pnpm dev  # Or restart your server
```

### 2. Test Search Tool

```bash
# Using MCP inspector or ChatGPT connector:
curl -X POST http://localhost:3024/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "query": "test query"
      }
    }
  }'
```

**Expected Response**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"results\": [\n    {\n      \"id\": \"mem-123\",\n      \"title\": \"Test Memory\",\n      \"url\": \"memory://cortex-os/mem-123\"\n    }\n  ]\n}"
    }
  ]
}
```

### 3. Test Fetch Tool

```bash
curl -X POST http://localhost:3024/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "fetch",
      "arguments": {
        "id": "mem-123"
      }
    }
  }'
```

**Expected Response**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"id\": \"mem-123\",\n  \"title\": \"Test Memory\",\n  \"text\": \"Full content here...\",\n  \"url\": \"memory://cortex-os/mem-123\",\n  \"metadata\": {...}\n}"
    }
  ]
}
```

### 4. Test in ChatGPT

1. Add your MCP server URL to ChatGPT Connectors
2. Enable the connector in a conversation
3. Ask: "Search for memories about AI"
4. Verify: ChatGPT receives and parses results correctly

---

## Verification Checklist

- [ ] Code changes applied to lines 293 and 337
- [ ] TypeScript compiles without errors
- [ ] Server starts successfully
- [ ] Search tool returns proper content array structure
- [ ] Fetch tool returns proper content array structure
- [ ] ChatGPT connector can call search tool
- [ ] ChatGPT connector can call fetch tool
- [ ] Deep research returns valid results

---

## Impact

**Before Fix**:

- ❌ ChatGPT: "Unable to parse tool response"
- ❌ Deep Research: Non-functional
- ❌ Connectors: Cannot process results

**After Fix**:

- ✅ ChatGPT: Properly parses tool responses
- ✅ Deep Research: Functional
- ✅ Connectors: Process results correctly

---

**Status**: 🔴 NOT IMPLEMENTED  
**Next Step**: Apply fixes and test with ChatGPT connector

---

**Maintained by: brAInwav Development Team**
