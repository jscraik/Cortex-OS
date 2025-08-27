# MCP Security Implementation - Bug Fixes and Improvements

## Issues Found in Current Implementation

### 1. SSE Transport Implementation Issues

#### Import Problem
```typescript
// Issue: Wrong import path in packages/mcp/mcp-transport/src/sse.ts
import { EventSource } from 'eventsource'; // This is incorrect

// Fix: Should be:
import EventSource from 'eventsource';
```

#### Error Handling Flaws
```typescript
// Issue: Error handling in connect method has undefined reference
eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (messageCallback) {
      messageCallback(data);
    }
  } catch (error) {
    if (errorCallback) {
      errorCallback(error); // errorCallback might not be defined
    }
  }
};

// Fix: Add proper null checks
eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    messageCallback?.(data);
  } catch (error) {
    errorCallback?.(error);
  }
};
```

### 2. HTTPS Transport Implementation Issues

#### Memory Leak in Rate Limiter
```typescript
// Issue: Rate limiter doesn't clean up old entries
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  // No cleanup mechanism for old entries
}

// Fix: Add periodic cleanup
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Add periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }
  
  private cleanup() {
    const now = Date.now();
    const cutoff = now - (2 * this.windowMs); // Keep 2 windows worth of data
    
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(ts => ts > cutoff);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
  
  dispose() {
    clearInterval(this.cleanupInterval);
  }
}
```

#### Missing Error Handling
```typescript
// Issue: No error handling for fetch failures
const res = await fetch(new URL('/mcp', si.endpoint), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: Date.now(), tool: name, params: payload }),
});

// Fix: Add proper error handling
try {
  const res = await fetch(new URL('/mcp', si.endpoint), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: Date.now(), tool: name, params: payload }),
  });
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
} catch (error) {
  throw new Error(`Failed to call tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 3. STDIO Transport Implementation Issues

#### Resource Limits Not Applied
```typescript
// Issue: Resource limits are defined but not applied
const resourceLimits = {
  maxMemory: 512 * 1024 * 1024, // 512MB
  maxCpu: 50, // 50% CPU
  timeout: 30000, // 30 seconds
};

const child: ChildProcess = spawn(si.command, si.args ?? ['stdio'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ...(si.env ?? {}) },
  // resourceLimits not actually applied to the process
});

// Fix: Need to use ulimit or similar mechanisms for actual resource limiting
// Note: Node.js doesn't directly support CPU limiting, would need OS-level controls
```

#### Timeout Cleanup Issues
```typescript
// Issue: Timeout might not be properly cleared in all cases
const dispose = () => {
  clearTimeout(timeoutId);
  child.kill();
};

// Fix: Ensure timeout is cleared in error cases and when process exits normally
const dispose = () => {
  clearTimeout(timeoutId);
  if (!child.killed) {
    child.kill();
  }
};

// Also add listeners to clear timeout on process exit
child.on('exit', () => {
  clearTimeout(timeoutId);
});
```

### 4. Client Implementation Issues

#### Type Safety Problems
```typescript
// Issue: Using 'any' type casting reduces type safety
export function getRateLimitInfo(client: ReturnType<typeof createClient>, toolName: string) {
  if ('getRateLimitInfo' in client) {
    return (client as any).getRateLimitInfo(toolName); // Unsafe cast
  }
  return null;
}

// Fix: Use type guards or proper typing
interface RateLimitAwareClient {
  getRateLimitInfo(toolName: string): { remaining: number; windowMs: number; maxRequests: number };
}

export function getRateLimitInfo(client: ReturnType<typeof createClient>, toolName: string) {
  if (typeof (client as RateLimitAwareClient).getRateLimitInfo === 'function') {
    return (client as RateLimitAwareClient).getRateLimitInfo(toolName);
  }
  return null;
}
```

## Backward Compatibility Code to Remove

### 1. Legacy Configuration Format Handling

File: `packages/mcp/src/mcp-config-storage.ts`
Lines: ~109-125

```typescript
// Remove this entire legacy format handling block:
// Handle legacy format where servers is an object with names as keys
if (rawConfig.servers && !Array.isArray(rawConfig.servers)) {
  // Convert object format to array format
  const serversObject = rawConfig.servers as Record<string, Omit<McpServerConfig, 'name'>>;
  rawConfig.servers = {};

  for (const [name, serverData] of Object.entries(serversObject)) {
    const transportType = this.detectTransportType(serverData);
    rawConfig.servers[name] = {
      ...serverData,
      name,
      type: transportType,
      transport: transportType,
    };
  }
}
```

Reason: This is legacy code to support very old configuration formats. Since we're implementing new functionality, we should require the current format and not maintain backward compatibility with outdated formats.

### 2. Unused Fallback Mode Option

File: `packages/mcp/src/mcp-client.ts`
Lines: 142, 202, 607

```typescript
// Remove all references to fallbackMode:
interface McpClientOptions {
  // ...
  fallbackMode: boolean; // Remove this line
}

// In constructor defaults:
{
  // ...
  fallbackMode: false, // Remove this line
}

// In factory function:
{
  // ...
  fallbackMode: false, // Remove this line
  ...options,
}
```

Reason: The fallbackMode option is defined but never implemented or used anywhere in the codebase. It adds complexity without providing any benefit.

