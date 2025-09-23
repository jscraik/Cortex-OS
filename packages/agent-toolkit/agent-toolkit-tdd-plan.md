# Agent Toolkit Enhancement TDD Plan

## Comprehensive Software Engineering Principled Test-Driven Development Plan

### 🎯 Executive Summary

This plan enhances the `@cortex-os/agent-toolkit` package to implement the advanced features shown in the provided images, making it suitable for use by frontier models (Claude, GPT-4, Gemini) via multiple MCP integrations, and A2A communication via Cortex-OS.

### 📋 Analysis of Current State vs. Requirements

#### ✅ Current Strengths

- Well-structured domain-driven architecture with clean separation
- Comprehensive shell script tools (ripgrep, semgrep, ast-grep, comby, etc.)
- Type-safe Zod contracts and schemas
- OpenTelemetry observability integration
- MCP foundation with basic tools
- Test infrastructure with vitest

#### 🚨 Critical Gaps Identified

1. **Session Management & Context Pruning** (Image 1)
   - No session-aware token management
   - Missing context pruning logic (40k tokens rule)
   - No tool call history management

2. **Advanced Semantic Understanding** (Image 4 - DeepContext MCP)
   - Missing Tree-sitter parsing for syntax trees
   - No semantic chunking of functions/classes/imports
   - Limited vector embedding integration
   - No intelligent file discovery bypassing

3. **Multi-step Context Engineering** (Image 3)
   - Missing structured workflow: Research → Planning → Implementation
   - No task-based context storage in markdown files
   - Limited follow-up question capability

4. **Production Readiness**
   - Missing CI/pnpm integration checks
   - No comprehensive error handling patterns
   - Limited performance monitoring
   - Missing rate limiting and circuit breakers

### 🧪 TDD Implementation Plan

## Phase 1: Session Management & Context Pruning

### 1.1 Session-Aware Context Management

*Following Image 1's session pruning approach*

```typescript
// Test: Session context should track tool calls and prune older ones
describe('SessionContextManager', () => {
  test('should track tool calls with token counts', async () => {
    const manager = new SessionContextManager();
    const call = await manager.addToolCall('search', { pattern: 'test' }, 150);
    
    expect(call.tokenCount).toBe(150);
    expect(manager.getTotalTokens()).toBe(150);
  });

  test('should prune tool calls when exceeding 40k tokens with 20k+ to trim', async () => {
    const manager = new SessionContextManager({ maxTokens: 40000 });
    
    // Add calls totaling 45k tokens
    await addMultipleToolCalls(manager, 45000);
    
    expect(manager.getTotalTokens()).toBeLessThanOrEqual(40000);
    expect(manager.getRecentToolCalls()).toHaveLength(lessThanOriginal);
  });
});
```

**Implementation Files:**

- `src/session/SessionContextManager.ts`
- `src/session/ContextPruningStrategy.ts`
- `src/session/TokenCounter.ts`
- `tests/session/session-management.test.ts`

### 1.2 Tool Call History with Compaction

```typescript
// Test: Tool history should compact efficiently
describe('ToolCallHistory', () => {
  test('should rarely hit compaction with intelligent storage', async () => {
    const history = new ToolCallHistory();
    const compactionSpy = jest.spyOn(history, 'compact');
    
    // Simulate normal usage pattern
    for (let i = 0; i < 1000; i++) {
      await history.addCall(`call-${i}`, { data: 'test' });
    }
    
    expect(compactionSpy).toHaveBeenCalledTimes(0); // "rarely hit compaction"
  });
});
```

**Implementation Files:**

- `src/session/ToolCallHistory.ts`
- `src/session/CompactionStrategy.ts`

## Phase 2: Advanced Semantic Understanding (DeepContext MCP)

### 2.1 Tree-sitter Integration for Syntax Parsing

*Following Image 4's approach*

```typescript
// Test: Should parse codebase with Tree-sitter for real syntax trees
describe('TreeSitterParser', () => {
  test('should parse JavaScript for functions, classes, imports', async () => {
    const parser = new TreeSitterParser('javascript');
    const code = `
      import { test } from 'vitest';
      class MyClass { 
        method() { return 'test'; }
      }
    `;
    
    const chunks = await parser.extractMeaningfulChunks(code);
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0].type).toBe('import');
    expect(chunks[1].type).toBe('class');
    expect(chunks[2].type).toBe('method');
  });
});
```

**Implementation Files:**

- `src/parsing/TreeSitterParser.ts`
- `src/parsing/ChunkExtractor.ts`
- `src/parsing/LanguageDetector.ts`
- `tests/parsing/treesitter-integration.test.ts`

