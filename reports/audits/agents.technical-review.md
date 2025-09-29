# Cortex-OS Agents Package – Technical Review (LangGraphJS Only)

Date: 2025-09-20
Scope: `packages/agents`

## Summary

The package implements a LangGraphJS-based master agent (`createMasterAgentGraph`) and a full `CortexAgentLangGraph`. Subagents are represented in code and can be exposed as tools via `SubagentTool`. We added: (1) recursion and depth guard in `SubagentTool`, (2) a dual-scope disk loader (`SubagentDiskLoader.ts`) for YAML/MD agents under project (`.Cortex-OS/.cortex/agents`) and user (`~/.cortex/agents`) scopes, and (3) `cerebrum.yaml` reference in the package. Typecheck for the package succeeds; lints remain to be tuned for the new loader's complexity.

## Architecture Readiness

- Master Agent Loop: Implemented in LangGraphJS (`MasterAgent.ts`) with nodes for routing and tool execution.
- Cortex Agent: Full LangGraphJS workflow with security check, routing to master, response, memory update.
- Tool Layer Agent: LangGraphJS workflow for tool selection/execution; integrates AGUI and Agent Toolkit MCP tools.
- Subagent as Tools: `materializeSubagentTool` exists with recursion and depth guards; `agent.autodelegate` and `agent.list` provided.
- Checkpointing: In-memory + stub SQLite checkpoint manager present.

## Disk-defined Subagents

- Loader added: `src/subagents/SubagentDiskLoader.ts` (YAML and Markdown front-matter). User scope is overridden by project scope on name collision. Outputs `SubagentConfig` compatible with `nO/contracts`.
- Next wiring: Register loaded subagents and materialize tools during agent initialization.

## Security & Safety

- Recursion guard, depth cap, and allowed tools filtering exist (`ToolLayerAgent` and `SubagentTool`).
- Network/file tools should remain sandboxed via MCP core; ensure runtime enforces registry-level allow-lists.

## Gaps / Risks

1. Loader code complexity exceeds lint threshold (Sonar/biome complexity hint) – refactor into helpers.
2. Integration glue: Ensure wherever `CortexAgent`/server boot occurs, it calls loader and registers materialized tools with the ToolEngine (or equivalent registry). The repository uses multiple registries; finalize a single point.
3. Observability: Add structured logs for subagent runs under `Logs/Subagents/<name>/<ts>.jsonl` if required.
4. Tests: No unit tests under `packages/agents`; add smoke tests for loader, `SubagentTool`, and `MasterAgent` routing.

## Action Items

- [ ] Refactor `SubagentDiskLoader.loadDir` into small helpers (<= 40 LOC functions).
- [ ] Wire loader output into initialization (e.g., in `server.ts` or agent factory) and materialize tools.
- [ ] Add minimal tests (loader parse, tool recursion/depth guard, routing happy path).
- [ ] Confirm MCP Core allowed tool gating is enforced when subagents run.

## Commands

```bash
pnpm -w --filter @cortex-os/agents typecheck
pnpm -w --filter @cortex-os/agents build
```
