# A2A Native Communication Implementation for Cortex-OS

## Overview

This document describes the implementation of A2A (Agent-to-Agent) native communication for the cortex-os application. The implementation replaces the previous mock A2A implementation with a real A2A core integration using the same patterns established in other Cortex-OS applications.

## Implementation Details

### A2A Module Structure

The implementation consists of a new A2A module (`src/a2a.ts`) that provides:

1. **Event Schemas** - Zod schemas for validating A2A events
2. **Schema Registry** - Registration of event schemas with backward compatibility
3. **Bus Creation** - Factory function for creating the A2A bus with proper configuration
4. **Access Control** - Topic ACL for controlling publish/subscribe permissions

### Key Components

#### Event Schemas

The module defines schemas for common cortex-os events:

- `CortexOsHealthEventSchema` - For health check events
- `CortexOsMcpEventSchema` - For MCP events and tool executions
- `CortexOsConfigEventSchema` - For configuration change events
- `CortexOsServiceEventSchema` - For service lifecycle events

#### Schema Registry

The `createCortexOsSchemaRegistry()` function creates a schema registry with all the cortex-os event schemas registered with proper metadata and examples.

#### Bus Creation

The `createCortexOsBus()` function creates an A2A bus with:

- In-process transport by default
- Schema validation using the cortex-os schema registry
- Access control using topic ACL
- Configurable bus options

### Integration with Boot Process

The `src/boot/a2a.ts` file has been updated to use the real A2A core instead of the mock implementation:

1. **wireA2A()** - Now creates a real A2A bus using `createCortexOsBus()`
2. **publish()** - Now publishes events to the real A2A bus using CloudEvents 1.0 format
3. **publishMcp()** - Now publishes MCP events to the real A2A bus when telemetry is enabled

### Communication Pattern

The cortex-os implementation follows the same pattern as other Cortex-OS applications:

1. Uses `createBus` from `@cortex-os/a2a-core/bus`
2. Implements proper publish/subscribe patterns with A2A core
3. Has envelope validation and type safety
4. Uses TopicACL for access control
5. Follows CloudEvents 1.0 specification

### Dependencies Added

The following dependencies were added to support the A2A implementation:

```json
{
  "@cortex-os/a2a-core": "workspace:*",
  "@cortex-os/a2a-transport": "workspace:*",
  "@cortex-os/a2a-contracts": "workspace:*"
}
```

## Usage Examples

### Publishing Events

```typescript
const { publish } = wireA2A();

// Publish a health check event
await publish('cortex.health.check', { 
  status: 'healthy', 
  timestamp: Date.now() 
});

// Publish an MCP event
await publish('cortex.mcp.event', { 
  type: 'system.status',
  payload: { services: [] }
});
```

### Publishing MCP Events

```typescript
const { publishMcp } = wireA2A();

if (publishMcp) {
  await publishMcp({
    type: 'system.status',
    payload: { services: [] }
  });
}
```

## Event Types

The implementation supports the following event types:

1. **cortex.health.check** - Health check events
2. **cortex.mcp.event** - MCP events and tool executions
3. **cortex.config.change** - Configuration change events
4. **cortex.service.status** - Service lifecycle events

## Testing

The implementation includes updated tests that work with the real A2A bus:

```typescript
test('health events route to handler', async () => {
  const { bus } = wireA2A();
  const spy = vi.spyOn(healthHandler, 'handle');
  
  // Create a proper CloudEvents envelope for the real A2A bus
  const envelope = {
    specversion: '1.0',
    id: 'test-id',
    source: 'test-source',
    type: 'cortex.health.check',
    time: new Date().toISOString(),
    data: {},
    datacontenttype: 'application/json',
  };
  
  await bus.publish(envelope);
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
```

## Future Improvements

1. **Event Handlers** - Implement more sophisticated event handlers for different event types
2. **Error Recovery** - Add better error recovery and retry mechanisms
3. **Performance Optimization** - Optimize the bus communication for high-throughput scenarios
4. **Security** - Add message validation and security features

## Conclusion

This implementation brings cortex-os in line with other Cortex-OS applications by providing full A2A native communication capabilities. The real A2A core integration allows seamless communication between cortex-os and other services in the Cortex-OS ecosystem.
