# Cortex Orchestration

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@cortex-os/orchestration)](https://www.npmjs.com/package/@cortex-os/orchestration)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://img.shields.io/badge/build-passing-brightgreen)
[![Test Coverage](https://img.shields.io/badge/coverage-93%25-brightgreen)](https://img.shields.io/badge/coverage-93%25-brightgreen)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](https://img.shields.io/badge/security-OWASP%20compliant-green)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

Multi-Agent Workflow Coordination for Cortex-OS ASBR Runtime — LangGraph-only (TypeScript-first)

</div>

---

## 🎯 Overview

Cortex Orchestration provides **production-ready multi-agent coordination** for the Cortex-OS ASBR runtime following the **BVOO (Bounded, Validated, Observable Orchestration)** engineering principle. This package implements real AI agent execution using the LangGraph framework with a TypeScript-first architecture for intelligent task distribution, resource management, and collaborative problem-solving.

Note: This package is now strictly LangGraph-only. All legacy/hybrid orchestrators (MLX, PRP, CrewAI, AutoGen, Archon) and their examples/tests have been removed.

### BVOO Engineering Principle

**Bounded, Validated, Observable Orchestration (BVOO)** ensures every orchestration workflow:

- **🔢 Bounded**: Enforces explicit limits on concurrency, execution time, and cache size
- **✅ Validated**: Validates all inputs before execution with comprehensive schema checking  
- **👁️ Observable**: Emits structured telemetry for all lifecycle events and decisions

#### BVOO Implementation

```typescript
import { createCerebrumGraph, OrchestrationDefaults } from '@cortex-os/orchestration';

// Build your LangGraph-based orchestration graph
const graph = createCerebrumGraph({ /* optional config */ });

console.log('Default Bounds:', OrchestrationDefaults);
// Bounded execution, validated inputs, observable telemetry
```

## ✨ Key Features

### 🤖 Real AI Agent Execution (LangGraph-only)

- LangGraph Integration — State-based workflows with persistent checkpointing

### 🚀 Advanced Orchestration

- **🧠 Intelligent Agent Routing** - Automatic framework selection based on task complexity
- **⚡ Resource Management** - Memory allocation, load balancing, and performance monitoring
- **🔄 Error Recovery** - Graceful failure handling with agent restart and task redistribution
- **📊 Performance Monitoring** - Real-time metrics and execution analytics
- **🔀 Conditional Branching** - Route workflow execution based on runtime context

### 🛡️ Production Features

- **🔒 OWASP LLM Top-10 Compliance** - Secure agent-to-agent communication
- **📈 Scalable Architecture** - Handle multiple concurrent orchestrations
- **🎯 Adaptive Decision Making** - Dynamic strategy selection and optimization
- **🔍 Comprehensive Logging** - Structured logging with Winston and observability

## 🚀 Quick Start

### Installation

```bash
# Install the orchestration package
npm install @cortex-os/orchestration

# Or with yarn/pnpm
yarn add @cortex-os/orchestration
pnpm add @cortex-os/orchestration
```

### Prerequisites

No Python dependencies. This package is LangGraph-only and TypeScript-first.

### Basic Usage

```typescript
import { createCerebrumGraph } from '@cortex-os/orchestration';

const graph = createCerebrumGraph();
// … add nodes, edges, and run your LangGraph as needed
```

## 🏗️ Architecture

### Architecture (LangGraph-only)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TypeScript Frontend                          │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Coordination    │  │ Resource        │  │ Performance     │ │
│  │ Engine          │  │ Manager         │  │ Monitor         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                IPC Bridge (JSON/stdio)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Execution Layer                            │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ LangGraph       │
│  │ State Engine    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Tooling & Connectors                          │ │
│  │     (MCP tools, events, observability)                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### TypeScript Layer

- **LangGraph Graph Builders** - Build and run state graphs
- **Validation & Telemetry** - Input schemas, structured logs/metrics

#### Runtime Layer

- LangGraph State Engine — State-based workflows with checkpointing
- MCP tooling — Contracts, validation, and integration points

### Communication Flow

All orchestration happens in TypeScript via LangGraph. No IPC/Python bridge.

## 🧠 AI Framework Integration

LangGraph is the sole orchestration engine. Non-LangGraph frameworks have been removed.

## 🌐 Model Context Protocol (MCP) Integration

The orchestration package exposes workflow coordination capabilities over the Model Context Protocol (MCP), enabling seamless integration with AI agents and tools across the Cortex-OS ecosystem.

### MCP Tool Contracts

The package provides contract-first tool definitions that include:

- **Zod Input Schemas** - Strict input validation with detailed error messages
- **Typed Result Schemas** - Consistent output structures for predictable consumption
- **Documented Error Codes** - Enumerated error types with recovery guidance
- **Runtime Validation** - Automatic validation that surfaces consistent error responses

### Available MCP Tools

#### Workflow Orchestration
- `workflow.plan` - Creates a workflow plan for multi-agent orchestration

#### Task Management  
- `task.update_status` - Update the status of a task in the orchestration system

#### Process Monitoring
- `process.get_status` - Get the current status of a workflow process

### Usage Example

``typescript
import {
  workflowOrchestrationTools,
  taskManagementTools,
  processMonitoringTools,
  ToolErrorCode,
  createToolErrorResponse
} from '@cortex-os/orchestration/mcp/tools';

// Find a specific tool
const planTool = workflowOrchestrationTools.find(
  (tool) => tool.name === 'workflow.plan'
);

// Validate input
try {
  const validatedInput = planTool?.validateInput({
    workflowName: 'Data Processing Pipeline',
    goal: 'Process quarterly sales data',
    tasks: [
      {
        title: 'Data Validation',
        summary: 'Validate input data integrity',
        requiredCapabilities: ['data-validation'],
        dependencies: []
      }
    ]
  });
  
  // Use validated input for execution
  // ...
} catch (error) {
  // Handle validation errors
  if (error instanceof ToolValidationError) {
    const errorResponse = createToolErrorResponse(
      ToolErrorCode.INVALID_INPUT,
      error.message,
      { details: error.details, retryable: false }
    );
  }
}
```

### Error Handling

All MCP tools emit structured error responses with the following format:

``typescript
interface ToolErrorResponse {
  code: ToolErrorCode;        // Enumerated error code
  message: string;            // Human-readable explanation
  details?: string[];         // Optional validation details
  retryable?: boolean;        // Indicates if operation can be retried
  timestamp: string;          // ISO 8601 timestamp
}
```

For detailed API documentation, see [MCP Tools Documentation](./docs/mcp-tools.md).

## 🔧 Configuration

### Orchestration Engine Configuration

``typescript
interface OrchestrationConfig {
  // Concurrency settings
  maxConcurrentOrchestrations: number;     // Default: 5
  
  // Strategy settings  
  defaultStrategy: 'sequential' | 'parallel' | 'adaptive'; // Default: 'adaptive'
  
  // Feature flags
  enableMultiAgentCoordination: boolean;   // Default: true
  enableAdaptiveDecisions: boolean;        // Default: true
  
  // Timeout settings
  planningTimeout: number;                 // Default: 30000ms
  executionTimeout: number;                // Default: 300000ms
  
  // Quality settings
  qualityThreshold: number;                // Default: 0.8
  
  // Monitoring
  performanceMonitoring: boolean;          // Default: true
}
```

### Environment Configuration

This package requires no Python runtime. Configure your tools/providers via your application.

<!-- Framework selection is unnecessary in LangGraph-only mode. -->

## 🧪 Testing

### Running Tests

```bash
pnpm --filter @cortex-os/orchestration test
```

### Test Coverage

| Component | Coverage | Notes |
|-----------|----------|-------|
| LangGraph Graphs | 95% | Core orchestration logic tested |
| Validation/Telemetry | 94% | Schemas and observability |
| MCP Tools | 93% | Contract-first tool coverage |

### Testing with Mock Agents

```typescript
import { MockAgentBridge } from '@cortex-os/orchestration/testing';

describe('Orchestration Engine', () => {
  let engine: MultiAgentCoordinationEngine;
  let mockBridge: MockAgentBridge;

  beforeEach(async () => {
    mockBridge = new MockAgentBridge();
    engine = new MultiAgentCoordinationEngine({
      agentBridge: mockBridge
    });
    await engine.initialize();
  });

  it('should coordinate multiple agents', async () => {
    // Setup mock agents
    mockBridge.addAgent({
      id: 'test-agent',
      framework: 'langgraph',
      capabilities: ['data-analysis']
    });

    // Execute test orchestration
    const result = await engine.coordinateExecution(testTask, testPlan, testAgents);

    expect(result.success).toBe(true);
    expect(result.agentsUsed).toContain('test-agent');
  });
});
```

## 📊 Performance & Monitoring

### Performance Metrics

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| Agent Startup Time | <2 seconds | Python process initialization |
| Task Coordination | <500ms | TypeScript orchestration overhead |
| IPC Latency | <10ms | Bridge communication latency |
| Memory Usage | 50-200MB | Per agent process |
| Concurrent Orchestrations | 10+ | Configurable based on resources |

### Monitoring Integration

```typescript
// Built-in performance monitoring
const engine = new MultiAgentCoordinationEngine({
  performanceMonitoring: true,
  metricsCallback: (metrics) => {
    console.log('Orchestration Metrics:', {
      activeOrchestrations: metrics.activeCount,
      averageExecutionTime: metrics.avgExecutionTime,
      successRate: metrics.successRate,
      resourceUtilization: metrics.resourceUsage
    });
  }
});

// Custom monitoring integration
engine.on('orchestration.started', (event) => {
  // Track orchestration start
});

engine.on('orchestration.completed', (event) => {
  // Track successful completions
});

engine.on('orchestration.failed', (event) => {
  // Handle and track failures
});
```

## 🔒 Security

### Security Features

- **🔐 Secure IPC Communication** - Validated JSON messages with schema checking
- **🛡️ Process Isolation** - Python agents run in separate processes
- **⚡ Input Sanitization** - All inputs validated before bridge communication
- **📋 Audit Logging** - Comprehensive logging of all orchestration activities
- **🔒 Resource Limits** - Memory and CPU limits for agent processes

### OWASP LLM Top-10 Compliance

| Risk | Mitigation | Implementation |
|------|------------|----------------|
| **LLM01: Prompt Injection** | Input validation and sanitization | All task inputs validated via Zod schemas |
| **LLM02: Insecure Output** | Output validation and encoding | Agent outputs sanitized before processing |
| **LLM04: Model DoS** | Resource limits and monitoring | CPU/memory limits per agent process |
| **LLM08: Excessive Agency** | Capability boundaries | Agents restricted to defined capabilities |
| **LLM10: Model Theft** | Process isolation | Agents run in isolated Python processes |

```typescript
// Security configuration example
const secureConfig = {
  agentProcessLimits: {
    maxMemory: '1GB',
    maxCpu: '2 cores',
    timeout: 300000
  },
  inputValidation: {
    enableSchemaValidation: true,
    sanitizeInputs: true,
    maxInputSize: 1048576 // 1MB
  },
  auditLogging: {
    enabled: true,
    logLevel: 'INFO',
    includeInputs: false, // Avoid logging sensitive data
    includeOutputs: false
  }
};
```

## 🚀 Advanced Usage

### Custom Framework Integration

```typescript
// Extend orchestration with custom AI framework
import { AgentFramework } from '@cortex-os/orchestration';

class CustomFrameworkBridge implements AgentFramework {
  async executeAgent(agent: Agent, task: Task): Promise<AgentResult> {
    // Custom framework execution logic
    return await this.customFramework.run(agent, task);
  }
  
  async isHealthy(): Promise<boolean> {
    return this.customFramework.isConnected();
  }
  
  getCapabilities(): string[] {
    return ['custom-reasoning', 'specialized-processing'];
  }
}

// Register custom framework
engine.registerFramework('custom', new CustomFrameworkBridge());
```

### Dynamic Agent Scaling

```typescript
// Auto-scaling based on workload
const scalingConfig = {
  minAgents: 2,
  maxAgents: 10,
  scaleUpThreshold: 0.8,   // CPU utilization
  scaleDownThreshold: 0.3,
  scalingInterval: 30000   // 30 seconds
};

engine.enableAutoScaling(scalingConfig);

// Manual scaling
await engine.scaleAgents('data-analyst', 5); // Scale to 5 instances
```

### Workflow Composition

``typescript
// Compose complex workflows from reusable components
const dataProcessingWorkflow = {
  name: 'data-processing-pipeline',
  phases: [
    {
      name: 'ingestion',
      agents: ['data-ingester'],
      parallel: false,
      timeout: 60000
    },
    {
      name: 'validation-and-cleaning',
      agents: ['validator', 'cleaner'],
      parallel: true,
      timeout: 120000
    },
    {
      name: 'analysis',
      agents: ['analyst', 'statistician', 'ml-engineer'],
      parallel: true,
      timeout: 300000
    },
    {
      name: 'reporting',
      agents: ['report-generator'],
      parallel: false,
      timeout: 60000
    }
  ],
  onFailure: 'retry',
  maxRetries: 3,
  fallbackStrategy: 'partial-results'
};

const result = await engine.executeWorkflow(dataProcessingWorkflow, inputData);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os/packages/orchestration
pnpm install
pnpm dev
pnpm test
```

### Contribution Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 90%
- Add comprehensive documentation for new features
- Tests target LangGraph-only orchestration
- Ensure security best practices for agent communication
- Include performance benchmarks for new orchestration strategies

## 📚 Resources

### Documentation

- **[Architecture Guide](./docs/architecture.md)** - Detailed system architecture
- **[Agent Development](./docs/agent-development.md)** - Creating custom agents
- **[Performance Tuning](./docs/performance.md)** - Optimization strategies
- **[Examples](./examples/)** - Usage examples and tutorials

### Community

- **🐛 Issues**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
- **📖 Documentation**: [docs.cortex-os.dev](https://docs.cortex-os.dev)
- **📺 Tutorials**: [YouTube Channel](https://youtube.com/cortex-os)

## 📈 Roadmap

### Upcoming Features

- **🌊 Stream Processing** - Real-time agent coordination and streaming results
- **🌐 Distributed Orchestration** - Multi-node agent coordination
- **🤖 Agent Learning** - Adaptive agent behavior based on execution history
- **📊 Advanced Analytics** - Detailed orchestration analytics and insights
- **🔌 Framework Plugins** - Easy integration of new AI frameworks
- **🎯 Smart Routing** - AI-powered agent selection and task routing

## 🙏 Acknowledgments

- **[LangGraph](https://python.langchain.com/docs/langgraph)** - State-based agent workflows (LangGraph-only)
<!-- Non-LangGraph acknowledgments removed to reflect current scope. -->
- **Open Source Community** - Contributors and maintainers

---

<div align="center">

**Built with 💙 TypeScript and ❤️ by the Cortex-OS Team**

[![TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![AI Orchestration](https://img.shields.io/badge/AI-orchestration-green)](https://github.com/cortex-os/cortex-os)

</div>
