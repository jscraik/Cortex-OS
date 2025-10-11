# MCP Pieces Integration - TDD Plan

## Overview

This TDD plan follows Test-Driven Development principles for extending the existing Pieces OS integration within the Cortex MCP hub, leveraging established Cortex-OS architectural patterns and maintaining compliance with `.cortex/` governance requirements.

**Architecture Note**: This implementation extends the existing `PiecesMCPProxy` and `RemoteToolProxy` infrastructure in `packages/mcp-server` rather than creating parallel systems, ensuring proper A2A event integration and maintaining package dependency boundaries.

## BDD Acceptance Scenarios

### Feature: Extended Pieces Integration

```gherkin
Scenario: Enhanced Pieces proxy connection with multiple services
  Given Pieces OS services are running on configured endpoints
  When the MCP hub initializes with existing PiecesMCPProxy
  Then the proxy should connect to all configured Pieces services
  And "Successfully connected to Pieces OS services" should be logged
  And tools should be registered with "pieces." prefix per existing pattern
  And telemetry should record connection status via existing metrics

Scenario: Pieces proxy handles partial service availability
  Given some Pieces OS services are NOT running
  When the MCP hub initializes
  Then the PiecesMCPProxy should log warnings for unavailable services
  And the MCP hub should continue with available tools only
  And unavailable tools should be omitted from registration
  And A2A events should be emitted for service status changes

Scenario: Pieces proxy emits A2A events for tool execution
  Given the Pieces proxy is connected
  When a client calls "pieces.search_code"
  Then the proxy should forward the request to Pieces OS
  And return the Pieces response as MCP tool result
  And emit A2A event "cortex.pieces.tool.completed" via EventBus
  And include execution context in event payload

Scenario: Drive integration extends existing proxy
  Given Pieces Drive endpoint is configured separately
  When the MCP hub initializes
  Then the existing PiecesMCPProxy should include Drive tools
  And Drive tools should be registered with "pieces.drive." prefix
  And follow the same connection/reconnection patterns as other Pieces tools
```

### Feature: Enhanced Pieces Copilot Integration

```gherkin
Scenario: Copilot integration with enhanced context assembly
  Given the Pieces Copilot tools are available via PiecesMCPProxy
  When a client calls "pieces.copilot.ask" with query "explain this code"
  Then the system should first run performLocalHybridSearch for relevant context
  And include local memory results in the context
  And include existing Pieces LTM results in the context
  And send the assembled context to Pieces Copilot
  And return Copilot's response to the client
  And emit A2A event "cortex.copilot.query.completed"

Scenario: Copilot interaction persistence via MemoryProvider
  Given a Copilot query completes successfully
  When the response is returned
  Then the interaction should be stored via MemoryProvider interface
  And tagged with domain "copilot"
  And include the query, context, and response in structured format
  And follow the existing memory-core storage patterns

Scenario: Copilot tools extend existing Pieces proxy
  Given the PiecesMCPProxy is initialized
  When Copilot tools are discovered via listTools()
  Then Copilot tools should be registered with "pieces.copilot." prefix
  And follow the same RemoteTool patterns as other Pieces tools
  And include proper error handling via RemoteToolProxy
```

### Feature: Enhanced Hybrid Search Extension

```gherkin
Scenario: Extended hybrid search with all Pieces sources
  Given local memory, existing Pieces LTM, and new Pieces services are available
  When a client calls memory.hybrid_search with query "meeting notes"
  And include_pieces=true (existing parameter)
  And include_drive=true (new parameter)
  And include_copilot=true (new parameter)
  Then results from all sources should be queried in parallel via existing patterns
  And results should be deduplicated using existing normalizePiecesResults logic
  And results should be reranked by relevance
  And each result should have source attribution ('cortex-local', 'pieces-ltm', 'pieces-drive', 'pieces-copilot')
  And the response should complete within 500ms
  And telemetry should be recorded via observeHybridSearch

Scenario: Hybrid search with graceful degradation
  Given local memory is available via performLocalHybridSearch
  But some Pieces services are offline
  When a client calls memory.hybrid_search with include_drive=true
  Then results from available sources should be returned
  And the response should include warnings about offline sources
  And the operation should not fail
  And existing error handling patterns should be maintained

Scenario: Hybrid search extends existing implementation
  Given the existing memory.hybrid_search tool is working
  When new parameters (include_drive, include_copilot) are added
  Then the existing performLocalHybridSearch logic should be preserved
  And new Pieces services should be queried via existing PiecesMCPProxy
  And result merging should extend existing normalization logic
```

