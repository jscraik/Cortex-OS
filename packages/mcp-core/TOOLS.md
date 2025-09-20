# MCP Core Tools

This package provides a comprehensive suite of MCP (Model Context Protocol) tools for various operations including file management, web access, notebook manipulation, and task management as part of the Cortex-OS Autonomous Software Behavior Reasoning (ASBR) Runtime.

## Available Tools

### System Tools

#### BashTool

- **Name**: `bash`
- **Permission Required**: Yes
- **Description**: Executes shell commands in your environment
- **Use Cases**: Running system commands, build scripts, file operations
- **Security**: Command filtering prevents dangerous operations

#### EchoTool

- **Name**: `echo`
- **Permission Required**: No
- **Description**: Simple echo utility for testing and debugging
- **Use Cases**: Testing tool execution, debugging workflows

### File Operation Tools

#### ReadTool

- **Name**: `read`
- **Permission Required**: No
- **Description**: Reads the contents of files
- **Use Cases**: Loading configuration files, reading source code, data analysis
- **Features**: Multiple encoding support, size limits, workspace sandboxing

#### WriteTool

- **Name**: `write`
- **Permission Required**: Yes
- **Description**: Creates or overwrites files
- **Use Cases**: Generating code, creating configuration files, data export
- **Features**: Automatic directory creation, workspace sandboxing

#### EditTool

- **Name**: `edit`
- **Permission Required**: Yes
- **Description**: Makes targeted edits to specific files
- **Use Cases**: Code refactoring, configuration updates, content modification
- **Features**: Search and replace operations, backup creation

#### MultiEditTool

- **Name**: `multiedit`
- **Permission Required**: Yes
- **Description**: Performs multiple edits on a single file atomically
- **Use Cases**: Complex refactoring, batch updates, atomic operations
- **Features**: Rollback on failure, transactional edits

### File Discovery and Search Tools

#### GlobTool

- **Name**: `glob`
- **Permission Required**: No
- **Description**: Finds files based on pattern matching
- **Use Cases**: File discovery, batch operations, project analysis
- **Features**: Custom pattern implementation, recursive search, metadata extraction

#### GrepTool

- **Name**: `grep`
- **Permission Required**: No
- **Description**: Searches for patterns in file contents
- **Use Cases**: Code search, log analysis, content discovery
- **Features**: Regex support, context lines, multiple file search

### Notebook Tools

#### NotebookReadTool

- **Name**: `notebook-read`
- **Permission Required**: No
- **Description**: Reads and displays Jupyter notebook contents
- **Use Cases**: Notebook analysis, code review, data exploration
- **Features**: Cell extraction, metadata parsing, output display

#### NotebookEditTool

- **Name**: `notebook-edit`
- **Permission Required**: Yes
- **Description**: Modifies Jupyter notebook cells
- **Use Cases**: Notebook automation, cell manipulation, content updates
- **Features**: Cell operations (add, edit, delete, move), metadata management

### Web Access Tools

#### WebFetchTool

- **Name**: `web-fetch`
- **Permission Required**: Yes
- **Description**: Fetches content from a specified URL
- **Use Cases**: API calls, web scraping, content retrieval
- **Features**: HTTP method support, security controls, response type handling

#### WebSearchTool

- Name: `web-search`
- Permission Required: Yes
- Description: Performs real web searches with domain filtering (DuckDuckGo HTML endpoint)
- Use Cases: Research, information gathering, content discovery
- Features: Domain filtering, time range and safe search options, result limiting

### Task Management Tools

#### TaskTool

- **Name**: `task`
- **Permission Required**: No
- **Description**: Runs a sub-agent to handle complex, multi-step tasks
- **Use Cases**: Workflow automation, complex operations, delegation
- **Features**: Progress tracking, step-by-step execution, timeout handling

#### TodoWriteTool

- **Name**: `todo-write`
- **Permission Required**: No
- **Description**: Creates and manages structured task lists
- **Use Cases**: Project planning, task tracking, workflow management
- **Features**: Multiple formats (JSON, Markdown, text), CRUD operations

## Usage

### Basic Usage

```typescript
import { createToolRegistry, allTools } from '@cortex-os/mcp-core';

// Create a registry with all tools
const registry = createToolRegistry();

// Execute a tool
const result = await registry.get('read')?.execute({
    path: './example.txt'
});
```

### Restricted Usage (No Permissions)

```typescript
import { createRestrictedToolRegistry } from '@cortex-os/mcp-core';

// Create a registry with only permission-free tools
const restrictedRegistry = createRestrictedToolRegistry();

// This registry only includes: read, glob, grep, notebook-read, task, todo-write, echo
```

### Category-based Access

```typescript
import { toolCategories, getToolsByCategory } from '@cortex-os/mcp-core';

// Get all file operation tools
const fileTools = getToolsByCategory('files');

// Get all web tools
const webTools = getToolsByCategory('web');
```

### Individual Tool Import

