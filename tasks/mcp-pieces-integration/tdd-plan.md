# MCP Pieces Integration - TDD Plan

## Overview

This TDD plan follows Test-Driven Development principles for implementing Pieces OS integration with the Cortex MCP hub.

## BDD Acceptance Scenarios

### Feature: Pieces Drive Proxy

```gherkin
Scenario: Drive proxy connects successfully
  Given Pieces Drive is running on port 39301
  When the MCP hub initializes
  Then the Drive proxy should connect via SSE
  And "Successfully connected to Pieces Drive" should be logged
  And drive tools should be registered with "pieces_drive." prefix

Scenario: Drive proxy handles service unavailable
  Given Pieces Drive is NOT running
  When the MCP hub initializes
  Then the Drive proxy should log a warning
  And the MCP hub should continue with local tools only
  And no drive tools should be registered

Scenario: Drive proxy reconnects after disconnection
  Given the Drive proxy is connected
  When the SSE connection drops
  Then the proxy should wait 5 seconds
  And attempt to reconnect
  And log the reconnection attempt

Scenario: Drive tool execution
  Given the Drive proxy is connected
  When a client calls "pieces_drive.list_files"
  Then the proxy should forward the request to Pieces Drive
  And return the Drive response as MCP tool result
  And emit an A2A event for the tool execution
```

### Feature: Pieces Copilot Proxy

```gherkin
Scenario: Copilot proxy with context assembly
  Given the Copilot proxy is connected
  When a client calls "pieces_copilot.ask" with query "explain this code"
  Then the system should first run memory.hybrid_search for relevant context
  And include Drive files in the context
  And include LTM memories in the context
  And send the assembled context to Copilot
  And return Copilot's response to the client

Scenario: Copilot interaction persistence
  Given a Copilot query completes successfully
  When the response is returned
  Then the interaction should be stored in local memory
  And tagged with domain "copilot"
  And include the query, context, and response
```

### Feature: Enhanced Hybrid Search

```gherkin
Scenario: Hybrid search with all sources
  Given local memory, LTM, Drive, and Copilot are available
  When a client calls memory.hybrid_search with query "meeting notes"
  And include_pieces=true
  And include_drive=true
  And include_copilot=true
  Then results from all 4 sources should be queried in parallel
  And results should be deduplicated
  And results should be reranked by relevance
  And each result should have source attribution
  And the response should complete within 500ms

Scenario: Hybrid search with source failures
  Given local memory is available
  But Pieces Drive is offline
  When a client calls memory.hybrid_search with include_drive=true
  Then results from available sources should be returned
  And the response should include a warning about offline sources
  And the operation should not fail

Scenario: Hybrid search with optional sources
  Given all services are available
  When a client calls memory.hybrid_search with include_copilot=false
  Then Copilot should NOT be queried
  And results from local, LTM, and Drive should be returned
```

### Feature: Context Bridge

```gherkin
Scenario: Pieces event capture and storage
  Given the context bridge is enabled
  When Pieces OS emits a code change event
  Then the bridge should capture the event
  And create a summary of the change
  And store it in local memory with domain "code"
  And tag it with session metadata

Scenario: Context bridge filtering
  Given the context bridge is enabled
  And PIECES_CONTEXT_FILTERS="code,notes"
  When Pieces OS emits a meeting event
  Then the event should NOT be captured
  Because "meetings" is not in the filter list

Scenario: Context bridge disabled
  Given the context bridge is disabled via PIECES_CONTEXT_BRIDGE_ENABLED=false
  When Pieces OS emits events
  Then no events should be captured
  And no storage operations should occur
```

### Feature: Memory Reporting

```gherkin
Scenario: Generate daily report
  Given local memory contains entries from today
  And Pieces LTM contains entries from today
  When a client calls memory.report with time_range=today
  Then entries from all sources should be retrieved
  And a summary should be generated
  And the report should be formatted as markdown
  And include sections for: meetings, code changes, notes

Scenario: Domain-filtered reporting
  Given entries exist across multiple domains
  When a client calls memory.report with domain="code"
  Then only code-related entries should be included
  And the report should focus on development activities
```