### Feature: Context Bridge via Memory-Core Integration

```gherkin
Scenario: Pieces event capture via MemoryProvider
  Given the context bridge is enabled via configuration
  When Pieces OS emits a code change event through existing event channels
  Then the bridge should capture the event using existing event patterns
  And create a summary of the change
  And store it via MemoryProvider interface with domain "code"
  And tag it with session metadata following existing memory-core patterns
  And emit A2A event "cortex.memory.event.stored"

Scenario: Context bridge filtering via memory-core
  Given the context bridge is enabled
  And PIECES_CONTEXT_FILTERS="code,notes" (environment variable)
  When Pieces OS emits a meeting event
  Then the event should NOT be captured
  Because "meetings" is not in the filter list
  And the filtering should use existing memory-core query patterns

Scenario: Context bridge integrates with existing memory services
  Given the context bridge is enabled
  And MemoryProvider is configured (LocalMemoryProvider or RemoteMemoryProvider)
  When Pieces OS emits events
  Then events should be stored using the configured MemoryProvider
  And follow the same validation and storage patterns as other memory operations
  And maintain consistency with existing memory-core contracts
```

### Feature: Enhanced Memory Reporting via Hybrid Search

```gherkin
Scenario: Generate comprehensive daily report
  Given local memory contains entries from today via MemoryProvider
  And Pieces LTM contains entries from today via existing integration
  And Pieces Drive/Copilot have activity logs
  When a client calls memory.report with time_range=today
  Then entries from all sources should be retrieved via performLocalHybridSearch
  And a summary should be generated using existing result formatting
  And the report should be formatted as markdown
  And include sections for: meetings, code changes, notes, Pieces interactions

Scenario: Domain-filtered reporting via memory-core
  Given entries exist across multiple domains via MemoryProvider
  When a client calls memory.report with domain="code"
  Then only code-related entries should be included
  And the report should focus on development activities
  And use existing memory-core domain filtering patterns

Scenario: Enhanced reporting with new Pieces sources
  Given the extended hybrid search is implemented
  When a client calls memory.report with include_drive=true and include_copilot=true
  Then the report should include Pieces Drive file activities
  And the report should include Pieces Copilot interaction summaries
  And maintain compatibility with existing report formats
```

## TDD Unit Tests

### Phase 1: Extended Pieces Integration (Days 1-2)

#### RED: `packages/mcp-server/src/__tests__/pieces-integration.test.ts`

```typescript
import { PiecesMCPProxy } from '../pieces-proxy.js';
import { EventBus } from '@cortex-os/a2a-core/bus.js';

describe('Extended Pieces Integration', () => {
  describe('enhanced PiecesMCPProxy', () => {
    it('should connect to multiple Pieces services', async () => {
      // RED: Extend existing proxy for multiple services
      const proxy = new PiecesMCPProxy({
        endpoint: 'http://localhost:39300/model_context_protocol/2024-11-05/sse',
        enabled: true,
        logger: mockLogger,
      });
      await expect(proxy.connect()).resolves.not.toThrow();
      expect(proxy.isConnected()).toBe(true);
    });

    it('should emit A2A events for tool execution', async () => {
      // RED: Add A2A event emission to existing proxy
      const mockEventBus = { emitEvent: vi.fn() };
      const proxy = new PiecesMCPProxy({
        endpoint: 'http://localhost:39300/...',
        enabled: true,
        logger: mockLogger,
        eventBus: mockEventBus,
      });
      await proxy.connect();

      await proxy.callTool('search_code', { query: 'test' });

      expect(mockEventBus.emitEvent).toHaveBeenCalledWith({
        type: 'cortex.pieces.tool.completed',
        payload: expect.objectContaining({
          tool: 'search_code',
          source: 'pieces_os',
        }),
      });
    });

    it('should handle partial service availability', async () => {
      // RED: Add graceful degradation for partial failures
      const proxy = new PiecesMCPProxy({
        endpoint: 'http://localhost:39300/...',
        enabled: true,
        logger: mockLogger,
      });

      // Mock partial service failure
      vi.spyOn(proxy, 'callTool').mockImplementation(async (tool) => {
        if (tool === 'drive.list_files') {
          throw new Error('Drive service unavailable');
        }
        return { success: true };
      });

      const availableTools = proxy.getTools().filter(t => !t.name.startsWith('drive.'));
      expect(availableTools.length).toBeGreaterThan(0);
    });
  });

  describe('A2A integration', () => {
    it('should integrate with existing EventBus', async () => {
      // RED: Ensure proper A2A integration
      const mockEventBus = new EventBus();
      const emitSpy = vi.spyOn(mockEventBus, 'emitEvent');

      const proxy = new PiecesMCPProxy({
        endpoint: 'http://localhost:39300/...',
        enabled: true,
        logger: mockLogger,
        eventBus: mockEventBus,
      });

      await proxy.callTool('test_tool', {});

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringMatching(/^cortex\.pieces\./),
          payload: expect.objectContaining({
            brand: 'brAInwav',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });
});
```