## Improved TDD Development Instructions

### 1. Fixed SSE Transport Implementation

#### Requirements
- Must properly import EventSource
- Must handle all error cases gracefully
- Must provide complete connection lifecycle management

#### Test Cases
```typescript
// Test 1: Valid connection establishment
test('should establish connection with valid endpoint', async () => {
  const client = createSSE({ endpoint: 'https://example.com/sse' });
  await expect(client.connect()).resolves.not.toThrow();
});

// Test 2: Error on duplicate connection
test('should throw error when connecting twice', async () => {
  const client = createSSE({ endpoint: 'https://example.com/sse' });
  await client.connect();
  await expect(client.connect()).rejects.toThrow('Already connected');
});

// Test 3: Proper message handling
test('should handle incoming messages correctly', async () => {
  const client = createSSE({ endpoint: 'https://example.com/sse' });
  const messageHandler = vi.fn();
  client.onMessage(messageHandler);
  
  // Simulate message event
  // ... (mock EventSource behavior)
  
  expect(messageHandler).toHaveBeenCalledWith(expect.any(Object));
});
```

### 2. Enhanced HTTPS Rate Limiter

#### Requirements
- Must clean up old entries to prevent memory leaks
- Must provide accurate rate limit information
- Must handle edge cases gracefully

#### Test Cases
```typescript
// Test 1: Rate limit enforcement
test('should enforce rate limits correctly', () => {
  const limiter = new RateLimiter(1000, 2); // 2 requests per second
  
  expect(limiter.isAllowed('test-key')).toBe(true);
  expect(limiter.isAllowed('test-key')).toBe(true);
  expect(limiter.isAllowed('test-key')).toBe(false); // Should be rate limited
});

// Test 2: Memory cleanup
test('should clean up old entries periodically', async () => {
  const limiter = new RateLimiter(100, 2); // Short window for testing
  
  limiter.isAllowed('test-key');
  expect(limiter.getRemaining('test-key')).toBe(1);
  
  // Wait for window to expire
  await new Promise(resolve => setTimeout(resolve, 150));
  
  expect(limiter.getRemaining('test-key')).toBe(2); // Should be reset
});

// Test 3: Cleanup disposal
test('should clean up resources when disposed', () => {
  const limiter = new RateLimiter(1000, 60);
  limiter.dispose();
  // No specific assertion, but should not throw
});
```

### 3. Improved STDIO Resource Management

#### Requirements
- Must properly manage process lifecycle
- Must handle timeouts correctly
- Must clean up resources on disposal

#### Test Cases
```typescript
// Test 1: Process timeout handling
test('should terminate process after timeout', async () => {
  const client = createStdIo({
    command: 'node',
    args: ['-e', 'setInterval(() => console.log("still running"), 1000)'],
    timeout: 100 // Very short timeout for testing
  } as any);
  
  // Wait for timeout
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const processInfo = client.getProcessInfo();
  expect(processInfo.killed).toBe(true);
});

// Test 2: Proper resource cleanup
test('should clean up resources on dispose', () => {
  const client = createStdIo({
    command: 'node',
    args: ['-e', 'console.log("hello")'],
  } as any);
  
  const processInfoBefore = client.getProcessInfo();
  expect(processInfoBefore.connected).toBe(true);
  
  client.dispose();
  
  const processInfoAfter = client.getProcessInfo();
  expect(processInfoAfter.connected).toBe(false);
  expect(processInfoAfter.killed).toBe(true);
});
```

### 4. Enhanced Type Safety

#### Requirements
- Must eliminate 'any' type casts
- Must provide proper type checking
- Must maintain API compatibility

#### Test Cases
```typescript
// Test 1: Type guard functionality
test('should provide type-safe access to rate limit info', () => {
  const httpsClient = createHTTPS({ endpoint: 'https://example.com' });
  const rateInfo = getRateLimitInfo(httpsClient, 'test-tool');
  
  expect(rateInfo).toHaveProperty('remaining');
  expect(rateInfo).toHaveProperty('windowMs');
  expect(rateInfo).toHaveProperty('maxRequests');
  
  // Test with non-rate-limiting client
  const stdioClient = createStdIo({ command: 'node' } as any);
  const noRateInfo = getRateLimitInfo(stdioClient, 'test-tool');
  expect(noRateInfo).toBeNull();
});

// Test 2: Process info type safety
test('should provide type-safe access to process info', () => {
  const client = createStdIo({ command: 'node' } as any);
  const processInfo = getProcessInfo(client);
  
  expect(processInfo).toHaveProperty('pid');
  expect(processInfo).toHaveProperty('connected');
  expect(processInfo).toHaveProperty('killed');
});
```

## Summary of Changes Required

1. **Fix SSE Transport Import**: Correct EventSource import
2. **Improve Error Handling**: Add proper null checks and error propagation
3. **Enhance Rate Limiter**: Add memory cleanup and proper disposal
4. **Fix Timeout Management**: Ensure proper cleanup in all cases
5. **Improve Type Safety**: Eliminate 'any' casts and add proper type guards
6. **Remove Backward Compatibility**: Remove unused legacy format handling
7. **Remove Dead Code**: Remove unused fallbackMode option

These improvements will make the implementation more robust, maintainable, and secure while eliminating technical debt.