### 2.2 Semantic Chunking with Vector Embeddings

```typescript
// Test: Should combine semantic embeddings with traditional text search
describe('SemanticChunker', () => {
  test('should embed meaningful chunks and enable semantic search', async () => {
    const chunker = new SemanticChunker();
    const chunks = [
      { type: 'function', content: 'async function fetchData() {...}' },
      { type: 'class', content: 'class DataProcessor {...}' }
    ];
    
    const embedded = await chunker.embedChunks(chunks);
    const results = await chunker.semanticSearch('data processing', 5);
    
    expect(embedded).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThan(0.8);
  });
});
```

**Implementation Files:**

- `src/semantic/SemanticChunker.ts`
- `src/semantic/EmbeddingProvider.ts`
- `src/semantic/VectorSearch.ts`

### 2.3 Intelligent File Discovery with Caching

```typescript
// Test: Should bypass slow initial file discovery process
describe('IntelligentDiscovery', () => {
  test('should cache file structure and provide instant queries', async () => {
    const discovery = new IntelligentDiscovery();
    
    // First call builds cache
    const start1 = Date.now();
    await discovery.queryCodebase('React component');
    const duration1 = Date.now() - start1;
    
    // Second call uses cache
    const start2 = Date.now();
    await discovery.queryCodebase('React hook');
    const duration2 = Date.now() - start2;
    
    expect(duration2).toBeLessThan(duration1 * 0.1); // 90% faster
  });
});
```

**Implementation Files:**

- `src/discovery/IntelligentDiscovery.ts`
- `src/discovery/FileStructureCache.ts`
- `src/discovery/QueryProcessor.ts`

## Phase 3: Multi-step Context Engineering

### 3.1 Task-based Context Storage

*Following Image 3's structured approach*

```typescript
// Test: Should manage task-based contexts with semantic IDs
describe('TaskContextManager', () => {
  test('should create task with semantic ID and store context in markdown', async () => {
    const manager = new TaskContextManager();
    const task = await manager.createTask({
      description: 'Implement user authentication system',
      scope: 'auth-system-implementation'
    });
    
    expect(task.id).toMatch(/auth-system-implementation-\d+/);
    expect(await fs.pathExists(`tasks/${task.id}/context.md`)).toBe(true);
  });
});
```

**Implementation Files:**

- `src/context/TaskContextManager.ts`
- `src/context/SemanticIdGenerator.ts`
- `src/context/MarkdownStorage.ts`

### 3.2 Research Phase Implementation

```typescript
// Test: Research should find patterns and ask follow-up questions
describe('ResearchPhase', () => {
  test('should find existing patterns in codebase', async () => {
    const research = new ResearchPhase();
    const findings = await research.findPatterns({
      codebasePath: './src',
      query: 'authentication patterns'
    });
    
    expect(findings.patterns).toBeDefined();
    expect(findings.followUpQuestions).toHaveLength(greaterThan(0));
  });

  test('should generate research.md file with findings', async () => {
    const research = new ResearchPhase();
    await research.executeResearch('task-123', 'implement auth');
    
    const researchFile = await fs.readFile('tasks/task-123/research.md', 'utf8');
    expect(researchFile).toContain('## Findings');
    expect(researchFile).toContain('## Follow-up Questions');
  });
});
```

**Implementation Files:**

- `src/workflow/ResearchPhase.ts`
- `src/workflow/PatternFinder.ts`
- `src/workflow/QuestionGenerator.ts`

### 3.3 Planning Phase with Context Requirements

```typescript
// Test: Planning should create comprehensive implementation plans
describe('PlanningPhase', () => {
  test('should generate plan.md with all required context', async () => {
    const planning = new PlanningPhase();
    const plan = await planning.generatePlan({
      taskId: 'task-123',
      researchPath: 'tasks/task-123/research.md'
    });
    
    expect(plan.components).toBeDefined();
    expect(plan.requiredContext).toBeDefined();
    expect(plan.reuseOpportunities).toBeDefined();
  });
});
```

## Phase 4: Production-Ready Infrastructure

### 4.1 CI/pnpm Integration Validation

```typescript
// Test: Should integrate with pnpm workspace validation
describe('CIPnpmIntegration', () => {
  test('should validate package.json consistency across workspace', async () => {
    const validator = new WorkspaceValidator();
    const results = await validator.validateWorkspace();
    
    expect(results.packageConsistency).toBe('valid');
    expect(results.dependencyConflicts).toHaveLength(0);
  });

  test('should run pre-commit hooks with agent toolkit validation', async () => {
    const hooks = new PreCommitHooks();
    const result = await hooks.runAgentToolkitValidation();
    
    expect(result.lintResults.errors).toBe(0);
    expect(result.testCoverage).toBeGreaterThan(95);
  });
});
```