#### GREEN: Extend existing PiecesMCPProxy

1. **Extend PiecesMCPProxy** to support multiple Pieces service endpoints
2. **Add A2A event emission** via existing EventBus integration
3. **Enhance RemoteToolProxy** to handle partial service availability
4. **Leverage existing telemetry** via setPiecesProxyStatus
5. **Maintain existing connection/reconnection** patterns from RemoteToolProxy

#### REFACTOR: Improve integration quality

1. **Extract service configuration** to separate module for multiple endpoints
2. **Add structured A2A event schemas** following a2a-contracts patterns
3. **Enhance error handling** using existing RemoteToolProxy patterns
4. **Improve telemetry integration** with existing metrics framework

### Phase 2: Enhanced Copilot Integration (Days 3-4)

#### RED: `packages/mcp-server/src/__tests__/copilot-integration.test.ts`

```typescript
import { performLocalHybridSearch } from '../search-utils.js';
import { createMemoryProviderFromEnv } from '@cortex-os/memory-core/index.js';
import { EventBus } from '@cortex-os/a2a-core/bus.js';

describe('Enhanced Copilot Integration', () => {
  describe('context assembly via existing patterns', () => {
    it('should use performLocalHybridSearch for context', async () => {
      // RED: Extend existing hybrid search for Copilot context
      const mockMemoryProvider = createMemoryProviderFromEnv();
      const searchSpy = vi.spyOn(mockMemoryProvider, 'search');

      searchSpy.mockResolvedValue([
        { id: '1', content: 'Local memory result', score: 0.9 },
      ]);

      const context = await assembleCopilotContext('test query', {
        memoryProvider: mockMemoryProvider,
        includeLocal: true,
        includePieces: true,
      });

      expect(searchSpy).toHaveBeenCalledWith({
        query: 'test query',
        limit: 10,
      });
      expect(context).toHaveProperty('local_memories');
      expect(context).toHaveProperty('pieces_ltm');
    });

    it('should integrate with existing PiecesMCPProxy', async () => {
      // RED: Use existing Pieces proxy for Copilot tools
      const mockPiecesProxy = {
        isConnected: () => true,
        callTool: vi.fn().mockResolvedValue({ response: 'LTM result' }),
      };

      const context = await assembleCopilotContext('test query', {
        piecesProxy: mockPiecesProxy,
        includePieces: true,
      });

      expect(mockPiecesProxy.callTool).toHaveBeenCalledWith('ask_pieces_ltm', {
        question: 'test query',
        chat_llm: 'gpt-4',
        topics: [],
        related_questions: [],
      });
    });
  });

  describe('interaction persistence via MemoryProvider', () => {
    it('should store via MemoryProvider interface', async () => {
      // RED: Use memory-core storage patterns
      const mockMemoryProvider = createMemoryProviderFromEnv();
      const storeSpy = vi.spyOn(mockMemoryProvider, 'store');

      storeSpy.mockResolvedValue({ id: 'stored123' });

      await storeCopilotInteraction({
        memoryProvider: mockMemoryProvider,
        query: 'test query',
        response: 'test response',
        context: { local_memories: [], pieces_ltm: [] },
      });

      expect(storeSpy).toHaveBeenCalledWith({
        content: expect.stringContaining('test query'),
        domain: 'copilot',
        tags: ['copilot', 'pieces'],
        metadata: expect.objectContaining({
          query: 'test query',
          response: 'test response',
          sources: expect.arrayContaining(['local', 'pieces']),
        }),
      });
    });
  });

  describe('A2A event integration', () => {
    it('should emit events via existing EventBus', async () => {
      // RED: Use A2A patterns for event emission
      const mockEventBus = new EventBus();
      const emitSpy = vi.spyOn(mockEventBus, 'emitEvent');

      await emitCopilotEvent(mockEventBus, {
        type: 'query.completed',
        query: 'test query',
        response: 'test response',
      });

      expect(emitSpy).toHaveBeenCalledWith({
        type: 'cortex.copilot.query.completed',
        payload: expect.objectContaining({
          brand: 'brAInwav',
          query: 'test query',
          source: 'pieces_copilot',
          timestamp: expect.any(String),
        }),
      });
    });
  });
});
```