```typescript
import { bashTool, readTool, writeTool } from '@cortex-os/mcp-core';

// Use individual tools
const fileContent = await readTool.execute({ path: './config.json' });
await writeTool.execute({ path: './output.txt', content: 'Hello World' });
```

## Permission Model

Tools are categorized based on their permission requirements to ensure secure operation within the Cortex-OS environment:

### Permission Required Tools (7)

- `bash` - Shell execution
- `write` - File creation/overwriting
- `edit` - File modification
- `multiedit` - Multi-file modification
- `notebook-edit` - Notebook modification
- `web-fetch` - HTTP requests
- `web-search` - Web access

### No Permission Required Tools (7)

- `read` - File reading
- `glob` - Pattern matching
- `grep` - Content search
- `notebook-read` - Notebook reading
- `task` - Sub-agent tasks
- `todo-write` - Task list management
- `echo` - Echo utility

## Security Features

All tools implement comprehensive security controls aligned with Cortex-OS security standards:

- **Workspace Sandboxing**: File operations are restricted to the current workspace
- **Command Filtering**: Dangerous shell commands are blocked (fork bombs, destructive operations)
- **Network Controls**: Web access includes security controls and domain filtering
- **Resource Limits**: Tools include timeout and size limits to prevent abuse
- **Input Validation**: All inputs are validated using Zod schemas with strict typing
- **Error Boundaries**: Comprehensive error handling with specific error codes

## Error Handling

All tools implement standardized error handling with specific error codes:

- `E_TOOL_VALIDATION` - Input validation errors
- `E_TOOL_EXECUTION` - General execution errors
- `E_ACCESS_DENIED` - Permission/security errors
- `E_FILE_NOT_FOUND` - File system errors
- `E_NETWORK_ERROR` - Network-related errors
- `E_TIMEOUT` - Operation timeout errors
- `E_TOOL_ABORTED` - Cancelled operations

## Integration with Cortex-OS

### Agent Integration

These tools are designed to integrate seamlessly with Cortex-OS agents:

```typescript
// In an agent implementation
import { ToolLayerAgent } from '@cortex-os/agents';
import { createToolRegistry } from '@cortex-os/mcp-core';

const toolRegistry = createToolRegistry();
const agent = new ToolLayerAgent({ toolRegistry });
```

### A2A Event Integration

Tools can emit events for agent-to-agent communication:

```typescript
// Tool execution with event emission
const result = await tool.execute(input, {
    signal: abortSignal,
    metadata: { agentId: 'analysis-agent', sessionId: 'session-123' }
});
```

### Memory System Integration

Tools integrate with the Cortex-OS memory system for context-aware operations:

```typescript
import { MemoryService } from '@cortex-os/memories';

// Tools can access memory for context
const context = await memoryService.search('relevant context');
```

## Testing

Each tool includes comprehensive unit tests covering:

- Input validation scenarios
- Success and error conditions
- Security control validation
- Edge case handling
- Performance characteristics

Run tests with:

```bash
pnpm test packages/mcp-core
```

## Development

When adding new tools to the Cortex-OS ecosystem:

1. **Implement the `McpTool` interface**
2. **Add comprehensive input validation with Zod schemas**
3. **Include proper error handling with standardized codes**
4. **Add security controls appropriate for the tool's function**
5. **Export from the tools index with proper categorization**
6. **Update this documentation**
7. **Add comprehensive tests with >90% coverage**
8. **Follow Cortex-OS functional-first design principles**

### Code Standards

- Functions must be ≤ 40 lines
- Prefer pure functions and composable utilities
- Use Zod for all input validation
- Implement proper TypeScript typing
- Follow Cortex-OS branding standards

## Architecture Integration

These tools are part of the larger Cortex-OS ASBR Runtime architecture:

```
┌─────────────────────────────────────────────┐
│                Cerebrum Layer               │
│            (Meta-agent Brain)               │
├─────────────────────────────────────────────┤
│              Agent Layer                    │
│    ┌─────────────┐ ┌─────────────────────┐  │
│    │    Tool     │ │      Memory         │  │
│    │   Layer     │ │     System          │  │
│    │   Agent     │ │                     │  │
│    └─────────────┘ └─────────────────────┘  │
├─────────────────────────────────────────────┤
│              MCP Core Tools                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Bash │ │File │ │Web  │ │Note │ │Task │   │
│  │Tools│ │Tools│ │Tools│ │Tools│ │Tools│   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
└─────────────────────────────────────────────┘
```

## Future Roadmap

- **Enhanced Security**: Integration with OWASP security scanning
- **Performance Monitoring**: Tool execution metrics and observability
- **Extended Web Tools**: GraphQL support, advanced authentication
- **AI Integration**: LLM-powered tool orchestration
- **Cross-Language Support**: Python and Rust tool implementations

## License

Apache 2.0 License - see LICENSE file for details.

---

*Developed by brAInwav Development Team as part of the Cortex-OS project.*
