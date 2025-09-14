# @cortex-os/mcp-bridge

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-94%25-brightgreen.svg)](coverage)

Production-ready bridge for Model Context Protocol (MCP) transport mechanisms, providing stdio ↔ HTTP/SSE bridging with advanced features.

## Features

- **Transport Bridging**: Seamlessly bridge between stdio and HTTP/SSE transports
- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Circuit Breaker**: Automatic circuit breaking for fault tolerance
- **Retry Logic**: Exponential backoff retry mechanism for transient failures
- **Bidirectional Communication**: Full duplex communication support
- **Type Safety**: Full TypeScript support with Zod validation
- **Error Recovery**: Comprehensive error handling and recovery

## Quick Reference

| Feature | Option / API | Default | Notes |
|---------|--------------|---------|-------|
| Transport | `transport` | `http` | `http` or `sse` (SSE requires `connect()`) |
| Request timeout | `requestTimeoutMs` | unset (no limit) | Applies to HTTP requests, SSE connect, and stdio line forward processing |
| Retries | `retryOptions.{maxRetries,retryDelay,maxDelay}` | `0`, `1000`, `30000` (cap) | Exponential backoff (`retryDelay * 2^attempt`, capped) |
| Circuit breaker | `circuitBreakerOptions.{failureThreshold,resetTimeout}` | disabled | Emits events on state transitions |
| Rate limiting | `enableRateLimiting`, `rateLimitOptions` | disabled | In-memory sliding window (simple timestamp queue) |
| Legacy transport alias | `streamableHttp` | n/a | Prefer `http`; alias kept for backward compatibility across core contracts |

Errors of type `TimeoutError` are thrown only when an operation exceeds `requestTimeoutMs`.

## Installation

```bash
pnpm add @cortex-os/mcp-bridge
```

## Usage

### Basic stdio to HTTP Bridge

```typescript
import { StdioHttpBridge } from '@cortex-os/mcp-bridge';

const bridge = new StdioHttpBridge({
  httpEndpoint: 'http://localhost:8080/mcp',
  enableRateLimiting: true,
  rateLimitOptions: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
});

// Start the bridge
await bridge.start();

// Forward a request
const response = await bridge.forward({
  id: '1',
  method: 'tools.list',
  params: {},
});

// Clean up
await bridge.close();
```

### SSE Transport

```typescript
const sseBridge = new StdioHttpBridge({
  httpEndpoint: 'http://localhost:8080/events',
  transport: 'sse',
  enableRateLimiting: false,
});

// Listen for SSE events
sseBridge.on('event', (data) => {
  console.log('Received SSE event:', data);
});

await sseBridge.connect();
```

### With Circuit Breaker

```typescript
const bridge = new StdioHttpBridge({
  httpEndpoint: 'http://api.example.com/mcp',
  circuitBreakerOptions: {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
  },
  retryOptions: {
    maxRetries: 3,
    retryDelay: 1000,
    maxDelay: 10000,
  },
});
```

### Bidirectional Communication

```typescript
import { createReadStream, createWriteStream } from 'fs';

const bridge = new StdioHttpBridge({
  httpEndpoint: 'http://localhost:8080/mcp',
  stdin: createReadStream('input.jsonl'),
  stdout: createWriteStream('output.jsonl'),
  enableRateLimiting: true,
});

await bridge.start();
```

### Retry & Rate Limiting Configuration

```typescript
const bridge = new StdioHttpBridge({
  httpEndpoint: 'http://api.example.com/mcp',
  retryOptions: {
    maxRetries: 3,        // total attempts = 1 initial + 3 retries
    retryDelay: 250,      // initial backoff
    maxDelay: 5000,       // cap exponential growth
  },
  enableRateLimiting: true,
  rateLimitOptions: {
    maxRequests: 60,
    windowMs: 60_000,     // 1 minute window
  }
});
```

### Request Timeout Examples

HTTP request timeout:

```typescript
import { StdioHttpBridge, TimeoutError } from '@cortex-os/mcp-bridge';

const bridge = new StdioHttpBridge({
  httpEndpoint: 'http://localhost:8080/mcp',
  requestTimeoutMs: 200,
});

try {
  await bridge.forward({ id: '1', method: 'tools.list', params: {} });
} catch (e) {
  if (e instanceof TimeoutError) {
    console.warn('Request exceeded 200ms');
  } else {
    throw e;
  }
}
```

SSE connection timeout:

```typescript
const sse = new StdioHttpBridge({
  httpEndpoint: 'http://localhost:8080/events',
  transport: 'sse',
  requestTimeoutMs: 150,
});
await sse.connect(); // throws TimeoutError if connect handshake stalls
```

### Circuit Breaker Events