#### GREEN: Implement enhanced Copilot integration

1. **Extend existing hybrid-tools.ts** to support Copilot context assembly
2. **Integrate with performLocalHybridSearch** for local context retrieval
3. **Use existing PiecesMCPProxy** for Pieces LTM and Copilot tool calls
4. **Store interactions via MemoryProvider** interface following memory-core patterns
5. **Emit A2A events via EventBus** using a2a-core integration

#### REFACTOR

1. **Extract context assembly** to `src/utils/context-assembly.ts` module
2. **Add context caching** using existing memory patterns
3. **Optimize parallel queries** leveraging existing performLocalHybridSearch patterns

### Phase 3: Enhanced Hybrid Search Extension (Days 5-6)

#### RED: `packages/mcp-server/src/tools/__tests__/enhanced-hybrid-search.test.ts`

```typescript
import { performLocalHybridSearch } from '../../search-utils.js';
import { normalizePiecesResults } from '../../pieces-normalizer.js';

describe('Enhanced memory.hybrid_search', () => {
  describe('extend existing hybrid search', () => {
    it('should extend existing performLocalHybridSearch with Drive/Copilot', async () => {
      // RED: Extend existing hybrid-tools.ts implementation
      const mockPerformLocalHybridSearch = vi.fn().mockResolvedValue([
        { id: '1', content: 'Local result', score: 0.9, tags: [], importance: 1, metadata: {} },
      ]);

      const result = await enhancedHybridSearch({
        query: 'test',
        include_pieces: true,
        include_drive: true,
        include_copilot: true,
        limit: 10,
      });

      expect(mockPerformLocalHybridSearch).toHaveBeenCalledWith('test', { limit: 10 });
      expect(result).toHaveProperty('local');
      expect(result).toHaveProperty('pieces');
      expect(result).toHaveProperty('total');
    });

    it('should query new Pieces sources in parallel', async () => {
      // RED: Add parallel querying for Drive/Copilot
      const mockPiecesProxy = {
        isConnected: () => true,
        callTool: vi.fn(),
      };

      mockPiecesProxy.callTool
        .mockResolvedValueOnce({ drive_results: [{ id: 'd1', content: 'Drive file' }] })
        .mockResolvedValueOnce({ copilot_results: [{ id: 'c1', content: 'Copilot response' }] });

      const startTime = Date.now();
      const result = await queryPiecesSources(mockPiecesProxy, 'test query', {
        include_drive: true,
        include_copilot: true,
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // Parallel execution
      expect(mockPiecesProxy.callTool).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('drive');
      expect(result).toHaveProperty('copilot');
    });

    it('should use existing normalizePiecesResults for new sources', async () => {
      // RED: Leverage existing normalization logic
      const mockPiecesResponse = {
        drive_results: [{ id: 'd1', content: 'Drive file', relevance_score: 0.8 }],
        copilot_results: [{ id: 'c1', content: 'Copilot response', relevance_score: 0.9 }],
      };

      const normalized = normalizePiecesResults(mockPiecesResponse);

      expect(normalized).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'd1',
            content: 'Drive file',
            source: 'pieces-drive',
            score: 0.8,
          }),
          expect.objectContaining({
            id: 'c1',
            content: 'Copilot response',
            source: 'pieces-copilot',
            score: 0.9,
          }),
        ])
      );
    });
  });

  describe('maintain existing patterns', () => {
    it('should preserve existing telemetry patterns', async () => {
      // RED: Use existing observeHybridSearch function
      const mockObserveHybridSearch = vi.fn();

      await enhancedHybridSearchWithTelemetry({
        query: 'test',
        include_drive: true,
      }, mockObserveHybridSearch);

      expect(mockObserveHybridSearch).toHaveBeenCalledWith(
        expect.any(Number), // duration
        expect.any(Number), // localCount
        expect.any(Number), // piecesCount
      );
    });

    it('should handle partial failures using existing patterns', async () => {
      // RED: Extend existing error handling
      const mockPiecesProxy = {
        isConnected: () => true,
        callTool: vi.fn(),
      };

      mockPiecesProxy.callTool.mockRejectedValue(new Error('Drive service unavailable'));

      const result = await enhancedHybridSearch({
        query: 'test',
        include_drive: true,
        include_pieces: false,
        include_copilot: false,
      });

      expect(result.warnings).toContain('Drive service unavailable');
      expect(result.total).toBeGreaterThanOrEqual(0); // Should still return results
    });
  });
});
```