**Implementation Files:**

- `src/ci/WorkspaceValidator.ts`
- `src/ci/PreCommitHooks.ts`
- `src/ci/PnpmIntegration.ts`

### 4.2 Advanced Error Handling & Circuit Breakers

```typescript
// Test: Should implement production-grade resilience patterns
describe('ResilientToolExecution', () => {
  test('should implement circuit breaker for external tools', async () => {
    const executor = new ResilientToolExecutor();
    
    // Simulate failures
    jest.spyOn(executor, 'executeShellScript').mockRejectedValue(new Error('Tool failed'));
    
    for (let i = 0; i < 5; i++) {
      await executor.execute('ripgrep', {}).catch(() => {});
    }
    
    // Circuit should be open after failures
    expect(executor.getCircuitState('ripgrep')).toBe('OPEN');
  });
});
```

**Implementation Files:**

- `src/resilience/ResilientToolExecutor.ts`
- `src/resilience/CircuitBreakerManager.ts`
- `src/resilience/RetryStrategy.ts`

### 4.3 Performance Monitoring & Rate Limiting

```typescript
// Test: Should monitor performance and enforce rate limits
describe('PerformanceMonitoring', () => {
  test('should track tool execution metrics', async () => {
    const monitor = new PerformanceMonitor();
    
    await monitor.executeWithMetrics('search', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { results: [] };
    });
    
    const metrics = monitor.getMetrics('search');
    expect(metrics.avgDuration).toBeCloseTo(100, 50);
  });
});
```

## Phase 5: Advanced MCP & A2A Integration

### 5.1 Multi-MCP Support for Frontier Models

```typescript
// Test: Should support multiple MCP protocols simultaneously
describe('MultiMCPSupport', () => {
  test('should register tools across Claude, GPT, Gemini MCPs', async () => {
    const registry = new MultiMCPRegistry();
    
    await registry.registerForProtocols(['claude-mcp', 'openai-mcp', 'gemini-mcp'], {
      tools: ['search', 'codemod', 'validate']
    });
    
    expect(registry.getRegisteredProtocols()).toHaveLength(3);
  });
});
```

**Implementation Files:**

- `src/mcp/MultiMCPRegistry.ts`
- `src/mcp/ProtocolAdapters.ts`
- `src/mcp/FrontierModelSupport.ts`

### 5.2 Enhanced A2A Event Integration

```typescript
// Test: Should emit detailed A2A events for Cortex-OS integration
describe('A2AEventIntegration', () => {
  test('should emit structured events for tool executions', async () => {
    const eventBus = new MockEventBus();
    const toolkit = createAgentToolkit({ eventBus });
    
    await toolkit.search('pattern', 'path');
    
    const events = eventBus.getEmittedEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'tool.execution.started',
        data: expect.objectContaining({
          toolName: 'ripgrep',
          sessionId: expect.any(String)
        })
      })
    );
  });
});
```

## Phase 6: Advanced Features & Optimizations

### 6.1 Intelligent Caching & Memoization

```typescript
// Test: Should cache expensive operations intelligently
describe('IntelligentCaching', () => {
  test('should memoize search results based on content hash', async () => {
    const cache = new IntelligentCache();
    const toolkit = createAgentToolkit({ cache });
    
    const result1 = await toolkit.search('pattern', 'path');
    const result2 = await toolkit.search('pattern', 'path'); // Should hit cache
    
    expect(cache.getHitRate()).toBeGreaterThan(0.5);
  });
});
```

### 6.2 Parallel Tool Execution

```typescript
// Test: Should execute multiple tools in parallel when possible
describe('ParallelExecution', () => {
  test('should run compatible tools concurrently', async () => {
    const executor = new ParallelToolExecutor();
    
    const start = Date.now();
    const results = await executor.executeParallel([
      ['search', { pattern: 'test1', path: '.' }],
      ['search', { pattern: 'test2', path: '.' }],
      ['validate', { files: ['file1.ts'] }]
    ]);
    const duration = Date.now() - start;
    
    expect(results).toHaveLength(3);
    expect(duration).toBeLessThan(serialExecutionTime * 0.7);
  });
});
```

### 6.3 Context-Aware Tool Selection

