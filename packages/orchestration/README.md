# Orchestration Package

✅ **IMPLEMENTED**: This package now contains **real multi-agent orchestration** using LangGraph and CrewAI
frameworks via Python-TypeScript bridge architecture.

## Current Status: Production Ready

The `MultiAgentCoordinationEngine` in `src/multi-agent-coordination.ts` implements:

- Real Python agent execution via IPC bridge (`src/bridges/python-agent-bridge.ts`)
- LangGraph state-based workflow management
- CrewAI swarm intelligence coordination
- Agent2Agent (A2A) protocol compliance
- MLX local inference integration

## Architecture

This package implements a **polyglot architecture**:

- **TypeScript Frontend**: Coordination engine, UI bridge, and orchestration management
- **Python Backend**: AI agent execution (LangGraph, CrewAI)
- **IPC Communication**: JSON over stdio for cross-language integration

## Python Agents

Located in `../python-agents/src/`:

1. **LangGraphStateEngine** (`langgraph_engine.py`): State-based workflows with persistent checkpointing
2. **CrewAICoordinator** (`crewai_coordinator.py`): Role-based swarm intelligence with specialized agents
3. **AgentBridge** (`agent_bridge.py`): IPC bridge for Python-TypeScript communication

## Key Features

- **Real Agent Execution**: No more `setTimeout` simulation - actual AI framework integration
- **Intelligent Agent Routing**: Automatically selects LangGraph or CrewAI based on task type
- **Resource Management**: Proper memory allocation, load balancing, and performance monitoring
- **Error Recovery**: Graceful failure handling with agent restart and task redistribution
- **Security**: OWASP LLM Top 10 compliance and secure agent-to-agent communication

## Dependencies

### TypeScript Dependencies

- `winston` - Structured logging
- `uuid` - Unique identifier generation
- Node.js child_process for Python IPC

### Python Dependencies (in `../python-agents/requirements.txt`)

- `langgraph>=0.0.50` - State-based agent workflows
- `crewai>=0.28.0` - Multi-agent collaboration
- Supporting libraries for AI operations

## Usage

```typescript
import { MultiAgentCoordinationEngine } from '@cortex-os/orchestration';

const engine = new MultiAgentCoordinationEngine();
await engine.initialize(); // Starts Python agent bridge

const result = await engine.coordinateExecution(task, plan, agents);
// Real AI agents execute via LangGraph or CrewAI

await engine.cleanup(); // Shuts down Python bridge
```

This package is now **production-ready** for real multi-agent orchestration workflows.
