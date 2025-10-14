# @brainwav/telemetry

> **brAInwav Cortex-OS structured telemetry system** providing vendor-neutral agent event emission with privacy-first redaction and seamless A2A integration.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![brAInwav](https://img.shields.io/badge/brAInwav-Powered-purple.svg)](https://brainwav.dev)

## 🚀 Features

- 🔒 **Privacy-First Design** - Configurable redaction removes sensitive data before emission
- 📊 **Vendor-Neutral Schema** - JSON Schema + TypeScript types for maximum interoperability  
- 🚀 **A2A Integration** - Seamless integration with Cortex-OS Agent-to-Agent event system
- 🎯 **Structured Events** - Standardized AgentEvent format for consistent telemetry
- ⚡ **High Performance** - <10ms P95 emission latency with graceful error handling
- 🧪 **Comprehensive Testing** - 95%+ test coverage with TDD methodology
- 🏗️ **Constitutional Compliance** - All functions ≤40 lines, named exports only

## 📦 Installation

```bash
pnpm add @brainwav/telemetry
```

## 🏃 Quick Start

### Basic Usage

```typescript
import { Telemetry, createRedactionFilter } from '@brainwav/telemetry'

// Create telemetry emitter with A2A bus
const telemetry = new Telemetry(bus, {
  topic: 'cortex.telemetry.agent.event',
  redaction: createRedactionFilter()
})

// Emit structured agent events
telemetry.emit({
  event: 'tool_invoked',
  agentId: 'brAInwav-agent-1',
  phase: 'execution',
  correlationId: 'session-123',
  labels: { tool: 'arxiv-search' },
  metrics: { duration_ms: 150 }
})
```

### Workflow Phase Tracking

```typescript
// Track complete workflow phases
const runPhase = telemetry.phase('orchestration-run')

runPhase.started()
// ... workflow execution ...
runPhase.finished({ 
  status: 'success', 
  results: 5,
  brAInwav: 'workflow-complete'
})
```

### Advanced Privacy Configuration

```typescript
import { createAdvancedRedaction } from '@brainwav/telemetry'

const telemetry = new Telemetry(bus, {
  redaction: createAdvancedRedaction({
    removeFields: ['password', 'token'],
    maskFields: ['prompt', 'query', 'input'],
    preserveFields: ['tool', 'brAInwav', 'status']
  })
})
```

## 🔒 Privacy & Security

### Automatic Data Protection

The telemetry system applies **privacy-first redaction** by default:

```typescript
// Input with sensitive data
telemetry.emit({
  event: 'tool_invoked',
  agentId: 'brAInwav-agent',
  labels: {
    prompt: 'sensitive user query',  // ← Will be redacted
    tool: 'search-service',          // ← Safe metadata retained
    user_input: 'confidential data'  // ← Will be redacted
  }
})

// Published event (automatically redacted)
{
  event: 'tool_invoked',
  agentId: 'brAInwav-agent',
  labels: {
    prompt: '[brAInwav-REDACTED]',     // ← Redacted
    tool: 'search-service',            // ← Preserved
    user_input: '[brAInwav-REDACTED]', // ← Redacted
    brAInwav: 'privacy-redacted'       // ← Added context
  }
}
```

### Custom Redaction Policies

```typescript
import { createRedactionFilter, DEFAULT_REDACTION_CONFIG } from '@brainwav/telemetry'

// Customize sensitive field detection
const customRedaction = createRedactionFilter({
  ...DEFAULT_REDACTION_CONFIG,
  sensitiveFields: ['prompt', 'query', 'password', 'api_key', 'credentials'],
  redactionMarker: '[COMPANY-REDACTED]',
  preserveKeys: ['tool', 'status', 'brAInwav', 'operation']
})

const telemetry = new Telemetry(bus, { 
  redaction: customRedaction 
})
```

## 📊 Event Schema

### AgentEvent Structure

```typescript
interface AgentEvent {
  timestamp: string        // ISO-8601 timestamp
  agentId: string         // brAInwav agent identifier
  phase: 'planning' | 'execution' | 'completion'
  event: EventName        // Event type (see below)
  correlationId: string   // For event correlation across workflows
  
  // Optional contextual data
  labels?: Record<string, unknown>    // Metadata (privacy-redacted)
  metrics?: Record<string, unknown>   // Performance measurements
  outcome?: Record<string, unknown>   // Operation results
}
```

### Event Types

| Event | Description | Phase | Use Case |
|-------|-------------|-------|----------|
| `run_started` | Workflow execution started | planning/execution | Orchestration lifecycle |
| `run_finished` | Workflow execution completed | completion | Orchestration lifecycle |
| `plan_created` | Agent plan generated | planning | Planning workflows |
| `plan_revised` | Plan updated/modified | planning | Plan iteration |
| `reroute` | Routing fallback triggered | execution | Error recovery |
| `tool_invoked` | Tool/service invocation | execution | Tool usage tracking |
| `tool_result` | Tool/service response | execution | Tool completion |

### Workflow Phases

- **`planning`** - Plan generation, analysis, and preparation
- **`execution`** - Active workflow execution and tool usage  
- **`completion`** - Finalization, cleanup, and result processing

## 🏗️ Architecture Integration

### A2A Event System Integration

```typescript
// Register telemetry schema in A2A system
import { z } from 'zod'

const CortexOsTelemetryEventSchema = z.object({
  timestamp: z.string().datetime(),
  agentId: z.string(),
  phase: z.enum(['planning', 'execution', 'completion']),
  event: z.enum(['run_started', 'run_finished', 'plan_created', /* ... */]),
  correlationId: z.string(),
  labels: z.record(z.unknown()).optional(),
  metrics: z.record(z.unknown()).optional(),
  outcome: z.record(z.unknown()).optional()
})

registry.registerSchema('cortex.telemetry.agent.event', {
  schema: CortexOsTelemetryEventSchema,
  version: '1.0.0',
  tags: ['telemetry', 'agents', 'brAInwav', 'observability']
})
```

### Orchestration Integration

```typescript
import { Telemetry } from '@brainwav/telemetry'

class OrchestrationFacade {
  private telemetry?: Telemetry

  setTelemetry(telemetry: Telemetry): void {
    this.telemetry = telemetry
  }

  async run(task: Task, agents: Agent[]): Promise<Result> {
    const runPhase = this.telemetry?.phase('orchestration-execution')
    runPhase?.started()
    
    try {
      const result = await this.executeWorkflow(task, agents)
      runPhase?.finished({ 
        status: 'success',
        agents_count: agents.length,
        brAInwav: 'orchestration-complete' 
      })
      return result
    } catch (error) {
      runPhase?.finished({ 
        status: 'error', 
        error: error.message,
        brAInwav: 'orchestration-failed' 
      })
      throw error
    }
  }
}
```

### Runtime Tool Instrumentation

```typescript
// Automatic tool event tracking in runtime
wiring.subscribe('cortex.mcp.tool.execution.started', (envelope) => {
  telemetry.emit({
    event: 'tool_invoked',
    agentId: envelope.payload.session || 'brAInwav-mcp-tool',
    phase: 'execution',
    correlationId: envelope.payload.correlationId,
    labels: {
      tool: envelope.payload.tool,
      brAInwav: 'tool-invocation'
    }
  })
})

wiring.subscribe('cortex.mcp.tool.execution.completed', (envelope) => {
  telemetry.emit({
    event: 'tool_result',
    agentId: envelope.payload.session || 'brAInwav-mcp-tool',
    phase: 'execution',
    correlationId: envelope.payload.correlationId,
    metrics: {
      duration_ms: envelope.payload.durationMs,
      status: envelope.payload.status
    }
  })
})
```

## 🧪 Testing & Development

### Running Tests

```bash
pnpm test                    # Run all tests
pnpm test:coverage          # Run with coverage report
pnpm test -- --watch        # Watch mode for development
```

### Building

```bash
pnpm build                  # Build TypeScript
pnpm typecheck             # Type checking only
pnpm lint                  # Lint code with Biome
```

### Coverage Standards

- **Line Coverage**: ≥95% for changed files
- **Function Coverage**: ≥95%  
- **Branch Coverage**: ≥90%
- **Test Types**: Unit, integration, performance, security

## 🎯 Performance Characteristics

### Benchmarks

- **Event Emission**: <10ms P95 latency for single events
- **Batch Operations**: <50ms for 10 concurrent events
- **Memory Usage**: No memory leaks over 1000+ emission cycles
- **Error Handling**: Graceful degradation without workflow interruption

### Optimization Features

- **Schema Validation Caching**: Reduces repeated validation overhead
- **Object Pool**: Minimizes garbage collection pressure
- **Async Error Handling**: Non-blocking error recovery
- **Lazy Redaction**: Only applied when configured

## 🔧 Configuration Options

### EmitterOpts Interface

```typescript
interface EmitterOpts {
  /** A2A topic for event publishing (default: 'cortex.a2a.events') */
  topic?: string
  
  /** Privacy redaction function (optional) */
  redaction?: (event: AgentEvent) => AgentEvent
}
```

### Environment Variables

```bash
# Optional: Configure default topic via environment
CORTEX_TELEMETRY_TOPIC=cortex.telemetry.agent.event

# Optional: Enable debug logging
CORTEX_TELEMETRY_DEBUG=true
```

## 🤝 Contributing

This package follows **brAInwav development standards**:

### Constitutional Requirements

- 🧪 **TDD Required** - Write failing tests before implementation
- 📏 **Function Size** - Maximum 40 lines per function  
- 📤 **Named Exports** - No default exports allowed
- 🏷️ **brAInwav Branding** - Include in all outputs and errors
- 🔒 **Privacy First** - Redaction required for sensitive data
- 📊 **Coverage** - ≥95% test coverage required

### Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/telemetry-enhancement`
2. **Write Failing Tests**: Follow TDD red-green-refactor cycle
3. **Implement Minimal Code**: Make tests pass with minimal changes
4. **Refactor & Document**: Improve code quality while keeping tests green
5. **Quality Gates**: Ensure linting, type checking, and coverage pass
6. **brAInwav Review**: Submit PR with brAInwav co-authorship

See the root [AGENTS.md](../../AGENTS.md) for complete development guidelines.

## 📜 License

MIT © brAInwav Development Team

## 🔗 Related Projects

- **[Cortex-OS](../cortex-os/)** - brAInwav Agentic Second Brain Runtime
- **[A2A Events](../a2a/)** - Agent-to-Agent Communication System  
- **[Orchestration](../orchestration/)** - LangGraph Workflow Engine
- **[Memory Core](../memory-core/)** - Knowledge Persistence Layer

---

**Powered by brAInwav** | **Built for Cortex-OS** | **Privacy-First by Design**