#### GREEN: Extend existing hybrid search implementation

1. **Extend hybrid-tools.ts** to add `include_drive` and `include_copilot` parameters
2. **Use existing performLocalHybridSearch** for local memory queries
3. **Leverage existing PiecesMCPProxy** for new Pieces service queries
4. **Extend normalizePiecesResults** to handle Drive/Copilot response formats
5. **Maintain existing observeHybridSearch** telemetry patterns

#### REFACTOR

1. **Extract source querying** to `src/utils/pieces-source-query.ts` module
2. **Extend existing deduplication** logic to handle new source types
3. **Optimize result merging** using existing normalization patterns

### Phase 4: Context Bridge via Memory-Core (Days 7-8)

#### RED: `packages/memory-core/src/__tests__/context-bridge.test.ts`

```typescript
import { createMemoryProviderFromEnv } from '../index.js';
import { EventBus } from '@cortex-os/a2a-core/bus.js';

describe('Context Bridge via MemoryProvider', () => {
  describe('integration with memory-core patterns', () => {
    it('should store Pieces events via MemoryProvider interface', async () => {
      // RED: Use existing MemoryProvider for event storage
      const memoryProvider = createMemoryProviderFromEnv();
      const storeSpy = vi.spyOn(memoryProvider, 'store');

      storeSpy.mockResolvedValue({ id: 'event123' });

      const contextBridge = new ContextBridge({
        enabled: true,
        memoryProvider,
        filters: ['code', 'notes'],
      });

      await contextBridge.captureEvent({
        type: 'code_change',
        data: { file: 'test.ts', changes: 'added function' },
        timestamp: new Date().toISOString(),
      });

      expect(storeSpy).toHaveBeenCalledWith({
        content: expect.stringContaining('code_change'),
        domain: 'code',
        tags: ['pieces', 'code_change', 'code'],
        metadata: expect.objectContaining({
          eventType: 'code_change',
          source: 'pieces_os',
          file: 'test.ts',
        }),
      });
    });

    it('should use existing memory-core filtering patterns', async () => {
      // RED: Leverage MemoryProvider search for filtering
      const memoryProvider = createMemoryProviderFromEnv();
      const storeSpy = vi.spyOn(memoryProvider, 'store');

      const contextBridge = new ContextBridge({
        enabled: true,
        memoryProvider,
        filters: ['code'], // Only capture code events
      });

      // Should capture - matches filter
      await contextBridge.captureEvent({
        type: 'code_change',
        data: { file: 'test.ts' },
      });

      // Should not capture - doesn't match filter
      await contextBridge.captureEvent({
        type: 'meeting',
        data: { title: 'Team sync' },
      });

      expect(storeSpy).toHaveBeenCalledTimes(1);
      expect(storeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'code' })
      );
    });

    it('should work with both LocalMemoryProvider and RemoteMemoryProvider', async () => {
      // RED: Test provider abstraction
      const localProvider = createMemoryProviderFromEnv();
      const remoteProvider = {
        store: vi.fn().mockResolvedValue({ id: 'remote123' }),
        search: vi.fn(),
      };

      const localBridge = new ContextBridge({
        enabled: true,
        memoryProvider: localProvider,
      });

      const remoteBridge = new ContextBridge({
        enabled: true,
        memoryProvider: remoteProvider,
      });

      const event = { type: 'test', data: {} };

      await localBridge.captureEvent(event);
      await remoteBridge.captureEvent(event);

      expect(localBridge.memoryProvider.store).toHaveBeenCalled();
      expect(remoteBridge.memoryProvider.store).toHaveBeenCalled();
    });
  });

  describe('A2A event emission', () => {
    it('should emit events via existing EventBus', async () => {
      // RED: Use A2A patterns for event notifications
      const mockEventBus = new EventBus();
      const emitSpy = vi.spyOn(mockEventBus, 'emitEvent');
      const memoryProvider = createMemoryProviderFromEnv();

      const contextBridge = new ContextBridge({
        enabled: true,
        memoryProvider,
        eventBus: mockEventBus,
      });

      await contextBridge.captureEvent({
        type: 'code_change',
        data: { file: 'test.ts' },
      });

      expect(emitSpy).toHaveBeenCalledWith({
        type: 'cortex.memory.event.stored',
        payload: expect.objectContaining({
          brand: 'brAInwav',
          eventType: 'code_change',
          source: 'pieces_os',
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('environment configuration', () => {
    it('should respect PIECES_CONTEXT_BRIDGE_ENABLED environment variable', async () => {
      // RED: Use environment-based configuration
      const originalEnabled = process.env.PIECES_CONTEXT_BRIDGE_ENABLED;
      process.env.PIECES_CONTEXT_BRIDGE_ENABLED = 'false';

      const memoryProvider = createMemoryProviderFromEnv();
      const storeSpy = vi.spyOn(memoryProvider, 'store');

      const contextBridge = new ContextBridge({
        enabled: true,
        memoryProvider,
      });

      await contextBridge.captureEvent({ type: 'test', data: {} });

      expect(storeSpy).not.toHaveBeenCalled();

      process.env.PIECES_CONTEXT_BRIDGE_ENABLED = originalEnabled;
    });
  });
});
```

