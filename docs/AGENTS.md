<user_instructions>

# AGENTS

AGENTS.md is authoritative for structure and behavior. Deviations are blocked by CI.

## Roles

Define agent roles across MCP, A2A, RAG, and Simlab domains:

- **MCP Agents**: Model Context Protocol handlers for external tool integration
- **A2A Agents**: Agent-to-Agent communication coordinators
- **RAG Agents**: Retrieval-Augmented Generation processors for knowledge queries
- **Simlab Agents**: Simulation environment controllers

Each role has explicit responsibilities and operational limits defined in their respective modules.

## Boundaries

Strict domain separation with controlled interfaces:

- No direct cross-domain imports (`src/` or `dist/`)
- Communication through defined message contracts only
- Shared utilities via common interfaces
- Clear separation of concerns between agent types

## Inputs

All agent inputs must be validated:

```typescript
// Use Zod schemas for validation
const inputSchema = z.object({
  seed: z.number().int().positive(),
  maxTokens: z.number().max(4096),
  // ... other fields
});
```

- Deterministic seeds for reproducible behavior
- Resource caps to prevent runaway execution
- JSON schema validation for external inputs

## Outputs

Standardized output formats:

- Default: Human-readable text with context
- `--json` flag: Machine-readable JSON with metadata
- ISO-8601 timestamps for all temporal data
- Structured error responses with error codes

## Memory

Bounded and deterministic memory management:

- Interface-based memory stores (no direct persistence access)
- Configurable memory limits per agent type
- Deterministic cleanup and garbage collection
- State serialization for agent persistence

## Governance

Enforcement through automated checks:

- `.cortex` control-centre validation in CI pipeline
- Pre-commit hooks for agent contract compliance
- Schema validation for agent configurations
- Documentation synchronization checks
- Pull request descriptions must follow `.github/pull_request_template.md`; the `review-automation` workflow fails otherwise

## Agent Toolkit

Agents must use scripts under `agent-toolkit/tools` for search, codemods, diff review and validation. Invoke via `just` recipes or direct script calls to keep outputs deterministic.

</user_instructions>

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search and relationship mapping to find relevant memories across all projects and sessions.
This prompts your AI agents to automatically use Local Memory for persistent context across conversations.
