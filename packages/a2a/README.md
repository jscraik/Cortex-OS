# A2A (Agent-to-Agent) Protocol

A lightweight, extensible protocol for agent-to-agent communication, built on modern standards like CloudEvents and W3C Trace Context.

## Overview

The A2A package provides a foundational framework for agents to communicate with each other. It is designed with a clean, layered architecture that separates message contracts, core bus logic, and transport mechanisms. This allows for flexibility and extensibility.

The core of the protocol is the `Envelope`, a message format compliant with the CloudEvents 1.0 specification. This ensures that messages are structured, portable, and interoperable. The system also integrates W3C Trace Context headers, enabling distributed tracing across agent interactions.

## Core Concepts

- **Contracts (`a2a-contracts`)**: Defines the shape of messages using `Zod` for strong validation. The `Envelope` is the primary data structure, conforming to the CloudEvents v1.0 spec.
- **Core Bus (`a2a-core`)**: The central `Bus` orchestrates message validation, schema checking, and trace context propagation. It is decoupled from the underlying communication mechanism via a `Transport` interface.
- **Transports (`a2a-transport`)**: Concrete implementations of the `Transport` interface responsible for actually sending and receiving messages. The framework includes a simple `in-process` transport for local communication. Custom transports (e.g., for HTTP, WebSockets, or message queues) can be implemented to extend the system.

## Features

- ✅ **CloudEvents 1.0 Compliant**: Messages are structured as CloudEvents, ensuring interoperability.
- ✅ **Zod-based Validation**: Message envelopes are strongly typed and validated using Zod schemas.
- ✅ **W3C Trace Context Support**: Built-in support for `traceparent` and `tracestate` headers for distributed tracing.
- ✅ **Extensible Transport Layer**: A simple `Transport` interface allows developers to plug in different communication backends.
- ✅ **Asynchronous API**: The entire API is asynchronous, built on Promises.
- ✅ **Type-Safe**: The codebase is written in TypeScript, providing type safety for developers.

## Quick Start

Here's how to set up a simple in-process message bus.

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { createEnvelope, Envelope } from '@cortex-os/a2a-contracts/envelope';

// 1. Create a transport
const transport = inproc();

// 2. Create a message bus
const bus = createBus(transport);

// 3. Define a handler for a specific message type
const myHandler = {
  type: 'greeting',
  handle: async (message: Envelope) => {
    console.log(`Received message:`, message.data);
  },
};

// 4. Bind the handler to the bus
bus.bind([myHandler]);

// 5. Create and publish a message
const greetingMessage = createEnvelope({
  type: 'greeting',
  source: 'urn:my-agent:sender',
  data: { text: 'Hello, world!' },
});

bus.publish(greetingMessage);
```

This example demonstrates a simple loopback communication within a single process. For communication between different processes or machines, you would need to implement a custom `Transport` that uses a network protocol like HTTP or a message queue.

## Architecture

The A2A protocol is built on a clean, layered architecture:

1.  **Contracts Layer (`a2a-contracts`)**: Defines the message structure (`Envelope`) and validation rules.
2.  **Core Layer (`a2a-core`)**: Provides the central `Bus` and the abstract `Transport` interface.
3.  **Transport Layer (`a2a-transport`)**: Provides concrete implementations of the `Transport` interface.

This separation of concerns makes the system modular and easy to extend.

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

The test suite includes:

- Unit tests for core components.
- Integration tests for cross-component functionality.

## Migration Note

The `Envelope` contract now requires a valid URI for the `source` field. Invalid sources will throw a validation error instead of using a fallback.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