#### GREEN: Implement context bridge via memory-core

1. **Create ContextBridge class** that uses MemoryProvider interface
2. **Integrate with existing memory-core** storage patterns
3. **Use environment variables** for configuration (PIECES_CONTEXT_FILTERS, PIECES_CONTEXT_BRIDGE_ENABLED)
4. **Emit A2A events** via EventBus for event notifications
5. **Support both LocalMemoryProvider and RemoteMemoryProvider** implementations

#### REFACTOR

1. **Extract event processing** to `src/utils/event-processor.ts` module
2. **Add event batching** using existing memory-core queue patterns
3. **Optimize storage calls** leveraging memory-core transaction patterns

### Phase 5: Enhanced Memory Reporting (Days 9-10)

#### RED: `packages/mcp-server/src/tools/__tests__/memory-reporting.test.ts`

```typescript
import { performLocalHybridSearch } from '../../search-utils.js';
import { generateMarkdownReport } from '../../utils/report-generator.js';

describe('Enhanced memory.report tool', () => {
  describe('extend existing reporting patterns', () => {
    it('should use performLocalHybridSearch for report data', async () => {
      // RED: Use existing hybrid search for reporting
      const mockPerformLocalHybridSearch = vi.fn().mockResolvedValue([
        {
          id: '1',
          content: 'Code change in app.ts',
          domain: 'code',
          tags: ['typescript', 'feature'],
          importance: 2,
          metadata: { file: 'app.ts' },
        },
        {
          id: '2',
          content: 'Meeting notes about planning',
          domain: 'meetings',
          tags: ['planning', 'team'],
          importance: 1,
          metadata: { attendees: ['alice', 'bob'] },
        },
      ]);

      const report = await generateMemoryReport({
        time_range: { start: '2025-10-10T00:00:00Z', end: '2025-10-10T23:59:59Z' },
        domain: undefined, // All domains
        format: 'markdown',
      });

      expect(mockPerformLocalHybridSearch).toHaveBeenCalled();
      expect(report).toContain('# Daily Report');
      expect(report).toContain('## Code Changes');
      expect(report).toContain('## Meetings');
    });

    it('should filter reports by domain using memory-core patterns', async () => {
      // RED: Use existing domain filtering
      const report = await generateMemoryReport({
        domain: 'code',
        format: 'markdown',
        include_drive: true,
        include_copilot: true,
      });

      expect(report).toContain('## Code Activities');
      expect(report).toContain('### Local Memory');
      expect(report).toContain('### Pieces Drive');
      expect(report).toContain('### Pieces Copilot');
      expect(report).not.toContain('## Meetings');
    });

    it('should integrate new Pieces sources in reports', async () => {
      // RED: Include new Pieces services in reporting
      const mockPiecesProxy = {
        isConnected: () => true,
        callTool: vi.fn(),
      };

      mockPiecesProxy.callTool
        .mockResolvedValueOnce({
          drive_results: [
            { id: 'd1', content: 'Modified main.js', type: 'file_change' }
          ]
        })
        .mockResolvedValueOnce({
          copilot_results: [
            { id: 'c1', content: 'Helped with React component', type: 'interaction' }
          ]
        });

      const report = await generateMemoryReportWithPieces({
        piecesProxy: mockPiecesProxy,
        include_drive: true,
        include_copilot: true,
        format: 'markdown',
      });

      expect(report).toContain('### Pieces Drive');
      expect(report).toContain('### Pieces Copilot');
      expect(report).toContain('Modified main.js');
      expect(report).toContain('Helped with React component');
    });
  });

  describe('maintain compatibility with existing formats', () => {
    it('should generate markdown format by default', async () => {
      // RED: Preserve existing markdown format
      const report = await generateMemoryReport({
        format: 'markdown',
      });

      expect(report).toMatch(/^# /); // H1 header
      expect(report).toMatch(/^## /); // H2 headers
      expect(report).toMatch(/^- /); // Bullet points
      expect(typeof report).toBe('string');
    });

    it('should include structured metadata in reports', async () => {
      // RED: Add structured metadata following existing patterns
      const report = await generateMemoryReport({
        time_range: { start: '2025-10-10T00:00:00Z' },
        format: 'markdown',
      });

      expect(report).toContain('**Generated:**');
      expect(report).toContain('**Time Range:**');
      expect(report).toContain('**Sources:**');
      expect(report).toContain('brAInwav');
    });
  });

  describe('error handling and graceful degradation', () => {
    it('should handle unavailable Pieces services in reports', async () => {
      // RED: Graceful degradation for partial failures
      const mockPiecesProxy = {
        isConnected: () => false,
        callTool: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      };

      const report = await generateMemoryReportWithPieces({
        piecesProxy: mockPiecesProxy,
        include_drive: true,
        include_copilot: true,
      });

      expect(report).toContain('### Pieces Drive');
      expect(report).toContain('*Service unavailable*');
      expect(report).toContain('### Pieces Copilot');
      expect(report).toContain('*Service unavailable*');
    });
  });
});
```

