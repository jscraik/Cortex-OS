# @cortex-os/mcp-bridge

Production-ready bridge for Model Context Protocol (MCP) transport mechanisms, providing stdio ↔ HTTP/SSE bridging with advanced features.

## Features

- **Transport Bridging**: Seamlessly bridge between stdio and HTTP/SSE transports
- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Circuit Breaker**: Automatic circuit breaking for fault tolerance
- **Retry Logic**: Exponential backoff retry mechanism for transient failures
- **Bidirectional Communication**: Full duplex communication support
- **Type Safety**: Full TypeScript support with Zod validation
- **Error Recovery**: Comprehensive error handling and recovery

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

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## License

MIT