```typescript
// Test: Should select optimal tools based on context
describe('ContextAwareSelection', () => {
  test('should choose best tool based on file types and patterns', async () => {
    const selector = new ContextAwareToolSelector();
    
    const toolChoice = await selector.selectOptimalTool({
      operation: 'search',
      context: {
        fileTypes: ['.ts', '.tsx'],
        pattern: 'React.Component',
        codebase: 'frontend-heavy'
      }
    });
    
    expect(toolChoice.primary).toBe('ast-grep'); // Better for React patterns
    expect(toolChoice.fallbacks).toContain('semgrep');
  });
});
```

## Phase 7: Documentation & Developer Experience

### 7.1 Interactive Documentation

```typescript
// Test: Should generate interactive documentation
describe('InteractiveDocumentation', () => {
  test('should generate markdown with runnable examples', async () => {
    const docGen = new InteractiveDocGenerator();
    const docs = await docGen.generateDocs({
      includeExamples: true,
      validateExamples: true
    });
    
    expect(docs).toContain('```typescript');
    expect(docs).toContain('// ✅ This example is validated');
  });
});
```

### 7.2 CLI Enhancement with Rich Output

```typescript
// Test: CLI should provide rich, informative output
describe('CLIEnhancement', () => {
  test('should provide colored, structured output', async () => {
    const cli = new EnhancedCLI();
    const output = await cli.runCommand(['search', 'pattern', 'path']);
    
    expect(output).toContain('\u001b[32m'); // Green color codes
    expect(output).toContain('┌─'); // Box drawing characters
  });
});
```

## Implementation Strategy

### 📅 Sprint Planning (2-week sprints)

**Sprint 1-2: Foundation (Session Management)**

- Implement SessionContextManager
- Add context pruning logic
- Tool call history with compaction

**Sprint 3-4: Semantic Understanding**

- Tree-sitter integration
- Semantic chunking
- Vector embeddings

**Sprint 5-6: Context Engineering**

- Task-based workflows
- Research/Planning phases
- Markdown context storage

**Sprint 7-8: Production Infrastructure**

- CI/pnpm integration
- Error handling & resilience
- Performance monitoring

**Sprint 9-10: MCP & A2A Enhancement**

- Multi-MCP support
- Enhanced event integration
- Frontier model optimizations

**Sprint 11-12: Advanced Features**

- Intelligent caching
- Parallel execution
- Context-aware selection

### 🔄 TDD Workflow

1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass
3. **Refactor**: Clean up while keeping tests green
4. **Document**: Update docs and examples
5. **Integration**: Test with real frontier models

### 📊 Quality Gates

- **Test Coverage**: Minimum 95%
- **Performance**: All operations < 2s (excluding network)
- **Memory**: No leaks, bounded growth
- **Error Rate**: < 0.1% in production scenarios
- **Documentation**: Every public API documented with examples

### 🛡️ CODESTYLE.md Compliance

- ✅ Functional-first approach where possible
- ✅ Classes only for stateful resources (SessionManager, Cache)
- ✅ Functions ≤ 40 lines
- ✅ Named exports only
- ✅ Explicit TypeScript types at API boundaries
- ✅ Async/await over Promise chains
- ✅ Guard clauses for error handling
- ✅ Real implementations (no mocks in production)

### 🚀 Integration Points

#### With Cortex-OS Packages

- `@cortex-os/memories`: Session context persistence
- `@cortex-os/orchestration`: A2A event routing
- `@cortex-os/a2a-core`: Enhanced event contracts

#### With External Tools

- Tree-sitter parsers for multiple languages
- Vector databases (ChromaDB, Pinecone) for embeddings
- Prometheus for metrics collection
- OpenTelemetry for distributed tracing

### 📝 Success Metrics

1. **Developer Experience**: Time from install to first successful tool execution < 5 minutes
2. **Performance**: 90th percentile response time < 500ms for cached operations
3. **Reliability**: 99.9% uptime in production environments
4. **Frontier Model Adoption**: Support for Claude 4, GPT-4, Gemini Pro
5. **Community Engagement**: GitHub stars > 100, npm downloads > 1k/week

### 🔍 Monitoring & Observability

```typescript
// Comprehensive metrics collection
interface AgentToolkitMetrics {
  toolExecutions: Counter;
  executionDuration: Histogram;
  cacheHitRate: Gauge;
  sessionTokens: Gauge;
  errorRate: Counter;
  mcpConnections: Gauge;
}
```

This TDD plan transforms the agent-toolkit into a world-class tool suitable for frontier AI models while maintaining the architectural principles of Cortex-OS and following established development standards.
