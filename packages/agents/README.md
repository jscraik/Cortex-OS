# Cortex-OS Agents (LangGraphJS)

This package implements Cortex-OS’s master-agent coordination using LangGraphJS,
with disk-defined subagents, MCP tool gating, recursion/depth guards, JSONL logging,
hot-reload, and checkpointing. It integrates MLX as the preferred local backend and
falls back to Ollama per specialization-driven performance tiers.

## Features

- **LangGraphJS Master Agent**: Orchestrates subagents via `@langchain/langgraph` (`src/MasterAgent.ts`).
- **Disk-defined Subagents**: YAML/Markdown configs loaded at runtime (`src/subagents/`).
- **Tool Gating & Recursion Guard**: Prevent unsafe tool calls and runaway delegation.
- **JSONL Logging & Checkpointing**: Per-run trace and resumable state.
- **Hot-Reload**: Watch subagent configs and reload on change.
- **MLX-first, Ollama Fallback**: Specialization-aware routing with tier-based fallback.
- **A2A/MCP Integration**: Hooks for event bus and Model Context Protocol tools.

## Project Structure

```bash
src/
├── server.ts                # Dev server / entry
├── MasterAgent.ts           # LangGraphJS master agent
├── subagents/               # Disk-defined subagent configs
├── mcp/                     # MCP tool adapters/wrappers
├── langgraph/               # Graph wiring helpers
├── agents/                  # Agent-specific logic
├── utils/                   # Utilities
└── types/                   # Shared types/schemas
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

Note: Workflow orchestration is implemented via LangGraphJS state graphs rather than a VoltAgent API.

### Planned Workflows

- **System Health Check**: Monitor the health of Cortex-OS components and provide analysis
- **Agent Deployment**: Validate agent configuration and generate deployment plans
- **A2A Communication Test**: Test A2A communication between agents in the system

The workflow implementation will be added once the VoltAgent workflow API is better understood.

## Development

### Adding a Subagent

1. Add a YAML or Markdown config under `src/subagents/`.
2. Include fields like `name`, `description`, `capabilities`, `specialization`, `tools`,
   and optional `fallback_model` / `fallback_tier`.
3. The watcher will hot-reload changes during development.

### Adding MCP Tools

1. Create a tool adapter under `src/mcp/` exposing a stable interface.
2. Gate tool usage in the Tool Layer to enforce safety and depth limits.
3. Validate inputs with Zod schemas before invocation.

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_BASE_URL`: OpenAI API base URL (default: <https://api.openai.com/v1>)
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

## Model Routing & Fallbacks

The master agent routes by specialization and selects models using MLX first (when available),
then falls back to Ollama by performance tier. You can override per-subagent behavior.

- Specializations: `code-analysis`, `test-generation`, `documentation`, `security`.
- Specialization → tier mapping:
  - `documentation` → `balanced`
  - `security` → `high_performance`
  - `code-analysis`, `test-generation` → `ultra_fast`
- Tiers and models are defined in `config/ollama-models.json` under `performance_tiers` and `chat_models`.

Per-subagent overrides (optional) in your subagent config:

```yaml
name: documentation-agent
description: Maintains and writes project docs
capabilities: ["docs"]
specialization: documentation
# If MLX is unavailable, override the fallback target:
fallback_tier: balanced           # one of: ultra_fast | balanced | high_performance
fallback_model: deepseek-coder:6.7b  # takes precedence over tier if provided
```

Runtime behavior:

1. Attempt MLX via `@cortex-os/model-gateway` MLX adapter if `isAvailable()` resolves `true`.
2. If MLX is unavailable or errors, compute tier from specialization (or use `fallback_tier`),
   then select the first model from that tier in `ollama-models.json` and call Ollama.
3. If `fallback_model` is set on the subagent, it overrides the tier-based selection.

See `tests/ollama-specialization-tier.test.ts` for an example asserting `documentation` specialization uses the `balanced` tier when MLX is unavailable.
