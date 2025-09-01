# Agents Package

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![LangGraph](https://img.shields.io/badge/LangGraph-enabled-orange)](https://langchain-ai.github.io/langgraph/)
[![CrewAI](https://img.shields.io/badge/CrewAI-supported-purple)](https://crewai.com/)
[![AutoGen](https://img.shields.io/badge/AutoGen-supported-red)](https://microsoft.github.io/autogen/)

**Multi-Framework Agent Execution and Management System**

*Feature Package for the ASBR (Autonomous Software Behavior Reasoning) Runtime*

</div>

---

## 🎯 Features

- **🤖 Multi-Framework Support**: Seamless integration with LangGraph, CrewAI, and AutoGen
- **⚡ Asynchronous Execution**: Non-blocking agent task processing with A2A event coordination
- **🔍 Capability Discovery**: Dynamic agent capability registration and discovery
- **📊 Health Monitoring**: Real-time agent health checks and performance metrics
- **🛡️ Governed Memory**: Secure memory management with PII redaction and TTL policies
- **📈 Observability**: Comprehensive telemetry and structured logging
- **🔒 Security**: OWASP-compliant with input validation and secure execution sandboxes
- **🎛️ Deterministic Behavior**: Seed-based reproducible agent responses

## Architecture

As a **feature package** in the ASBR architecture:

- **Location**: `apps/cortex-os/packages/agents/` (mounted by ASBR Runtime)
- **Purpose**: Agent execution interfaces and implementations
- **Communication**: Via A2A events, service interfaces through DI
- **Dependencies**: Shared libraries from `packages/` (orchestration, a2a, memories, etc.)

## Core Interfaces

### Agent Interface

```typescript
export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  execute(task: Task): Promise<AgentResult>;
}
```

### Executor Interface

```typescript
export interface Executor {
  executeTask(task: Task, agent: Agent): Promise<AgentResult>;
  getCapabilities(): string[];
  isHealthy(): boolean;
}
```

## Integration with ASBR Runtime

This package is mounted by the ASBR Runtime (`apps/cortex-os/`) and provides:

1. **Agent Registration**: Register agents with the orchestration system
2. **Task Execution**: Execute tasks through appropriate agent frameworks
3. **Health Monitoring**: Monitor agent health and availability
4. **Capability Discovery**: Expose agent capabilities to the orchestration layer

## Communication Patterns

### With Orchestration Package

- Uses shared interfaces from `packages/orchestration`
- Communicates via A2A events for async coordination
- Provides executors that implement orchestration contracts

### With Other Feature Packages

- **No direct imports** between feature packages
- Uses A2A broker for cross-feature communication
- Accesses shared services via dependency injection

## Dependencies

- `@cortex-os/orchestration` - Shared orchestration interfaces
- `@cortex-os/a2a` - Agent-to-agent communication
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
```

## Integration Points

This package integrates with:

1. **ASBR Runtime**: Mounted as a feature package
2. **Orchestration Service**: Provides agent executors
3. **A2A Broker**: Publishes/subscribes to agent events
4. **Memory Service**: Accesses persistent agent state
5. **MCP Manager**: Integrates with external tools

## Examples

### Registering an Agent

```typescript
import { Agent, Executor } from '@cortex-os/agents';

const myAgent: Agent = {
  id: 'example-agent',
  name: 'Example Agent',
  capabilities: ['text-processing', 'data-analysis'],
  async execute(task) {
    // Agent implementation
    return { success: true, result: 'Task completed' };
  },
};

// Register with orchestration system
await orchestrationService.registerAgent(myAgent);
```

### Implementing an Executor

```typescript
export class LangGraphExecutor implements Executor {
  async executeTask(task: Task, agent: Agent): Promise<AgentResult> {
    // LangGraph-specific execution logic
    return await this.runLangGraphWorkflow(task, agent);
  }

  getCapabilities(): string[] {
    return ['workflow', 'state-management', 'graph-execution'];
  }

  isHealthy(): boolean {
    return this.pythonBridge.isConnected();
  }
}
```

## Best Practices

1. **Interface Compliance**: Always implement the core Agent and Executor interfaces
2. **Error Handling**: Provide robust error handling and recovery mechanisms
3. **Health Monitoring**: Implement proper health checks for external dependencies
4. **Resource Management**: Properly manage resources and cleanup after task execution
5. **Observability**: Use telemetry package for monitoring and debugging

## Testing

- Unit tests for agent interfaces and implementations
- Integration tests with orchestration system
- End-to-end tests with ASBR Runtime
- Health check validation tests

```bash
# Run all tests
pnpm test

# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:coverage
```

# @cortex-os/agents

## Inputs Compliance

- seed: all agents accept an optional `seed: number` to enable deterministic behavior.
- maxTokens: agents enforce `maxTokens <= 4096` and pass this cap to providers.

## Governed Memory and Outbox

- Agents never write to the filesystem directly. Persistence flows through a governed `MemoryStore`.
- Wire via orchestrator:

```ts
const orch = createOrchestrator({
  providers: { primary },
  eventBus,
  mcpClient,
  memoryStore, // e.g., SQLite/Prisma adapter from @cortex-os/memories
  memoryPolicies: {
    'code-analysis': {
      namespace: 'agents:code-analysis',
      ttl: 'PT30M',
      maxItemBytes: 256000,
      redactPII: true,
    },
    security: { namespace: 'agents:security', ttl: 'PT1H', maxItemBytes: 256000, redactPII: true },
  },
  redactPII: true, // default for all capabilities (can be overridden per capability)
});
```

## Event Timestamps and Errors

- All event timestamps are ISO-8601 validated.
- `agent.failed` now includes optional `errorCode` and `status` when available.

## Model Gateway

- MLX provider routes through the Model Gateway HTTP `/chat` endpoint when available (`MODEL_GATEWAY_URL`).
