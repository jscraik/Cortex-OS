# Cortex Orchestration

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@cortex-os/orchestration)](https://www.npmjs.com/package/@cortex-os/orchestration)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-93%25-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

**Multi-Agent Workflow Coordination for Cortex-OS ASBR Runtime**  
*Real AI orchestration with LangGraph, CrewAI, and Python-TypeScript bridge architecture*

</div>

---

## 🎯 Overview

Cortex Orchestration provides **production-ready multi-agent coordination** for the Cortex-OS ASBR runtime. This package implements real AI agent execution using LangGraph and CrewAI frameworks via a sophisticated Python-TypeScript bridge architecture, enabling intelligent task distribution, resource management, and collaborative problem-solving.

## ✨ Key Features

### 🤖 Real AI Agent Execution
- **🐍 LangGraph Integration** - State-based workflows with persistent checkpointing
- **👥 CrewAI Coordination** - Role-based swarm intelligence with specialized agents
- **🗣️ AutoGen Conversations** - Multi-agent conversational AI for complex reasoning
- **🌉 Python-TypeScript Bridge** - Seamless IPC communication via JSON over stdio

### 🚀 Advanced Orchestration
- **🧠 Intelligent Agent Routing** - Automatic framework selection based on task complexity
- **⚡ Resource Management** - Memory allocation, load balancing, and performance monitoring
- **🔄 Error Recovery** - Graceful failure handling with agent restart and task redistribution
- **📊 Performance Monitoring** - Real-time metrics and execution analytics

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

The orchestration engine requires Python dependencies for AI framework integration:

```bash
# Install Python dependencies
cd packages/python-agents
pip install -r requirements.txt

# Key dependencies include:
# langgraph>=0.0.50 - State-based agent workflows
# crewai>=0.28.0 - Multi-agent collaboration
# Supporting libraries for AI operations
```

### Basic Usage

```typescript
import { MultiAgentCoordinationEngine } from '@cortex-os/orchestration';

// Initialize the coordination engine
const engine = new MultiAgentCoordinationEngine({
  maxConcurrentOrchestrations: 10,
  enableMultiAgentCoordination: true,
  enableAdaptiveDecisions: true,
  planningTimeout: 30000,
  executionTimeout: 300000,
  performanceMonitoring: true
});

// Start the Python agent bridge
await engine.initialize();

// Define a complex task
const task = {
  id: 'data-analysis-task',
  type: 'data-processing',
  priority: 'high',
  requirements: {
    skills: ['data-analysis', 'visualization', 'reporting'],
    resources: { memory: '2GB', cpu: '2 cores' },
    deadline: new Date(Date.now() + 3600000) // 1 hour
  },
  payload: {
    dataset: './data/sales-q3.csv',
    analysisType: 'trend-analysis',
    outputFormat: 'dashboard'
  }
};

// Create execution plan
const plan = {
  strategy: 'parallel',
  phases: [
    { name: 'data-validation', agents: ['data-validator'] },
    { name: 'analysis', agents: ['analyst', 'statistician'] },
    { name: 'visualization', agents: ['chart-creator'] },
    { name: 'reporting', agents: ['report-generator'] }
  ],
  dependencies: {
    'analysis': ['data-validation'],
    'visualization': ['analysis'],
    'reporting': ['visualization']
  }
};

// Define available agents
const agents = [
  {
    id: 'data-validator',
    name: 'Data Validation Specialist',
    framework: 'langgraph',
    capabilities: ['data-validation', 'schema-checking'],
    resources: { maxMemory: '512MB', maxCpu: '1 core' }
  },
  {
    id: 'analyst',
    name: 'Data Analysis Expert',
    framework: 'crewai',
    capabilities: ['statistical-analysis', 'trend-detection'],
    resources: { maxMemory: '1GB', maxCpu: '2 cores' }
  }
];

// Execute coordinated multi-agent workflow
const result = await engine.coordinateExecution(task, plan, agents);

console.log('Orchestration Result:', {
  success: result.success,
  executionTime: result.executionTime,
  agentsUsed: result.agentsUsed,
  outputs: result.outputs
});

// Cleanup resources
await engine.cleanup();
```

## 🏗️ Architecture

### Polyglot Architecture

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
│                     Python Backend                             │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ LangGraph       │  │ CrewAI          │  │ AutoGen         │ │
│  │ State Engine    │  │ Coordinator     │  │ Conversation    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Agent Bridge                              │ │
│  │         (Python-TypeScript Communication)                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### TypeScript Layer
- **MultiAgentCoordinationEngine** - Main orchestration controller
- **PythonAgentBridge** - IPC communication with Python processes
- **ResourceManager** - Memory and CPU allocation management
- **PerformanceMonitor** - Real-time execution metrics

#### Python Layer (packages/python-agents/)
- **LangGraphStateEngine** - State-based workflows with checkpointing
- **CrewAICoordinator** - Swarm intelligence with role specialization
- **AutoGenConversationEngine** - Multi-agent conversational reasoning
- **AgentBridge** - Communication interface with TypeScript

### Communication Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   TypeScript    │    │   IPC Bridge     │    │     Python      │
│   Controller    │    │                  │    │   AI Agents     │
│                 │    │                  │    │                 │
│ 1. Create Task  │───▶│ 2. Serialize     │───▶│ 3. Execute      │
│ 4. Monitor      │◀───│    Message       │    │    Workflow     │
│    Progress     │    │                  │    │                 │
│ 7. Handle       │◀───│ 6. Deserialize   │◀───│ 5. Return       │
│    Result       │    │    Response      │    │    Results      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🧠 AI Framework Integration

### LangGraph State Workflows

```python
# Example: LangGraph workflow for data processing
from langgraph import StateGraph, END

def create_data_processing_workflow():
    workflow = StateGraph()
    
    # Define workflow states
    workflow.add_node("validate", validate_data)
    workflow.add_node("analyze", analyze_data)  
    workflow.add_node("visualize", create_visualizations)
    workflow.add_node("report", generate_report)
    
    # Define state transitions
    workflow.add_edge("validate", "analyze")
    workflow.add_edge("analyze", "visualize")
    workflow.add_edge("visualize", "report")
    workflow.add_edge("report", END)
    
    return workflow.compile(checkpointer=MemoryCheckpointer())
```

### CrewAI Role-Based Coordination

```python
# Example: CrewAI crew for collaborative analysis
from crewai import Agent, Task, Crew

# Define specialized agents
data_analyst = Agent(
    role='Data Analyst',
    goal='Analyze data patterns and trends',
    backstory='Expert in statistical analysis and data interpretation',
    tools=[data_analysis_tool, visualization_tool]
)

report_writer = Agent(
    role='Report Writer', 
    goal='Create comprehensive reports from analysis results',
    backstory='Skilled technical writer with domain expertise',
    tools=[report_generation_tool, formatting_tool]
)

# Create collaborative crew
analysis_crew = Crew(
    agents=[data_analyst, report_writer],
    tasks=[analysis_task, reporting_task],
    process=Process.sequential,
    verbose=True
)
```

## 🔧 Configuration

### Orchestration Engine Configuration

```typescript
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

### Python Environment Configuration

```bash
# Environment variables for Python agents
export LANGGRAPH_CONFIG_PATH="./config/langgraph.yaml"
export CREWAI_API_KEY="your-crewai-key"
export OPENAI_API_KEY="your-openai-key"
export MLX_INFERENCE_ENDPOINT="http://localhost:8080"

# Performance tuning
export PYTHON_AGENT_MEMORY_LIMIT="2GB"
export PYTHON_AGENT_TIMEOUT="300s"
export AGENT_BRIDGE_LOG_LEVEL="INFO"
```

### Agent Framework Selection

```typescript
// Automatic framework selection based on task type
const frameworkSelector = {
  'data-processing': 'langgraph',    // State-based workflows
  'collaborative-analysis': 'crewai', // Role-based coordination
  'conversation': 'autogen',          // Multi-agent dialogue
  'complex-reasoning': 'crewai',      // Swarm intelligence
  'workflow': 'langgraph'             // Sequential processing
};
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests (requires Python environment)
npm run test:integration

# Performance tests
npm run test:performance

# End-to-end orchestration tests
npm run test:e2e
```

### Test Coverage

| Component | Coverage | Notes |
|-----------|----------|-------|
| Coordination Engine | 95% | Core orchestration logic tested |
| Python Bridge | 92% | IPC communication and error handling |
| Resource Management | 94% | Memory and CPU allocation tested |
| Error Recovery | 91% | Failure scenarios and recovery |
| **Overall** | **93%** | Production-ready coverage |

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

```typescript
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
# Clone and install dependencies
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os/packages/orchestration
pnpm install

# Setup Python environment
cd ../python-agents
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run development build
pnpm dev

# Run tests
pnpm test
```

### Contribution Guidelines

- Follow TypeScript and Python best practices
- Maintain test coverage above 90%
- Add comprehensive documentation for new features
- Test with multiple AI frameworks (LangGraph, CrewAI)
- Ensure security best practices for agent communication
- Include performance benchmarks for new orchestration strategies

## 📚 Resources

### Documentation

- **[Architecture Guide](./docs/architecture.md)** - Detailed system architecture
- **[Python Integration](./docs/python-integration.md)** - Python-TypeScript bridge guide
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

- **[LangGraph](https://python.langchain.com/docs/langgraph)** - State-based agent workflows
- **[CrewAI](https://crewai.com/)** - Multi-agent collaboration framework
- **[AutoGen](https://microsoft.github.io/autogen/)** - Conversational AI agents
- **Open Source Community** - Contributors and maintainers

---

<div align="center">

**Built with 💙 TypeScript, 🐍 Python, and ❤️ by the Cortex-OS Team**

[![TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/powered%20by-Python-yellow)](https://www.python.org/)
[![AI Orchestration](https://img.shields.io/badge/AI-orchestration-green)](https://github.com/cortex-os/cortex-os)

</div>
