# Cortex-OS VoltAgent

This project demonstrates how to build Cortex-OS agents using the VoltAgent framework. It provides a comprehensive example of creating AI agents that can interact with the Cortex-OS ecosystem.

## Features

- **AI Agent Framework**: Built on VoltAgent for powerful AI agent capabilities
- **Cortex-OS Integration**: Native integration with Cortex-OS components
- **A2A Communication**: Agent-to-Agent communication support
- **MCP Integration**: Model Context Protocol support for external tools
- **Memory Management**: Persistent memory storage and retrieval
- **Workflow Engine**: Complex workflow orchestration
- **Comprehensive Tools**: Rich set of tools for system interaction

## Project Structure

```
src/
├── index.ts                 # Main entry point
├── tools/                   # Tool definitions
│   ├── index.ts            # Tool exports
│   ├── system-tools.ts     # System-related tools
│   ├── a2a-tools.ts         # A2A communication tools
│   ├── mcp-tools.ts         # MCP integration tools
│   └── memory-tools.ts      # Memory management tools
└── workflows/               # Workflow definitions
    └── index.ts            # Workflow exports
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm or pnpm
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   LOG_LEVEL=info
   PORT=3141
   ```

### Running the Agent

Development mode:
```bash
npm run dev
```

Build and run:
```bash
npm run build
npm start
```

## Available Tools

### System Tools

- **`get_system_info`**: Get comprehensive information about the Cortex-OS system
- **`check_component_health`**: Check the health status of specific Cortex-OS components
- **`get_system_metrics`**: Get system performance metrics and statistics

### A2A Communication Tools

- **`send_a2a_message`**: Send an A2A (Agent-to-Agent) message to another agent
- **`list_agents`**: List all available agents in the Cortex-OS system
- **`get_a2a_stats`**: Get A2A communication statistics and analytics

### MCP Integration Tools

- **`list_mcp_servers`**: List all available MCP (Model Context Protocol) servers
- **`call_mcp_tool`**: Call a tool on a specific MCP server
- **`get_mcp_server_capabilities`**: Get detailed capabilities of a specific MCP server

### Memory Management Tools

- **`store_memory`**: Store a memory in the Cortex-OS memory system
- **`retrieve_memory`**: Retrieve a memory from the Cortex-OS memory system
- **`search_memories`**: Search memories by content or tags
- **`get_memory_stats`**: Get memory system statistics and analytics

## Available Workflows

**Note**: Workflows are currently being implemented as the VoltAgent workflow API requires further study. The framework supports complex workflow orchestration with methods like `andThen`, `andAgent`, `andAll`, `andRace`, and `andWhen`.

### Planned Workflows

- **System Health Check**: Monitor the health of Cortex-OS components and provide analysis
- **Agent Deployment**: Validate agent configuration and generate deployment plans
- **A2A Communication Test**: Test A2A communication between agents in the system

The workflow implementation will be added once the VoltAgent workflow API is better understood.

## Development

### Adding New Tools

1. Create a new tool file in the `src/tools/` directory
2. Import the `Tool` class from `@voltagent/core`
3. Define your tool with proper schema using Zod
4. Export the tool from `src/tools/index.ts`

Example:
```typescript
import { Tool } from "@voltagent/core";
import { z } from "zod";

export const myTool = new Tool({
  name: "my_tool",
  description: "Description of what the tool does",
  parameters: z.object({
    param1: z.string().describe("Parameter description"),
  }),
  execute: async ({ param1 }) => {
    // Tool implementation
    return { result: `Processed: ${param1}` };
  },
});
```

### Adding New Workflows

1. Create a new workflow in `src/workflows/index.ts`
2. Use `createWorkflowChain` to define the workflow
3. Add steps using `andThen`, `andAgent`, or other workflow methods
4. Export the workflow for use in the main application

Example:
```typescript
export const myWorkflow = createWorkflowChain("My Workflow")
  .andThen(new ToolStep({
    name: "step1",
    description: "First step",
    toolName: "my_tool",
    parameters: { param1: "value" },
  }))
  .andThen(new AgentStep({
    name: "step2",
    description: "Second step",
    agentName: "cortex-os-agent",
    prompt: "Analyze the results from step 1",
  }))
  .build();
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_BASE_URL`: OpenAI API base URL (default: https://api.openai.com/v1)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `PORT`: Server port (default: 3141)
- `MEMORY_URL`: Memory storage URL
- `MEMORY_ADAPTER`: Memory adapter type (libsql, memory)

### VoltAgent Configuration

The framework can be configured through the `.voltagent/` directory, which stores persistent data and configuration.

## API Reference

### Main Classes

- **`VoltAgent`**: Main framework class
- **`Agent`**: Individual agent definition
- **`Tool`**: Tool definition for agent capabilities
- **`Memory`**: Memory management system
- **`WorkflowChain`**: Workflow orchestration

### Key Methods

- `createWorkflowChain(name)`: Create a new workflow
- `andThen(step)`: Add a step to a workflow
- `andAgent(step)`: Add an agent step to a workflow
- `build()`: Finalize workflow construction

## Testing

```bash
npm test
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For questions or issues, please refer to the main Cortex-OS documentation or open an issue in the repository.