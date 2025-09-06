# Communication Patterns

Understanding how components communicate in Cortex-OS.

## A2A (Agent-to-Agent) Communication

The A2A system enables async coordination between agents:

### Event Bus Architecture

- **Publisher/Subscriber** pattern for loose coupling
- **Event routing** based on message types and topics
- **Message persistence** for reliability and replay
- **Backpressure handling** for load management

### Message Format

```json
{
  "id": "msg-123",
  "type": "task.execute",
  "source": "orchestrator",
  "target": "code-agent",
  "payload": {
    "task": "generate_function",
    "parameters": { ... }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

## MCP (Model Context Protocol)

MCP provides standardized tool integration:

### Tool Categories

- **File Operations** - Read, write, search files
- **Code Execution** - Run scripts and commands
- **External APIs** - HTTP requests, database queries
- **System Integration** - OS interactions, process management

### Protocol Flow

1. **Tool Discovery** - Client queries available tools
2. **Tool Invocation** - Client requests tool execution
3. **Result Streaming** - Server streams responses
4. **Error Handling** - Standardized error responses

## Service Interfaces

Synchronous communication through DI-registered services:

### Memory Service

```typescript
interface MemoryService {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  search(query: string): Promise<SearchResult[]>;
}
```

### Orchestration Service

```typescript
interface OrchestrationService {
  executeWorkflow(workflow: Workflow): Promise<WorkflowResult>;
  getStatus(workflowId: string): Promise<WorkflowStatus>;
}
```

## Security Considerations

- **Message validation** using Zod schemas
- **Authentication** for agent identity verification
- **Authorization** for capability-based access control
- **Audit logging** for all communications

## Next Steps

- [Agents](./agents) - Learn about agent types
- [Architecture Overview](./overview) - Full system design