## TDD Unit Tests

### Phase 1: Pieces Drive Proxy (Days 1-2)

#### RED: `packages/mcp-server/src/__tests__/pieces-drive-proxy.test.ts`

```typescript
describe('PiecesDriveProxy', () => {
  describe('connection', () => {
    it('should connect to Pieces Drive via SSE', async () => {
      // RED: No implementation yet
      const proxy = new PiecesDriveProxy({
        endpoint: 'http://localhost:39301/...',
        enabled: true,
        logger: mockLogger,
      });
      await expect(proxy.connect()).resolves.not.toThrow();
      expect(proxy.isConnected()).toBe(true);
    });

    it('should handle connection failure gracefully', async () => {
      // RED: No error handling yet
      const proxy = new PiecesDriveProxy({
        endpoint: 'http://invalid:9999/...',
        enabled: true,
        logger: mockLogger,
      });
      await expect(proxy.connect()).resolves.not.toThrow();
      expect(proxy.isConnected()).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to Pieces Drive')
      );
    });

    it('should auto-reconnect after disconnection', async () => {
      // RED: No reconnect logic yet
      const proxy = new PiecesDriveProxy({...});
      await proxy.connect();
      
      // Simulate disconnection
      await proxy['transport'].close();
      
      // Wait for reconnect attempt (5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5500));
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Attempting to reconnect')
      );
    });
  });

  describe('tool discovery', () => {
    it('should discover Drive tools via listTools()', async () => {
      // RED: No tool discovery yet
      const proxy = new PiecesDriveProxy({...});
      await proxy.connect();
      
      const tools = proxy.getTools();
      expect(tools).toContainEqual(
        expect.objectContaining({ name: 'list_files' })
      );
    });

    it('should return empty array when disconnected', () => {
      // RED: No disconnected state handling
      const proxy = new PiecesDriveProxy({...});
      expect(proxy.getTools()).toEqual([]);
    });
  });

  describe('tool execution', () => {
    it('should forward tool calls to Pieces Drive', async () => {
      // RED: No execution logic yet
      const proxy = new PiecesDriveProxy({...});
      await proxy.connect();
      
      const result = await proxy.callTool('list_files', { path: '/code' });
      expect(result).toHaveProperty('content');
      expect(mockTransport.callTool).toHaveBeenCalledWith(
        'list_files',
        { path: '/code' }
      );
    });
  });
});
```

#### GREEN: Implement minimal code to pass tests

1. Create `PiecesDriveProxy` class following `PiecesMCPProxy` pattern
2. Implement SSE connection via `@modelcontextprotocol/sdk`
3. Add graceful error handling
4. Implement auto-reconnect with 5-second delay
5. Add tool discovery via `listTools()`
6. Implement tool execution forwarding

#### REFACTOR: Improve code quality

1. Extract common proxy logic to base class
2. Add type safety for tool schemas
3. Improve logging with structured context
4. Add metrics/telemetry hooks

### Phase 2: Pieces Copilot Proxy (Days 3-4)

#### RED: `packages/mcp-server/src/__tests__/pieces-copilot-proxy.test.ts`

