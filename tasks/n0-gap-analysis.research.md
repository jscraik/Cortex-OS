# n0-gap-analysis.research.md

## Research Objective
Compare the north-star n0 (Master Agent Loop) blueprint against the current Cortex-OS codebase to surface missing features, architectural conflicts, and remediation targets.

## Existing Implementations (Stronger Than Baseline Assumptions)
- `packages/agents/src/MasterAgent.ts` implements a LangGraph `StateGraph` with agent routing and MCP-backed tool execution, showing mature orchestration beyond placeholder status.
- `packages/agents/src/CortexAgentLangGraph.ts` plus multiple sub-agent graphs (`packages/agents/src/subagents/*.ts`) provide complex node orchestration, streaming, and checkpointing.
- `packages/kernel/src/kernel.ts` exposes LangGraph-powered execution surfaces, integrating PRP and guardrails rather than stubs.
- `packages/prp-runner/src/lib/langgraph-workflow.ts` and associated managers coordinate formatting/testing pipelines with checkpoint persistence.
- `@cortex-os/commands`, `@cortex-os/hooks`, `@cortex-os/memories`, and other packages already deliver the command/hook/memory layers expected by the blueprint.

## Identified Gaps vs Blueprint

### Missing Unified n0 Graph
- No `parse_or_command`, `pre_prompt_hooks`, `plan_or_direct`, `llm_with_tools`, `tool_dispatch`, `compact_if_needed`, `stream_and_log` node sequence exists; search across packages returns only documentation hits (`LANGGRAPH_INTEGRATION_PLAN.md:189`).
- Multiple LangGraph entry points coexist (e.g., `createMasterAgentGraph`, `createCortexAgentGraph`, `kernel workflow`) without a consolidated n0 state machine.

### Fragmented State Models
- Distinct annotations (`AgentStateAnnotation`, `CortexStateAnnotation`, `WorkflowStateAnnotation`, etc.) exist across packages (`packages/agents/src/MasterAgent.ts:20`, `packages/agents/src/CortexAgentLangGraph.ts:17`, `packages/kernel/src/kernel.ts:21`).
- No shared `N0State` type with `{ input, session, ctx, messages, output }` signature, complicating unified orchestration.

### Tool Dispatch & Hook Integration Gaps
- Tool execution flows inside `MasterAgent.ts` and subagents call adapters directly, bypassing a centralized `tool_dispatch` node that would enforce PreToolUse/PostToolUse hooks and spool budgets.
- Hooks package exists, but no orchestration glue ensures `pre_prompt_hooks` or `tool_dispatch` semantics.

### Spool/Budgeted Parallelism Missing
- No `spool` API or equivalent parallel execution orchestrator could be found (`rg "spool" -n packages` yields no matches), so agent.autodelegate-style fan-out is undefined.

### Session/Model Management Fragmentation
- The blueprint expects `/model` command to influence the parent model selection in n0. Commands expose `model` metadata, but orchestration code lacks wiring to honor per-command model overrides.

### Logging/Streaming Consolidation
- Existing streaming utilities (`packages/agents/src/langgraph/streaming.ts`) operate per-agent. There is no single `stream_and_log` node that normalizes output paths (`Logs/...`) as described in blueprint.

### Integration Plan Mismatch
- `LANGGRAPH_INTEGRATION_PLAN.md` still references “Stage 0 – Placeholder & Mock Remediation”, clashing with the already sophisticated graphs observed. Plan needs refactor-focused framing, not greenfield.

## Potential Risks & Errors
- Continued ad-hoc use of `randomUUID` replacements occurred recently (commands runner). Other packages (`packages/agents/src/lib/secure-random.ts`, `packages/orchestration/src/lib/secure-random.ts`) should be used consistently to avoid regressions.
- Direct adapter calls (e.g., `createMLXAdapter()` in `MasterAgent.ts:63`) bypass centralized budget enforcement, risking inconsistent guardrails.
- Without unified state, compaction hooks may diverge between memories package and agent graphs, risking double-compaction or missed hooks.

## Recommendations
1. **Architecture Audit:** Catalogue all existing LangGraph state machines and map nodes to the seven-node n0 target, identifying reuse opportunities instead of rebuilds.
2. **Define `N0State`:** Introduce a shared state interface in `@cortex-os/orchestration` and adapt existing graphs to comply via adapter layers.
3. **Implement `tool_dispatch`:** Build a wrapper node that routes through hooks and budgets, reusing `commands` security helpers to enforce allow lists.
4. **Design Spool API:** Add `spool.run` under `packages/orchestration/src/` and retrofit PRP/agent fan-out to use it, enabling consistent parallel budgeting.
5. **Revise Integration Plan:** Update `LANGGRAPH_INTEGRATION_PLAN.md` to focus on migration sequencing: state unification → tool dispatch layer → spool integration → streaming standardization.
6. **Add Verification Harness:** Create integration tests ensuring slash commands trigger orchestration with correct hooks, budgets, and streaming outputs.