When configured, the circuit breaker emits the following events on the bridge instance:

| Event | Meaning | Payload fields |
|-------|---------|----------------|
| `circuit.opened` | Failure threshold reached; further calls short-circuit | `{ type, service, failures, threshold, time }` |
| `circuit.half_open` | Trial state after `resetTimeout` elapsed | same as above |
| `circuit.closed` | Successful trial call closes the circuit | same as above |

Example observer:

```typescript
bridge.on('circuit.opened', e => console.warn('Breaker opened', e));
bridge.on('circuit.half_open', e => console.info('Breaker half-open', e));
bridge.on('circuit.closed', e => console.info('Breaker closed', e));
```

### Distinguishing TimeoutError

`TimeoutError` is only produced when an operation exceeded `requestTimeoutMs`.
Other network, validation, rate limit, or circuit breaker errors will be generic
`Error` instances (with messages like `Rate limit exceeded`, `Circuit breaker is open`,
or `HTTP <status>`). Use `instanceof TimeoutError` to isolate timeout handling logic.

### Backward Compatibility Note

The core transport schema still accepts `streamableHttp` as an alias of `http` for
legacy integrations. This bridge treats them equivalently—prefer specifying `http`
moving forward. Future major versions may drop the alias after a migration window.

## API Reference

### StdioHttpBridge

Main class for bridging stdio and HTTP/SSE transports.

#### Constructor Options

```typescript
interface StdioHttpBridgeOptions {
  httpEndpoint: string;           // HTTP endpoint URL
  transport?: 'http' | 'sse';     // Transport type (default: 'http')
  stdin?: Readable;                // Input stream (default: process.stdin)
  stdout?: Writable;               // Output stream (default: process.stdout)
  enableRateLimiting?: boolean;   // Enable rate limiting
  rateLimitOptions?: {
    maxRequests: number;           // Max requests per window
    windowMs: number;              // Time window in milliseconds
  };
  retryOptions?: {
    maxRetries: number;            // Maximum retry attempts
    retryDelay: number;            // Initial retry delay in ms
    maxDelay?: number;             // Maximum retry delay in ms
  };
  circuitBreakerOptions?: {
    failureThreshold: number;     // Failures before opening circuit
    resetTimeout: number;          // Time before attempting reset in ms
  };
}
```

#### Methods

- `forward(request: JsonRpcRequest): Promise<JsonRpcResponse>` - Forward a JSON-RPC request
- `connect(): Promise<void>` - Connect to SSE endpoint (SSE transport only)
- `start(): Promise<void>` - Start bidirectional communication
- `close(): Promise<void>` - Close the bridge and clean up resources

#### Events

- `event` - Emitted when an SSE event is received (SSE transport only)
- `close` - Emitted when the connection is closed

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Architecture

The bridge follows a layered architecture:

1. **Transport Layer**: Handles HTTP/SSE communication
2. **Rate Limiting Layer**: Controls request throughput
3. **Circuit Breaker Layer**: Provides fault tolerance
4. **Retry Layer**: Handles transient failures
5. **Validation Layer**: Ensures type safety with Zod

## Error Handling

The bridge provides comprehensive error handling:

- **Rate Limit Errors**: Thrown when rate limit is exceeded
- **Circuit Breaker Errors**: Thrown when circuit is open
- **Network Errors**: Automatically retried with exponential backoff
- **Validation Errors**: Thrown for invalid requests/responses

## Performance Considerations

- Rate limiting is performed in-memory for low latency
- Circuit breaker state is maintained per instance
- SSE connections are kept alive with automatic reconnection
- Exponential backoff prevents thundering herd problems

## Security

- Input validation with Zod schemas
- Rate limiting prevents abuse
- No credential storage in memory
- Secure by default with HTTPS support

## Contributing

## Contracts

This bridge consumes the centralized transport contract exported by
`@cortex-os/mcp-core` (`TransportKindSchema`). It does not redefine transport
enums, preventing drift. Circuit breaker observability events follow lightweight
schemas (`circuit.opened`, `circuit.half_open`, `circuit.closed`) embedded in
`stdio-http.ts` and can be promoted to shared contracts later if cross-package
consumption increases.

Extending transports (e.g. fully integrating `ws`) requires:

1. Add new literal to `TransportKindSchema` (additive only).
2. Implement handling in the bridge (`forward`, connection setup, timeout wrapping).
3. Add event/metrics instrumentation if applicable.
4. Update both core & bridge README transport matrices.
5. Provide contract tests covering acceptance and rejection of invalid kinds.

Event evolution: If additional metadata is needed (latency, error codes), new
optional fields should be appended without removing existing required ones to
preserve backward compatibility.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## License

Apache 2.0