```typescript
describe('PiecesCopilotProxy', () => {
  describe('context assembly', () => {
    it('should gather context before Copilot query', async () => {
      // RED: No context assembly yet
      const proxy = new PiecesCopilotProxy({...});
      await proxy.connect();
      
      mockMemoryProvider.search.mockResolvedValue([/* local results */]);
      mockPiecesLTM.callTool.mockResolvedValue([/* LTM results */]);
      mockPiecesDrive.callTool.mockResolvedValue([/* Drive results */]);
      
      await proxy.callTool('ask', { question: 'What did we discuss?' });
      
      expect(mockMemoryProvider.search).toHaveBeenCalled();
      expect(mockPiecesLTM.callTool).toHaveBeenCalled();
      expect(mockPiecesDrive.callTool).toHaveBeenCalled();
    });

    it('should format context for Copilot', async () => {
      // RED: No context formatting yet
      const proxy = new PiecesCopilotProxy({...});
      const context = await proxy['assembleContext']('test query');
      
      expect(context).toHaveProperty('local_memories');
      expect(context).toHaveProperty('ltm_entries');
      expect(context).toHaveProperty('drive_files');
    });
  });

  describe('interaction persistence', () => {
    it('should store Copilot interactions in local memory', async () => {
      // RED: No persistence yet
      const proxy = new PiecesCopilotProxy({...});
      await proxy.callTool('ask', { question: 'test' });
      
      expect(mockMemoryProvider.store).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'copilot',
          content: expect.stringContaining('test'),
        })
      );
    });
  });

  describe('A2A events', () => {
    it('should emit events for Copilot interactions', async () => {
      // RED: No event emission yet
      const proxy = new PiecesCopilotProxy({...});
      await proxy.callTool('ask', { question: 'test' });
      
      expect(mockEventManager.emitEvent).toHaveBeenCalledWith({
        type: 'cortex.copilot.query.completed',
        payload: expect.objectContaining({
          query: 'test',
          source: 'pieces_copilot',
        }),
      });
    });
  });
});
```

#### GREEN: Implement Copilot proxy

1. Create `PiecesCopilotProxy` class
2. Implement context assembly logic
3. Format context for Copilot
4. Add interaction persistence
5. Emit A2A events

#### REFACTOR

1. Extract context assembly to separate module
2. Add caching for repeated contexts
3. Optimize parallel queries

### Phase 3: Enhanced Hybrid Search (Days 5-6)

#### RED: `packages/mcp-server/src/tools/__tests__/hybrid-search.test.ts`

```typescript
describe('memory.hybrid_search', () => {
  describe('multi-source aggregation', () => {
    it('should query all enabled sources in parallel', async () => {
      // RED: No multi-source logic yet
      const startTime = Date.now();
      
      const result = await hybridSearch({
        query: 'test',
        include_pieces: true,
        include_drive: true,
        include_copilot: true,
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
      expect(result.sources).toHaveLength(4);
    });

    it('should deduplicate results across sources', async () => {
      // RED: No deduplication yet
      mockLocalMemory.search.mockResolvedValue([
        { id: '1', content: 'duplicate' },
      ]);
      mockPiecesLTM.callTool.mockResolvedValue([
        { id: '1', content: 'duplicate' },
      ]);
      
      const result = await hybridSearch({ query: 'test' });
      expect(result.combined).toHaveLength(1);
    });

    it('should attribute source for each result', async () => {
      // RED: No source attribution yet
      const result = await hybridSearch({
        query: 'test',
        include_pieces: true,
      });
      
      expect(result.combined[0]).toHaveProperty('source');
      expect(['cortex-local', 'pieces-ltm', 'pieces-drive', 'pieces-copilot'])
        .toContain(result.combined[0].source);
    });
  });

  describe('graceful degradation', () => {
    it('should continue with partial results if source fails', async () => {
      // RED: No error handling yet
      mockPiecesDrive.callTool.mockRejectedValue(new Error('Drive offline'));
      
      const result = await hybridSearch({
        query: 'test',
        include_drive: true,
      });
      
      expect(result.sources).not.toContainEqual(
        expect.objectContaining({ name: 'pieces-drive' })
      );
      expect(result.warnings).toContain('Drive offline');
    });
  });
});
```

#### GREEN: Implement enhanced hybrid search

1. Update `memory.hybrid_search` tool
2. Add parallel querying for all sources
3. Implement deduplication logic
4. Add source attribution
5. Handle partial failures gracefully

#### REFACTOR

1. Extract deduplication to utility function
2. Add reranking algorithm
3. Optimize parallel execution

### Phase 4: Context Bridge (Days 7-8)

#### RED: `packages/memory-core/src/__tests__/context-bridge.test.ts`