#### GREEN: Enhance existing memory reporting

1. **Extend existing memory reporting** to include new Pieces sources
2. **Use performLocalHybridSearch** as the primary data source
3. **Add support for include_drive and include_copilot** parameters
4. **Maintain existing markdown format** and structure
5. **Integrate with existing PiecesMCPProxy** for Pieces-specific data

#### REFACTOR

1. **Extract report generation** to `src/utils/report-generator.ts` module
2. **Add template system** for different report formats
3. **Optimize data aggregation** using existing hybrid search patterns

## Test Coverage Goals

- **Unit Tests**: ≥95% coverage for all new code (following Cortex-OS standards)
- **Integration Tests**: All Pieces integration scenarios via mcp-server
- **E2E Tests**: Full workflow from client to memory-core storage
- **Performance Tests**: Hybrid search < 500ms with telemetry
- **Security Tests**: OWASP compliance for all new interfaces
- **Accessibility Tests**: WCAG 2.2 AA compliance for any UI components
- **A2A Event Tests**: All event emission patterns validated

## Red-Green-Refactor Cycles

Each feature follows strict TDD with Cortex-OS patterns:

1. **RED**: Write failing test using existing Vitest configuration
2. **GREEN**: Write minimal code extending existing patterns
3. **REFACTOR**: Improve without changing behavior, maintain A2A contracts
4. **Repeat**: Next test with proper package dependency compliance

## Test Execution Strategy

