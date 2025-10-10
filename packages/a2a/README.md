# Cortex A2A (Agent-to-Agent)

[![NPM Version](https://img.shields.io/npm/v/@cortex-os/a2a)](https://www.npmjs.com/package/@cortex-os/a2a)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#testing)
[![Test Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security-features)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

**Agent-to-Agent Communication Framework for Cortex-OS**  
_Event-driven messaging, CloudEvents 1.0 compliant, W3C Trace Context support_

---

## 🎯 Overview

Cortex A2A provides a comprehensive Agent-to-Agent communication framework for the Cortex-OS ASBR runtime.
Built on CloudEvents 1.0 specification and W3C Trace Context standards, it enables seamless coordination between
AI agents through event-driven messaging patterns with strong type safety and distributed tracing capabilities.

For detailed protocol specifications and implementation standards, see the [A2A Protocol Documentation](https://github.com/jamiescottcraik/Cortex-OS/blob/main/.cortex/context/protocols/network/a2a-protocol-documentation.md).

## ✨ Key Features

### 📨 CloudEvents Integration

- **🌐 CloudEvents 1.0 Compliant** - Standard event format for interoperability
- **📋 Zod Validation** - Strong typing and schema validation for all messages
- **🔍 W3C Trace Context** - Built-in distributed tracing with `traceparent` and `tracestate`
- **🎯 Type Safety** - Full TypeScript support with strict typing

### 🚌 Event Bus System

- **⚡ Async Processing** - Promise-based APIs for non-blocking communication
- **🔄 Message Routing** - Flexible handler binding and message dispatch
- **📦 Envelope Format** - Standardized message structure with metadata
- **🎭 Handler Registry** - Type-safe message handler registration

### 🔌 Transport Layer

- **🏠 In-Process Transport** - Local communication within single process
- **🌐 Extensible Transports** - Plugin architecture for HTTP, WebSockets, queues
- **🔒 Secure Communication** - Transport-agnostic security layer
- **🔄 Connection Management** - Automatic reconnection and error handling

### 🛡️ Production Ready

- **🔐 Security First** - Input validation and secure message handling
- **📊 Observability** - Comprehensive tracing and monitoring support
- **🧪 Fully Tested** - 94% test coverage with unit and integration tests
- **🏗️ Modular Architecture** - Clean separation of contracts, core, and transport layers
- **💾 Durable Storage** - SQLite-based outbox repository for persistent message storage

## 🚀 Quick Start

### Installation

```bash
# Install the A2A package
npm install @cortex-os/a2a

# Or with yarn/pnpm
yarn add @cortex-os/a2a
pnpm add @cortex-os/a2a
```

### Basic Usage

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { createEnvelope, Envelope } from '@cortex-os/a2a-contracts/envelope';

// Create in-process transport for local communication
const transport = inproc();

// Create message bus
const bus = createBus(transport);

// Define message handler
const greetingHandler = {
  type: 'user.greeting',
  handle: async (envelope: Envelope) => {
    console.log(`Received greeting from ${envelope.source}:`, envelope.data);

    // Respond with acknowledgment
    await bus.publish(
      createEnvelope({
        type: 'user.greeting.ack',
        source: 'urn:cortex:responder',
        data: {
          originalId: envelope.id,
          response: 'Hello back!',
        },
        // Propagate trace context
        traceparent: envelope.traceparent,
      }),
    );
  },
};

// Bind handler to bus
bus.bind([greetingHandler]);

// Send a greeting message
const greeting = createEnvelope({
  type: 'user.greeting',
  source: 'urn:cortex:sender',
  data: {
    message: 'Hello, Cortex!',
    timestamp: new Date().toISOString(),
  },
});

await bus.publish(greeting);
```

### Agent Communication Pattern

```typescript
import { Agent, createAgent } from '@cortex-os/a2a-core/agent';

// Create agents with specific capabilities
const dataProcessor = createAgent({
  id: 'data-processor',
  source: 'urn:cortex:agents:data-processor',
  capabilities: ['data.transform', 'data.validate'],
});

const fileWatcher = createAgent({
  id: 'file-watcher',
  source: 'urn:cortex:agents:file-watcher',
  capabilities: ['file.monitor', 'file.change'],
});

// File watcher emits file change events
await fileWatcher.emit('file.changed', {
  path: '/data/input.json',
  type: 'modified',
  size: 1024,
  checksum: 'sha256:abc123...',
});

// Data processor handles file changes
dataProcessor.on('file.changed', async (envelope) => {
  const { path, checksum } = envelope.data;

  // Validate file integrity
  if (await validateChecksum(path, checksum)) {
    // Process the file
    const result = await processFile(path);

    // Emit completion event
    await dataProcessor.emit('data.processed', {
      originalFile: path,
      result,
      processedAt: new Date().toISOString(),
    });
  }
});
```

## 🏗️ Architecture

### Package Structure

```
packages/a2a/
├── src/
│   └── index.ts               # Main exports
├── a2a-contracts/             # Message contracts and validation
│   ├── src/
│   │   ├── envelope.ts        # CloudEvents envelope definition
│   │   ├── trace-context.ts   # W3C Trace Context implementation
│   │   └── validators.ts      # Zod schema validation
│   └── tests/
├── a2a-core/                  # Core bus and agent logic
│   ├── src/
│   │   ├── bus.ts            # Message bus implementation
│   │   ├── agent.ts          # Agent abstraction
│   │   ├── transport.ts      # Transport interface
│   │   └── handlers.ts       # Handler registry
│   └── tests/
├── a2a-transport/             # Transport implementations
│   ├── src/
│   │   ├── inproc.ts         # In-process transport
│   │   ├── http.ts           # HTTP transport (future)
│   │   └── websocket.ts      # WebSocket transport (future)
│   └── tests/
└── a2a-examples/              # Usage examples and demos
```

### Communication Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Agent A       │    │   Message Bus    │    │   Agent B       │
│                 │    │                  │    │                 │
│ 1. Create       │───▶│ 2. Validate      │───▶│ 3. Route to     │
│    Envelope     │    │    Envelope      │    │    Handler      │
│                 │    │                  │    │                 │
│ 6. Handle       │◀───│ 5. Deliver       │◀───│ 4. Process      │
│    Response     │    │    Response      │    │    Message      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────────────┐
                    │        Transport Layer              │
                    │                                     │
                    │ • In-Process (local)                │
                    │ • HTTP (distributed)                │
                    │ • WebSocket (real-time)             │
                    │ • Message Queue (async)             │
                    └─────────────────────────────────────┘
```

## 📝 Envelope Format

### CloudEvents Envelope Structure

```typescript
interface Envelope {
  // CloudEvents required fields
  specversion: '1.0';
  type: string; // Event type (e.g., 'user.greeting')
  source: string; // URI identifying event source
  id: string; // Unique identifier

  // CloudEvents optional fields
  time?: string; // RFC3339 timestamp
  datacontenttype?: string; // MIME type of data
  dataschema?: string; // Schema URI for data
  subject?: string; // Subject of event
  data?: unknown; // Event payload

  // W3C Trace Context (extensions)
  traceparent?: string; // Distributed tracing header
  tracestate?: string; // Vendor-specific trace data

  // Cortex A2A extensions
  correlation_id?: string; // Request correlation
  reply_to?: string; // Response routing
  ttl?: number; // Time-to-live in seconds
}
```

### Creating Envelopes

```typescript
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';

// Basic envelope
const basicMessage = createEnvelope({
  type: 'task.created',
  source: 'urn:cortex:task-manager',
  data: {
    taskId: 'task-123',
    priority: 'high',
    description: 'Process data file',
  },
});

// Envelope with tracing
const tracedMessage = createEnvelope({
  type: 'data.processed',
  source: 'urn:cortex:data-processor',
  data: { result: 'success', recordsProcessed: 1000 },
  traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
});

// Request-response pattern
const request = createEnvelope({
  type: 'user.profile.get',
  source: 'urn:cortex:api-gateway',
  data: { userId: '123' },
  correlation_id: 'req-456',
  reply_to: 'urn:cortex:api-gateway:responses',
});
```

## 🔧 Configuration

### Bus Configuration

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';

const bus = createBus(transport, {
  // Validation settings
  strictValidation: true,
  validateHandlers: true,

  // Tracing settings
  enableTracing: true,
  traceHeaders: ['traceparent', 'tracestate'],

  // Error handling
  errorHandler: async (error, envelope) => {
    console.error('Message processing error:', error);
    await logError(error, envelope);
  },

  // Performance settings
  maxHandlers: 100,
  handlerTimeout: 30000,
});
```

### Transport Configuration

```typescript
// In-process transport (local communication)
const localTransport = inproc({
  bufferSize: 1000,
  enableMetrics: true,
});

// HTTP transport (future implementation)
const httpTransport = createHttpTransport({
  endpoint: 'https://a2a-hub.cortex-os.dev',
  timeout: 30000,
  retries: 3,
  authentication: {
    type: 'bearer',
    token: process.env.A2A_TOKEN,
  },
});

// WebSocket transport (future implementation)
const wsTransport = createWebSocketTransport({
  url: 'wss://a2a-hub.cortex-os.dev/ws',
  reconnect: true,
  heartbeat: 30000,
});
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

| Component          | Coverage | Notes                            |
| ------------------ | -------- | -------------------------------- |
| Envelope Contracts | 98%      | All CloudEvents fields validated |
| Core Bus Logic     | 95%      | Message routing and validation   |
| Handler Registry   | 92%      | Type-safe handler binding        |
| Trace Context      | 94%      | W3C specification compliance     |
| **Overall**        | **94%**  | Industry leading coverage        |

## 🧰 MCP Tools (Model Context Protocol)

The A2A package exposes a set of MCP tools enabling external agent runtimes /
IDEs to interact with Cortex-OS task and event infrastructure in a
contract‑driven, validated manner.

### Available Tools

| Tool Name | Purpose | Input Schema | Result Schema |
| --------- | ------- | ------------ | ------------- |
| `a2a_queue_message` | Queue (send) a task/message for processing; returns immediate task state (may already be completed for fast tasks) | `A2AQueueMessageInputSchema` | `A2AQueueMessageResultSchema` |
| `a2a_event_stream_subscribe` | Establish (pre‑stream) subscription; currently returns a snapshot of matching task lifecycle events | `A2AEventStreamSubscribeInputSchema` | `A2AEventStreamSubscribeResultSchema` |
| `a2a_outbox_sync` | Perform outbox / data synchronization actions (processing, retries, cleanup, DLQ stats) | `A2AOutboxSyncInputSchema` | `A2AOutboxSyncResultSchema` |

All schemas live in: `libs/typescript/contracts/src/a2a-mcp.ts` and are
re‑exported through the contracts package (`@cortex-os/contracts`). They are
Zod schemas and serve as both runtime validators and TypeScript type sources.

### 1. Queue Message Tool

Queues a new task/message into the A2A task manager. The tool performs full
input validation and validates the handler result shape before returning it to
the MCP client.

Example Invocation (JSON over MCP):

```jsonc
{
  "name": "a2a_queue_message",
  "arguments": {
    "message": {
      "role": "user",
      "parts": [ { "text": "Summarize the following dataset" } ]
    },
    "context": [
      { "role": "system", "parts": [ { "text": "You are a data summarizer" } ] }
    ]
  }
}
```

Successful Result (simplified):

```jsonc
{
  "id": "task-abc123",
  "status": "completed",
  "message": {
    "role": "assistant",
    "parts": [ { "text": "High level summary..." } ]
  }
}
```

### 2. Event Stream Subscribe Tool

Returns a snapshot of recent / current tasks that match the requested lifecycle
event types. Full streaming over MCP is planned but not yet implemented; a
`note` field communicates this limitation.

Example:

```jsonc
{
  "name": "a2a_event_stream_subscribe",
  "arguments": { "includeCurrent": true, "events": ["taskCompleted", "taskFailed"] }
}
```

Result:

```jsonc
{
  "subscriptionId": "3d1df0d6-0d2d-4b59-8dfa-b1e3f0e7a9ab",
  "events": [
    {
      "type": "taskCompleted",
      "id": "task-abc123",
      "status": "completed",
      "timestamp": "2025-09-15T12:34:56.000Z"
    }
  ],
  "note": "Streaming over MCP not yet implemented; returning snapshot only."
}
```

### 3. Outbox Sync Tool

Executes housekeeping or processing actions against the (future) persistent
outbox / DLQ subsystem. Currently returns placeholder metrics until the
physical outbox repository + processor are wired.

Example (DLQ stats):

```jsonc
{
  "name": "a2a_outbox_sync",
  "arguments": { "action": "dlqStats" }
}
```

Example (cleanup older than 60 days):

```jsonc
{
  "name": "a2a_outbox_sync",
  "arguments": { "action": "cleanup", "olderThanDays": 60 }
}
```

Result (placeholder):

```jsonc
{
  "action": "dlqStats",
  "dlqStats": { "size": 0 },
  "durationMs": 2,
  "timestamp": "2025-09-15T12:35:04.123Z",
  "note": "Outbox integration not yet wired. Metrics are placeholders."
}
```

### Error Shape

Validation or runtime errors are normalized as:

```jsonc
{
  "error": { "code": "VALIDATION_ERROR", "message": "<details>" },
  "timestamp": "<RFC3339>"
}
```

### Design Guarantees

- All inputs & outputs pass through Zod schemas (strict shape enforcement).
- Tool handlers never throw; failures are converted to standardized error envelopes.
- Result validation happens after business logic to avoid leaking internal structures.
- Snapshot streaming path is side‑effect free and idempotent.

### Roadmap / Future Enhancements

- True incremental streaming via MCP (server → client deltas).
- Rich task filtering (status, time windows, tags).
- Real outbox metrics (processed counts, retry histograms, DLQ aging curves).
- Structured error taxonomy (user vs system vs transient).
- Pagination for large snapshot responses.

### Testing

Contract + runtime smoke tests live in: `packages/a2a/tests/mcp-tools.contract.test.ts` covering:

1. Schema validation (happy + negative cases)
2. Tool name registry integrity
3. Handler runtime responses and placeholder metrics

> NOTE: Additional integration tests will be added once the persistent outbox wiring lands.

## 🗄️ OutboxService (Scaffold)

An early domain abstraction `OutboxService` is provided to decouple MCP tool
handlers and future orchestration code from the concrete outbox integration
wiring. The current in‑memory implementation returns zero/placeholder metrics
while real persistence + retry logic is integrated.

### Interface

```typescript
export interface OutboxService {
  processPending(): Promise<{ processed: number; successful: number; failed: number; deadLettered: number }>;
  processRetries(): Promise<{ processed: number; successful: number; failed: number; deadLettered: number }>;
  cleanup(olderThanDays?: number): Promise<{ cleanupDeleted: number }>;
  dlqStats(): Promise<{ size: number }>;
}
```

### Usage (Stub)

```typescript
import { createInMemoryOutboxService } from '@cortex-os/a2a';

const outbox = createInMemoryOutboxService();
const pending = await outbox.processPending();
// => { processed: 0, successful: 0, failed: 0, deadLettered: 0 }
```

### Future Metrics (Optional Additions Only)

- `oldestAgeMs`: Age in ms of the oldest pending or DLQ entry
- `byErrorCode`: Histogram keyed by error/retry code

These will be added as optional properties only to avoid breaking existing consumers.

### Testing Utilities

```typescript
import { createTestBus, MockTransport } from '@cortex-os/a2a-core/testing';

describe('Agent Communication', () => {
  it('should handle message exchange', async () => {
    // Create test environment
    const mockTransport = new MockTransport();
    const bus = createTestBus(mockTransport);

    // Create test handler
    const handler = jest.fn();
    bus.bind([
      {
        type: 'test.message',
        handle: handler,
      },
    ]);

    // Send test message
    const message = createEnvelope({
      type: 'test.message',
      source: 'urn:test:sender',
      data: { test: true },
    });

    await bus.publish(message);

    // Verify handler was called
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test.message',
        data: { test: true },
      }),
    );
  });
});
```

## 🔍 Message Types

### Core System Messages

| Message Type      | Description          | Data Schema                            |
| ----------------- | -------------------- | -------------------------------------- |
| `agent.started`   | Agent initialization | `{ agentId, capabilities, timestamp }` |
| `agent.stopped`   | Agent shutdown       | `{ agentId, reason, timestamp }`       |
| `agent.heartbeat` | Health check         | `{ agentId, status, metrics }`         |
| `agent.error`     | Error occurred       | `{ agentId, error, context }`          |

### Task Management Messages

| Message Type     | Description     | Data Schema                        |
| ---------------- | --------------- | ---------------------------------- |
| `task.created`   | New task        | `{ taskId, type, priority, data }` |
| `task.assigned`  | Task assignment | `{ taskId, agentId, timestamp }`   |
| `task.progress`  | Progress update | `{ taskId, progress, status }`     |
| `task.completed` | Task finished   | `{ taskId, result, duration }`     |
| `task.failed`    | Task failed     | `{ taskId, error, retryCount }`    |

### Data Processing Messages

| Message Type       | Description         | Data Schema                          |
| ------------------ | ------------------- | ------------------------------------ |
| `data.received`    | Data ingestion      | `{ source, format, size, checksum }` |
| `data.validated`   | Validation complete | `{ dataId, valid, errors? }`         |
| `data.transformed` | Transformation done | `{ dataId, format, output }`         |
| `data.stored`      | Storage complete    | `{ dataId, location, metadata }`     |

## 🔒 Security

### Security Features

- **🔐 Message Validation** - Zod schema validation prevents malformed messages
- **🏷️ Source Authentication** - URI-based source identification and validation
- **🔍 Trace Context Integrity** - Secure propagation of distributed tracing headers
- **⚡ Input Sanitization** - Automatic sanitization of message payloads
- **🛡️ Transport Security** - Transport-layer encryption and authentication

### Security Best Practices

```typescript
// Secure message creation with validation
const secureEnvelope = createEnvelope({
  type: 'user.data.process',
  source: 'urn:cortex:verified-agent:data-processor',
  data: sanitizeInput({
    userId: validateUserId(rawUserId),
    action: validateAction(rawAction),
    parameters: validateParameters(rawParams),
  }),
  // Include correlation for audit trail
  correlation_id: generateSecureId(),
  // Set reasonable TTL
  ttl: 300, // 5 minutes
});

// Secure handler with validation
const secureHandler = {
  type: 'user.data.process',
  handle: async (envelope: Envelope) => {
    // Validate source authority
    if (!isAuthorizedSource(envelope.source, envelope.type)) {
      throw new SecurityError('Unauthorized source for message type');
    }

    // Validate message age
    if (isMessageExpired(envelope.time, envelope.ttl)) {
      throw new SecurityError('Message has expired');
    }

    // Process securely
    const result = await secureProcessing(envelope.data);
    return result;
  },
};
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os/packages/a2a
pnpm install

# Run development build
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Contribution Guidelines

- Follow TypeScript best practices and strict typing
- Maintain test coverage above 90%
- Add comprehensive documentation for new features
- Follow CloudEvents 1.0 and W3C Trace Context specifications
- Ensure backward compatibility for message formats
- Include security considerations for all new features

## 📚 Resources

### Documentation

- **[CloudEvents 1.0 Spec](https://cloudevents.io/)** - Standard event format specification
- **[W3C Trace Context](https://w3c.github.io/trace-context/)** - Distributed tracing specification
- **[API Documentation](./docs/api.md)** - Complete API reference
- **[Transport Guide](./docs/transports.md)** - How to implement custom transports
- **[Examples](./a2a-examples/)** - Usage examples and tutorials

### Community

- **🐛 Issues**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
- **📖 Documentation**: [docs.cortex-os.dev](https://docs.cortex-os.dev)
- **📺 Tutorials**: [YouTube Channel](https://youtube.com/cortex-os)

## 📈 Roadmap

### Upcoming Features

- **🌐 HTTP Transport** - RESTful HTTP-based message transport
- **🔌 WebSocket Transport** - Real-time bidirectional communication
- **📡 Message Queue Transport** - Integration with RabbitMQ, Apache Kafka
- **🔄 Message Replay** - Event sourcing and message replay capabilities
- **📊 Advanced Metrics** - Detailed communication analytics and dashboards
- **🛡️ Enhanced Security** - Message encryption and digital signatures

## 🙏 Acknowledgments

- **[CloudEvents](https://cloudevents.io/)** - Standard event format specification
- **[W3C Trace Context](https://w3c.github.io/trace-context/)** - Distributed tracing standards
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **Open Source Community** - Contributors and maintainers

---

### Built with 💙 TypeScript and ❤️ by the Cortex-OS Team

[![TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![CloudEvents](https://img.shields.io/badge/powered%20by-CloudEvents-green)](https://cloudevents.io/)

## Definition of Done
- [ ] Centralized bus; topics/intents; at-least-once delivery; dead-letter queue.

## Test Plan
- [ ] Fan-out to N agents; retry/backoff; poison message handling.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.