```typescript
describe('ContextBridge', () => {
  describe('event capture', () => {
    it('should capture Pieces OS events', async () => {
      // RED: No capture logic yet
      const bridge = new ContextBridge({
        enabled: true,
        filters: ['code', 'notes'],
      });
      
      await bridge.start();
      
      // Simulate Pieces event
      await simulatePiecesEvent({
        type: 'code_change',
        data: { file: 'test.ts', changes: '...' },
      });
      
      expect(mockMemoryProvider.store).toHaveBeenCalled();
    });

    it('should filter events by domain', async () => {
      // RED: No filtering yet
      const bridge = new ContextBridge({
        filters: ['code'],
      });
      
      await simulatePiecesEvent({ type: 'meeting', data: {...} });
      expect(mockMemoryProvider.store).not.toHaveBeenCalled();
    });

    it('should not capture when disabled', async () => {
      // RED: No disable logic yet
      const bridge = new ContextBridge({ enabled: false });
      await simulatePiecesEvent({ type: 'code_change', data: {...} });
      expect(mockMemoryProvider.store).not.toHaveBeenCalled();
    });
  });
});
```

#### GREEN: Implement context bridge

1. Create `ContextBridge` class
2. Implement Pieces event listener
3. Add event transformation logic
4. Implement domain filtering
5. Store captured events in memory

#### REFACTOR

1. Extract event transformers to separate modules
2. Add batching for high-volume captures
3. Optimize storage calls

### Phase 5: Memory Reporting (Days 9-10)

#### RED: `packages/memory-core/src/__tests__/reporting.test.ts`

```typescript
describe('memory.report', () => {
  describe('report generation', () => {
    it('should generate time-based reports', async () => {
      // RED: No time filtering yet
      const report = await generateReport({
        time_range: { start: '2025-10-10T00:00:00Z' },
        format: 'markdown',
      });
      
      expect(report).toContain('# Daily Report');
      expect(report).toContain('## Meetings');
      expect(report).toContain('## Code Changes');
    });

    it('should filter by domain', async () => {
      // RED: No domain filtering yet
      const report = await generateReport({
        domain: 'code',
        format: 'markdown',
      });
      
      expect(report).toContain('## Code Activities');
      expect(report).not.toContain('## Meetings');
    });

    it('should aggregate from multiple sources', async () => {
      // RED: No multi-source aggregation yet
      const report = await generateReport({
        include_pieces: true,
        include_drive: true,
      });
      
      expect(mockHybridSearch).toHaveBeenCalled();
    });
  });
});
```

#### GREEN: Implement reporting

1. Enhance `generateReport` function
2. Add time-based filtering
3. Add domain filtering
4. Integrate hybrid search
5. Implement markdown formatting

#### REFACTOR

1. Extract formatters to separate modules
2. Add template system
3. Support multiple output formats

## Test Coverage Goals

- **Unit Tests**: ≥95% coverage for all new code
- **Integration Tests**: All proxy combinations
- **E2E Tests**: Full workflow from client to storage
- **Performance Tests**: Hybrid search < 500ms
- **Error Scenarios**: All failure modes covered

## Red-Green-Refactor Cycles

Each feature follows strict TDD:

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve without changing behavior
4. **Repeat**: Next test

## Test Execution Strategy

```bash
# Run all tests
pnpm test

# Run specific phase tests
pnpm --filter @cortex-os/mcp-server test pieces-drive-proxy
pnpm --filter @cortex-os/mcp-server test pieces-copilot-proxy
pnpm --filter @cortex-os/mcp-server test hybrid-search
pnpm --filter @cortex-os/memory-core test context-bridge
pnpm --filter @cortex-os/memory-core test reporting

# Run integration tests
pnpm --filter @apps/cortex-os test:integration

# Run performance tests
pnpm test:performance
```

## Mocking Strategy

- **Pieces Services**: Mock SSE transport, simulate responses
- **Memory Provider**: Mock storage/search operations
- **Event Manager**: Mock A2A event emission
- **File System**: Mock for context bridge file operations

## CI Integration

All tests run in CI:
- Pre-commit: Unit tests for changed files
- PR checks: Full test suite
- Post-merge: Integration tests
- Nightly: Performance tests

---

**TDD Plan Created**: 2025-10-10
**Next Phase**: Implementation (follow RED-GREEN-REFACTOR)
**Test Framework**: Vitest with @testing-library

Co-authored-by: brAInwav Development Team
