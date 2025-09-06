# Python Integration

Integrate Cortex-OS with your Python projects.

## Installation

```bash
# Install Python dependencies
uv sync
uv add cortex-os-python

# Or with pip
pip install cortex-os-python
```

## Basic Usage

```python
from cortex_os import CortexClient, Agent

# Initialize client
client = CortexClient(endpoint="http://localhost:3000")

# Create an agent
agent = Agent(
    name="my-python-agent",
    capabilities=["code-analysis", "file-operations"]
)

# Register with Cortex-OS
await client.register_agent(agent)

# Execute a task
result = await agent.execute_task({
    "type": "analyze_code",
    "file_path": "./src/main.py"
})

print(result)
```

## Agent Development

### Creating Custom Agents

```python
from cortex_os import BaseAgent, Message

class DataAnalysisAgent(BaseAgent):
    async def handle_message(self, message: Message):
        if message.type == "analyze_dataset":
            # Your analysis logic here
            return self.create_response(
                data={"analysis": "results"},
                status="completed"
            )

        return await super().handle_message(message)

# Register the agent
agent = DataAnalysisAgent(name="data-analyzer")
await client.register_agent(agent)
```

### Memory Integration

```python
# Store data in Cortex memory
await client.memory.store("analysis_results", {
    "dataset": "sales_data.csv",
    "insights": ["trend_1", "trend_2"],
    "timestamp": "2025-01-01T12:00:00Z"
})

# Retrieve data
results = await client.memory.retrieve("analysis_results")
```

## Advanced Features

### A2A Communication

```python
# Subscribe to events
@agent.on_event("data.processed")
async def handle_data_processed(event):
    print(f"Data processed: {event.payload}")

# Publish events
await agent.publish_event("analysis.completed", {
    "results": analysis_results,
    "agent_id": agent.id
})
```

### MCP Tool Integration

```python
# Use MCP tools
file_content = await client.mcp.call_tool("file_read", {
    "path": "/path/to/file.txt"
})

# Execute code
result = await client.mcp.call_tool("code_execute", {
    "language": "python",
    "code": "print('Hello from Cortex!')"
})
```

## Configuration

```python
# Configuration file: cortex_config.py
CORTEX_CONFIG = {
    "endpoint": "http://localhost:3000",
    "auth": {
        "type": "api_key",
        "key": "your-api-key"
    },
    "memory": {
        "provider": "local",
        "path": "./cortex_memory"
    },
    "logging": {
        "level": "INFO",
        "format": "structured"
    }
}
```

## Next Steps

- [MCP Tools](./mcp-tools) - Learn about tool integration
- [Deployment](./deployment) - Deploy your agents