```bash
# Run all tests with existing Cortex-OS patterns
pnpm test
pnpm test:coverage

# Run specific phase tests using existing packages
pnpm --filter @cortex-os/mcp-server test pieces-integration
pnpm --filter @cortex-os/mcp-server test copilot-integration
pnpm --filter @cortex-os/mcp-server test enhanced-hybrid-search
pnpm --filter @cortex-os/memory-core test context-bridge
pnpm --filter @cortex-os/mcp-server test memory-reporting

# Run integration tests via existing framework
pnpm test:integration
pnpm mcp:test

# Performance and security tests
pnpm test:performance
pnpm security:scan
pnpm structure:validate
```

## Mocking Strategy (Following Cortex-OS Patterns)

- **Pieces Services**: Mock RemoteToolProxy and SSE transport patterns
- **Memory Provider**: Use createMemoryProviderFromEnv with mock implementations
- **A2A EventBus**: Mock via @cortex-os/a2a-core/test utilities
- **Telemetry**: Mock observeHybridSearch and metrics functions
- **Configuration**: Use existing config loading patterns

## Package Dependencies & Import Boundaries

### Allowed Dependencies (per Nx constraints)
- **mcp-server** can depend on: `mcp-bridge`, `memory-core`, `a2a-core`, `tool-spec`
- **memory-core** can depend on: `contracts`, `tool-spec`, `utils`
- **All packages** can use: `@cortex-os/agent-toolkit` utilities

### Forbidden Patterns
- ❌ Direct imports between packages (use published packages)
- ❌ Bypassing RemoteToolProxy for external services
- ❌ Direct database access (use MemoryProvider interface)
- ❌ Custom event systems (use existing EventBus)

## Governance & Quality Gates

### Compliance Requirements
- **All code** must pass `pnpm lint` and `pnpm typecheck`
- **All tests** must achieve ≥90% coverage (≥95% for new code)
- **Security** must pass `pnpm security:scan` (OWASP rules)
- **Structure** must pass `pnpm structure:validate`
- **Dependencies** must respect Nx constraints and ESLint rules

### BrAInwav Branding Requirements
- All logs must use `createBrandedLog()` with proper context
- All A2A events must include `brand: 'brAInwav'` field
- All error messages must follow Cortex-OS patterns
- All metrics must use existing telemetry framework

### Memory Management Requirements
- All memory operations must use MemoryProvider interface
- All context must be persisted per `.github/instructions/memories.instructions.md`
- All decisions must be stored in local memory with proper domain tagging
- Dual-mode MCP/REST parity must be maintained

## CI Integration (Cortex-OS Pipeline)

All tests run in existing CI pipeline:
- **Pre-commit**: Unit tests for changed files, lint, typecheck
- **PR checks**: Full test suite, security scan, structure validation
- **Post-merge**: Integration tests, performance benchmarks
- **Nightly**: Full regression suite, dependency updates validation

### Required Evidence in PRs
- Test coverage reports showing ≥90% threshold
- Security scan results (no ERROR severity findings)
- Structure validation output
- Performance benchmarks for hybrid search (< 500ms)
- Memory persistence evidence per governance requirements

---

**TDD Plan Updated**: 2025-10-11
**Next Phase**: Implementation (follow RED-GREEN-REFACTOR with Cortex-OS patterns)
**Test Framework**: Vitest (existing configuration) with proper package isolation
**Architecture**: Extends existing PiecesMCPProxy and memory-core patterns
**Compliance**: Fully aligned with Cortex-OS governance and Nx constraints

## Key Architectural Changes Made

1. **✅ Extended Existing PiecesMCPProxy** instead of creating parallel proxy systems
2. **✅ Integrated A2A Events** via existing EventBus from @cortex-os/a2a-core
3. **✅ Leveraged MemoryProvider Interface** for all storage operations
4. **✅ Used Existing Hybrid Search Patterns** via performLocalHybridSearch
5. **✅ Maintained Package Dependency Boundaries** per Nx constraints
6. **✅ Followed BrAInwav Branding** requirements throughout
7. **✅ Ensured Governance Compliance** with .cortex/ rules
8. **✅ Aligned with Existing Testing Framework** and quality gates

This updated TDD plan can now be safely implemented without breaking the existing Cortex-OS codebase structure while extending Pieces OS integration capabilities.

Co-authored-by: brAInwav Development Team
