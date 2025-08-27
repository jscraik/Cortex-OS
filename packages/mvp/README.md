# MVP Package

**Feature Package** for the ASBR (Autonomous Software Behavior Reasoning) Runtime.

## Overview

This package provides the Minimum Viable Product (MVP) feature implementation for the ASBR Runtime. It contains the core MVP functionality that demonstrates the basic capabilities of the Cortex OS system.

## Architecture

As a **feature package** in the ASBR architecture:

- **Location**: `apps/cortex-os/packages/mvp/` (mounted by ASBR Runtime)
- **Purpose**: MVP feature implementation and core functionality demonstration
- **Communication**: Via A2A events, service interfaces through DI
- **Dependencies**: Shared libraries from `packages/` (a2a, memories, orchestration, etc.)

## Features

- Core MVP functionality demonstration
- Basic agent coordination examples
- Fundamental system capabilities showcase
- Integration with shared services

## Integration with ASBR Runtime

This package is mounted by the ASBR Runtime (`apps/cortex-os/`) and provides:

1. **MVP Services**: Core minimal viable product services
2. **Feature Demonstration**: Shows how features integrate with ASBR
3. **Example Implementations**: Reference implementations for other features
4. **Service Integration**: Demonstrates proper use of shared services

## Communication Patterns

### With Shared Services

- **A2A Broker**: Uses for cross-feature communication
- **Memory Service**: Accesses persistent storage via service interfaces
- **Orchestration**: Coordinates with multi-agent workflows
- **MCP Manager**: Integrates with external tools when needed

### With Other Feature Packages

- **No direct imports** between feature packages
- Uses A2A events for async communication
- Accesses shared services via dependency injection patterns

## Dependencies

- `@cortex-os/a2a` - Agent-to-agent communication
- `@cortex-os/memories` - Persistent storage access
- `@cortex-os/orchestration` - Multi-agent coordination
- `@cortex-os/contracts` - Shared type definitions
- `@cortex-os/telemetry` - Observability and monitoring

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Development mode
pnpm dev
```

## Usage Examples

### Basic Service Integration

```typescript
import { A2ABroker } from '@cortex-os/a2a';
import { MemoryService } from '@cortex-os/memories';

export class MVPService {
  constructor(
    private broker: A2ABroker,
    private memoryService: MemoryService
  ) {}

  async demonstrateFeature(input: string): Promise<string> {
    // Use memory service
    const context = await this.memoryService.retrieveContext(input);

    // Publish A2A event
    await this.broker.publish('mvp.feature.demonstrated', {
      input,
      context,
      timestamp: new Date().toISOString()
    });

    return `MVP feature demonstrated with: ${input}`;
  }
}
```

### Event Handling

```typescript
export class MVPEventHandler {
  constructor(private broker: A2ABroker) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.broker.subscribe('system.startup', this.handleSystemStartup.bind(this));
    this.broker.subscribe('agent.task.completed', this.handleTaskCompletion.bind(this));
  }

  private async handleSystemStartup(event: any) {
    console.log('MVP: System startup detected');
    // MVP-specific startup logic
  }

  private async handleTaskCompletion(event: any) {
    console.log('MVP: Task completion detected', event);
    // Handle task completion in MVP context
  }
}
```

## Testing

The package includes comprehensive tests:

- **Unit Tests**: Test individual MVP components
- **Integration Tests**: Test integration with shared services
- **Feature Tests**: Test complete MVP workflows
- **Event Tests**: Test A2A communication patterns

```bash
# Run all tests
pnpm test

# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:coverage
```

## Best Practices

1. **Service Interface Usage**: Always use shared services via interfaces, not direct imports
2. **Event-Driven Communication**: Use A2A events for loose coupling
3. **Error Handling**: Implement robust error handling and recovery
4. **Resource Management**: Properly manage resources and cleanup
5. **Observability**: Use telemetry for monitoring and debugging

## Integration Points

This package integrates with:

1. **ASBR Runtime**: Mounted as a feature package
2. **A2A Broker**: Event-driven communication
3. **Memory Service**: Persistent storage access
4. **Orchestration Service**: Multi-agent coordination
5. **MCP Manager**: External tool integration

## Configuration

Feature configuration is managed through the ASBR Runtime's dependency injection container. Services are injected at runtime based on configuration.

## Deployment

This package is deployed as part of the ASBR Runtime. No standalone deployment is required - it's mounted by the main application.
