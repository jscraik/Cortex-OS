# W3C Trace Context Implementation

This document describes the W3C Trace Context implementation for the Cortex-OS A2A (Agent-to-Agent) messaging system, enabling distributed tracing across microservices and agents.

## Overview

The W3C Trace Context specification provides a standard for propagating trace context across service boundaries. This implementation adds distributed tracing capabilities to A2A envelopes and the message bus.

## Features

- **W3C Trace Context Headers**: Support for `traceparent`, `tracestate`, and `baggage` headers
- **Automatic Context Propagation**: Trace context is automatically propagated through message chains
- **Async Context Management**: Thread-safe context propagation using Node.js AsyncLocalStorage
- **Child Span Creation**: Automatic creation of child spans for related operations
- **Baggage Support**: Propagation of custom metadata across service boundaries

## Envelope Schema Extensions

The A2A envelope has been extended with W3C Trace Context fields:

```typescript
interface Envelope {
  // ... existing fields ...

  // W3C Trace Context headers
  traceparent?: string; // W3C traceparent header
  tracestate?: string; // W3C tracestate header
  baggage?: string; // W3C baggage header
}
```

## Usage

### Creating Messages with Trace Context

```typescript
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import { createTraceContext, addBaggage } from '@cortex-os/a2a-contracts/trace-context';

// Create a trace context
const traceContext = createTraceContext();
const contextWithBaggage = addBaggage(traceContext, 'user.id', 'user123');

// Create envelope with trace context
const envelope = createEnvelope({
  type: 'order.created.v1',
  source: '/order-service',
  data: { orderId: 'ORD-001', amount: 99.99 },
  traceparent: `00-${contextWithBaggage.traceId}-${contextWithBaggage.spanId}-${contextWithBaggage.traceFlags.toString(16)}`,
  tracestate: contextWithBaggage.traceState,
  baggage: contextWithBaggage.baggage,
});
```

### Publishing Messages

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';

const bus = createBus(transport);

// Messages published without trace context will have one automatically created
await bus.publish(envelope);

// The bus automatically ensures trace context is present
```

### Handling Messages with Trace Context

```typescript
import { getCurrentTraceContext } from '@cortex-os/a2a-core/trace-context-manager';

const handlers = [
  {
    type: 'order.created.v1',
    handle: async (msg) => {
      // Access current trace context within handler
      const traceContext = getCurrentTraceContext();
      console.log('Current trace:', traceContext?.traceId);

      // Create child message with propagated context
      const childMsg = bus.createChildMessage(msg, {
        type: 'payment.processed.v1',
        source: '/payment-service',
        data: { orderId: msg.data.orderId },
      });

      await bus.publish(childMsg);
    },
  },
];

await bus.bind(handlers);
```

## Trace Context Utilities

### Creating Trace Contexts

```typescript
import { createTraceContext, createChildSpan } from '@cortex-os/a2a-contracts/trace-context';

// Create new trace context
const context = createTraceContext({
  traceId: 'custom-trace-id', // optional
  spanId: 'custom-span-id', // optional
  traceFlags: 1, // 1 = sampled
});

// Create child span
const childContext = createChildSpan(context);
```

### Working with Baggage

```typescript
import { addBaggage, getBaggage } from '@cortex-os/a2a-contracts/trace-context';

// Add baggage items
let context = createTraceContext();
context = addBaggage(context, 'user.id', 'user123');
context = addBaggage(context, 'session.id', 'session456');

// Retrieve baggage
const userId = getBaggage(context, 'user.id'); // 'user123'
```

### Trace State Management

```typescript
import { addTraceState, getTraceState } from '@cortex-os/a2a-contracts/trace-context';

// Add vendor-specific trace state
let context = createTraceContext();
context = addTraceState(context, 'vendor1', 'value1');
context = addTraceState(context, 'vendor2', 'value2');

// Retrieve trace state
const vendor1State = getTraceState(context, 'vendor1'); // 'value1'
```

## Context Propagation

### Automatic Propagation

The A2A bus automatically handles trace context propagation:

1. **Incoming Messages**: Trace context is extracted and set in AsyncLocalStorage
2. **Handler Execution**: Handlers execute within the trace context
3. **Outgoing Messages**: Child spans are created for new messages
4. **Context Cleanup**: Context is automatically cleaned up after handler execution

### Manual Context Management

For advanced use cases, you can manually manage trace context:

```typescript
import { withTraceContext, ensureTraceContext } from '@cortex-os/a2a-core/trace-context-manager';

// Execute with specific context
await withTraceContext(traceContext, async () => {
  // This code runs within the specified trace context
  await bus.publish(message);
});

// Ensure context exists (creates default if needed)
await ensureTraceContext(async () => {
  // This code has a trace context
  const context = getCurrentTraceContext();
});
```

## Integration with Observability

The trace context integrates seamlessly with observability tools:

```typescript
import { getCurrentTraceContext } from '@cortex-os/a2a-core/trace-context-manager';

// In your handlers, you can extract trace context for logging/metrics
const handler = {
  type: 'order.created.v1',
  handle: async (msg) => {
    const traceContext = getCurrentTraceContext();

    // Add to logs
    logger.info('Processing order', {
      traceId: traceContext?.traceId,
      spanId: traceContext?.spanId,
      orderId: msg.data.orderId,
    });

    // Add to metrics
    metrics.increment('orders.processed', {
      traceId: traceContext?.traceId,
    });
  },
};
```

## Best Practices

1. **Always Propagate Context**: Use `bus.createChildMessage()` for related operations
2. **Keep Baggage Minimal**: Only include essential metadata in baggage
3. **Use Meaningful Span Names**: Create child spans for distinct operations
4. **Handle Missing Context**: Use `ensureTraceContext()` for defensive programming
5. **Monitor Sampling**: Respect the sampling decision in trace flags

## Example Application

See `packages/a2a/a2a-examples/trace-context-example.ts` for a complete working example demonstrating:

- Creating messages with trace context
- Automatic context propagation through message chains
- Handler execution within trace context
- Child message creation with propagated context
- Baggage and trace state usage

## Running the Example

```bash
cd packages/a2a/a2a-examples
npx ts-node trace-context-example.ts
```

This will demonstrate a complete order fulfillment workflow with proper trace context propagation across all services.
