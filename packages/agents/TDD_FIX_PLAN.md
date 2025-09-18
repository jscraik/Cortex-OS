# TDD Fix Plan for Agents Package

## Overview
This plan follows Test-Driven Development principles to fix critical issues identified in the code review. We'll write failing tests first, then implement fixes.

## Phase 1: Core Infrastructure Fixes

### 1.1 Fix EventBus Implementation
**Test First**: `__tests__/event-bus.test.ts`
```typescript
import { EventBus } from '../src/lib/event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  test('should publish and receive events', () => {
    const handler = jest.fn();
    eventBus.subscribe('test.event', handler);

    eventBus.publish('test.event', { data: 'test' });

    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });

  test('should handle multiple subscribers', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    eventBus.subscribe('test.event', handler1);
    eventBus.subscribe('test.event', handler2);

    eventBus.publish('test.event', { data: 'test' });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
```

**Implementation**: Create real EventBus in `src/lib/event-bus.ts`

### 1.2 Fix Memory Store TTL
**Test First**: `__tests__/memory-store-ttl.test.ts`
```typescript
describe('MemoryStore TTL', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = createInMemoryStore();
  });

  test('should expire entries after TTL', async () => {
    const memory: Memory = {
      id: 'test1',
      kind: 'test',
      text: 'test',
      ttl: 'PT1S', // 1 second
      createdAt: new Date().toISOString(),
    };

    await store.upsert(memory);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    const result = await store.get('test1');
    expect(result).toBeNull();
  });
});
```

**Implementation**: Fix TTL parsing in `src/store/memory-store.ts`

### 1.3 Fix MLX Provider Interface
**Test First**: `__tests__/mlx-provider.test.ts`
```typescript
describe('MLX Provider', () => {
  test('should implement ModelProvider interface', () => {
    const provider = createMLXProvider({
      model: 'test-model',
      device: 'cpu'
    });

    expect(provider.name).toBe('mlx:test-model');
    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.isAvailable).toBe('function');
    expect(typeof provider.shutdown).toBe('function');
  });
});
```

**Implementation**: Fix MLX provider to be concrete class, not abstract

## Phase 2: Remove Backward Compatibility

### 2.1 Deprecate Old Model Router
**Test First**: `__tests__/model-router-deprecation.test.ts`
```typescript
// Test that old imports show deprecation warning
test('old model router should show deprecation warning', () => {
  const consoleSpy = jest.spyOn(console, 'warn');

  // This should trigger a deprecation warning
  import('../src/utils/modelRouter');

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('DEPRECATED')
  );
});
```

**Implementation**: Add deprecation warnings, then remove in next major version

### 2.2 Migrate to LangGraph Only
**Test First**: `__tests__/langgraph-migration.test.ts`
```typescript
describe('LangGraph Migration', () => {
  test('should migrate old subagents to LangGraph workflows', () => {
    // Test that old subagent functionality is available via LangGraph
    const workflowEngine = createLangGraphWorkflow([], 10);

    expect(workflowEngine).toBeDefined();
    expect(typeof workflowEngine.execute).toBe('function');
  });
});
```

**Implementation**: Create LangGraph wrappers for old subagent functionality

## Phase 3: Performance & Security

### 3.1 Memory Limits for Outbox
**Test First**: `__tests__/outbox-memory.test.ts`
```typescript
describe('Outbox Memory Limits', () => {
  test('should enforce memory limits', async () => {
    const store = createInMemoryStore();
    const bus = createEventBus();

    // Wire outbox with small memory limit
    await wireOutbox(bus, store, {
      maxItemBytes: 100, // Very small limit
    });

    // Large event should be truncated
    bus.publish('test.large', { data: 'x'.repeat(200) });

    const events = await store.searchByText({ topK: 1 }, 'agents:outbox');
    expect(events[0].text.length).toBeLessThan(150);
  });
});
```

**Implementation**: Add memory limit enforcement to outbox

### 3.2 Improved PII Redaction
**Test First**: `__tests__/pii-redaction.test.ts`
```typescript
describe('PII Redaction', () => {
  test('should redact email addresses', () => {
    const text = 'Contact user@example.com for support';
    const redacted = redactPII(text);
    expect(redacted).not.toContain('user@example.com');
    expect(redacted).toContain('[REDACTED]');
  });

  test('should redact phone numbers', () => {
    const text = 'Call 555-123-4567 for help';
    const redacted = redactPII(text);
    expect(redacted).not.toContain('555-123-4567');
  });
});
```

**Implementation**: Enhance PII redaction patterns

## Test Command Structure
```bash
# Run tests for specific fixes
npm test -- --testNamePattern="EventBus"
npm test -- --testNamePattern="MemoryStore.TTL"
npm test -- --testNamePattern="MLX.Provider"

# Run all phase tests
npm test -- --testNamePattern="Phase1"
npm test -- --testNamePattern="Phase2"
npm test -- --testNamePattern="Phase3"
```

## Implementation Order
1. Write failing test (red)
2. Implement minimal fix (green)
3. Refactor (clean)
4. Commit with test
5. Repeat

## Success Criteria
- All tests pass
- No mock implementations in production code
- Real MLX integration working
- No backward compatibility code without deprecation warnings
- Performance and security tests in place