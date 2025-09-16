# A2A Quick Start Guide

## Overview

This guide provides step-by-step instructions for setting up the native A2A communication system. A2A (Agent-to-Agent) is a CloudEvents 1.0 compliant messaging system that enables communication between agents using event-driven architecture.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Cortex-OS project cloned
- Basic understanding of TypeScript and event-driven architecture

## Step 1: Install Dependencies

```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm install
```

## Step 2: Build A2A Packages

```bash
cd packages/a2a
pnpm build

cd ../a2a-services
pnpm build
```

## Step 3: Basic Native A2A Setup

### Create a Simple Publisher

Create a file `examples/a2a-publisher.ts`:

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';

async function runPublisher() {
  // Create bus with in-process transport
  const bus = createBus(inproc());
  
  // Create a simple message
  const message = createEnvelope({
    type: 'example.message.v1',
    source: 'urn:example:producer',
    data: {
      text: 'Hello from A2A!',
      timestamp: new Date().toISOString()
    }
  });
  
  // Publish the message
  await bus.publish(message);
  console.log('Message published:', message.id);
}

runPublisher().catch(console.error);
```

### Create a Simple Consumer

Create a file `examples/a2a-consumer.ts`:

```typescript
import { createBus, type Handler } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

async function runConsumer() {
  // Create bus with in-process transport
  const bus = createBus(inproc());
  
  // Define message handler
  const handler: Handler = {
    type: 'example.message.v1',
    handle: async (message) => {
      console.log('Received message:', message);
      console.log('Message data:', message.data);
    }
  };
  
  // Bind handler to bus
  await bus.bind([handler]);
  console.log('Consumer listening for messages...');
}

runConsumer().catch(console.error);
```

## Step 4: Run the Example

1. First, start the consumer:

```bash
cd /Users/jamiecraik/.Cortex-OS
npx tsx examples/a2a-consumer.ts
```

2. In another terminal, run the publisher:

```bash
cd /Users/jamiecraik/.Cortex-OS
npx tsx examples/a2a-publisher.ts
```

## Step 5: Advanced Configuration

### Using File System Queue Transport

For persistent messaging, use the file system queue transport:

```typescript
import { fsQueue } from '@cortex-os/a2a-transport/fsq';

const bus = createBus(fsQueue('my-queue'));
```

### Adding Schema Validation

Create a schema registry for message validation:

```typescript
import { z } from 'zod';
import { createSchemaRegistry } from '@cortex-os/a2a-core/schema-registry';

const messageSchema = z.object({
  text: z.string(),
  timestamp: z.string().datetime()
});

const schemaRegistry = createSchemaRegistry();
schemaRegistry.register('example.message.v1', messageSchema);

const bus = createBus(inproc(), undefined, schemaRegistry);
```

### Configuring Topic ACLs

Add security with topic access control:

```typescript
const acl = {
  'example.message.v1': {
    publish: true,
    subscribe: true
  },
  'sensitive.message.v1': {
    publish: false,
    subscribe: true
  }
};

const bus = createBus(inproc(), undefined, undefined, acl);
```

## Step 6: Service Registry Setup

### Register a Service

```typescript
import { createServiceRegistry } from '@cortex-os/a2a-services/registry';

const registry = createServiceRegistry();

await registry.registerService({
  name: 'example-service',
  version: '1.0.0',
  endpoint: 'http://localhost:3000',
  metadata: {
    description: 'Example A2A service',
    capabilities: ['example-capability']
  }
});
```

### Discover a Service

```typescript
const service = await registry.discoverService({
  capability: 'example-capability'
});

console.log('Discovered service:', service);
```

## Testing the Setup

### Run Unit Tests

```bash
cd /Users/jamiecraik/.Cortex-OS/packages/a2a
pnpm test

cd ../a2a-services
pnpm test
```

### Run Integration Tests

```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm test --filter a2a
pnpm test --filter a2a-services
```

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure all dependencies are installed with `pnpm install`
2. **Transport not working**: Check that the transport directory is writable (for fsq)
3. **Schema validation failures**: Verify that message data matches the registered schema
4. **Permission denied**: Check ACL configuration for topic access

### Debugging Tips

1. Enable verbose logging by setting environment variables:

```bash
export DEBUG=a2a:*
```

2. Check message flow with trace context:

```bash
export TRACE_CONTEXT=enabled
```

## Next Steps

1. **Explore A2A Examples**: Check the `packages/a2a/a2a-examples/` directory for more complex examples
2. **Implement Custom Transports**: Create your own transport mechanisms for specific needs
3. **Add Monitoring**: Integrate with observability tools for production monitoring
4. **Set up MCP Bridge**: Follow the MCP integration documentation to expose A2A functionality through MCP tools

## Additional Resources

- [A2A Architecture Documentation](file:///Users/jamiecraik/.Cortex-OS/project-documentation/A2A_ARCHITECTURE_AND_MCP_INTEGRATION.md)
- [A2A Native and MCP Bridge Setup Plan](file:///Users/jamiecraik/.Cortex-OS/project-documentation/A2A_NATIVE_AND_MCP_BRIDGE_SETUP_PLAN.md)
- [A2A Core Package Documentation](file:///Users/jamiecraik/.Cortex-OS/packages/a2a/README.md)
- [A2A Services Package Documentation](file:///Users/jamiecraik/.Cortex-OS/packages/a2a-services/README.md)

This quick start guide should get you up and running with the native A2A communication system. The system is designed to be flexible and can be extended with custom transports, validation schemas, and security configurations as needed.
