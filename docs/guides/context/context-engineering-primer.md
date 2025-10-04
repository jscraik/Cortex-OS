# Context Engineering Primer

## Core Idea
Great Cortex-OS agents are **well-contexted**, not just well-prompted. Apply Anthropic's Selection → Compression → Provenance loop to feed the model exactly what it needs, keep the window lean, and leave an auditable trace every run.

## Selection: Curate the Tokens
Focus the agent on the smallest viable set of tools, data, and memory.

| ✅ Do | ❌ Don't |
| --- | --- |
| Restrict available MCP tools to the task at hand. | Expose every integration "just in case." |
| Assemble context just-in-time (JIT) as execution unfolds. | Preload entire wikis or historical transcripts. |
| Document selected sources in the run log for traceability. | Leave tool choices implicit or undocumented. |

### Wiring with MCP + Agents SDK
Use the Agents SDK to register MCP servers and filter exposed tools per task.

```python
from agents import Agent, MCPServer
from agents.tools import Tool
from agents.tracing import enable_tracing

# 1) Register MCP server(s)
mcp = MCPServer(
    name="project-tools",
    url="https://mcp.your-domain/tools",
    # Selection: only expose what this task needs
    tool_filters=["search_docs", "readme_lookup", "issue_create"],
)

# 2) Optional: per-run allowed tools (extra narrowing)
agent = Agent(
    model="gpt-5-pro",
    mcp_servers=[mcp],
    allowed_tools=["search_docs", "readme_lookup"],
)

# 3) Run with tracing (provenance)
enable_tracing()  # capture tool spans/inputs/outputs for audit

result = agent.run("Summarize design decisions from last week's ADRs.")
print(result.output)
```

### Checklist
- [ ] Declare MCP servers in `mcpServer.mcp.config.*` with the minimum tool set.
- [ ] Narrow `allowed_tools` per run or workflow.
- [ ] Capture why each tool is required in the decision log.

## Compression: Make Room Without Losing Signal
Summaries should be compact, verifiable, and easy to reload on demand.

1. After N turns or M tokens, checkpoint a run summary (`what changed`, `decisions`, `blockers`, `links`).
2. Persist the summary outside the live window (e.g., `/mem/summary-YYYYMMDD.md`).
3. Replace earlier turns with the compacted note; reload originals only when needed.

| ✅ Do | ❌ Don't |
| --- | --- |
| Use deterministic summary templates. | Let auto-summaries drift with no review. |
| Store durable facts in RAG indices or memory stores. | Keep stale transcripts in-window "just in case." |
| Version memory entries and link to source turns. | Overwrite summaries without provenance. |

## Provenance: Stay Auditable
Everything the agent reads or writes should be traceable.

- Log tool spans, inputs, outputs, and decisions via `agents.tracing`.
- Keep the run log alongside AGENTS.md to surface guardrails and rituals.
- Include ISO-8601 timestamps and actor identifiers in exported summaries.
- Ensure AGENTS.md lists capabilities, disallowed operations, setup, context rules, and logging expectations.

### AGENTS.md Contract (Starter Template)
```
# AGENTS.md

## Purpose
Reliable coding/release agent for this repo. Obey CI gates and security budgets.

## Capabilities (allowed)
- readme_lookup, search_docs, run_tests, issue_create

## Disallowed
- package_publish, prod_migrations without `approval: true`

## Setup
- Install: `pnpm i`
- Test: `pnpm test --run`
- Lint/Sec: `pnpm biome check && pnpm semgrep`

## Context Rules
- Selection: only use tools listed above.
- Compression: roll up traces every 6 turns into /mem/summary-YYYYMMDD.md.
- Provenance: record tool spans to /logs/agents/*.json
```

## Why This Matters Now
Vendors are shipping first-class context features (context editing, scoped tool activation, and tracing hooks). Engineering the context loop prevents model drift, reduces cost, and keeps Cortex-OS agents compliant with brAInwav governance.

## Starter Pack: Context-Ready Agent
- [ ] Create or refresh `AGENTS.md` with capabilities, guardrails, and rituals.
- [ ] Configure MCP servers with tool filters; wire into Agents SDK runners.
- [ ] Enable tracing/export logs to `/logs/agents/`.
- [ ] Implement memory compaction routine (`mem/checkpoint.ts` or Python equivalent).
- [ ] Add documentation link in `docs/README.md`.
- [ ] Verify Smart Nx/CI workflows pick up the new rituals.

## Further Reading
- `docs/AGENTS.md` — governance for Cortex-OS agents.
- `packages/agent-toolkit/` — deterministic utilities for search, codemods, validation.
- Anthropic: Selection → Compression → Provenance guidance.
- OpenAI Agents SDK: MCP tool filtering and tracing primitives.
