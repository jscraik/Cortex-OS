Love the north-star. Here’s a concrete n0 (Master Agent Loop) blueprint for LangGraph.js that lines up with your diagram and the packages you’ve been carving out: agents, orchestration, prp-runner, kernel (+ the “cortex hooks” and “slash commands” layers we discussed).

⸻

n0 in one page
 • n0 is a LangGraph StateGraph that:

 1. parses user input (slash vs natural),
 2. runs hooks (policy),
 3. selects tools/subagents,
 4. executes with budgets in the spool,
 5. streams output, compacts memory, and logs.

It doesn’t “do” much itself; it binds capabilities from packages and enforces invariants.

⸻

Packages & responsibilities
 • @cortex/kernel — execution surfaces (Filesystem, Bash, WebFetch) with strict allow-lists, timeouts, and path/network guards.
 • @cortex/agents — file-defined subagents in .cortex/agents/**→ compiled to subgraphs → exposed as tools agent.<name>.
 • @cortex/hooks — deterministic lifecycle hooks (PreToolUse, PostToolUse, UserPromptSubmit, SubagentStart/Stop, SessionStart/End, PreCompact, Notify).
 • @cortex/commands — slash command loader/runner from .cortex/commands/**. Commands can run !bash snippets, include @files, set allowed-tools, and call subagents.
 • @cortex/prp-runner — format/lint/test pipelines (invoked by PostToolUse hooks and commands).
 • @cortex/orchestration — owns the n0 graph, streaming, memory compaction, cost telemetry, and the spool (parallel task runner).

These packages are thin and composable. n0 wires them.

⸻

n0: State shape & nodes

State

type N0State = {
  input: string;
  session: { id: string; model: string; user: string; cwd: string };
  ctx?: Record<string, any>;           // scratchpad for tools/commands
  messages?: BaseMessage[];            // transcript for this turn
  output?: string;                     // final text to stream
};

Nodes (map to your boxes)

 1. parse_or_command — if / → run @cortex/commands and finish; else hand off to LLM path.
 2. pre_prompt_hooks — @cortex/hooks.run('UserPromptSubmit'). Can mutate input or deny.
 3. plan_or_direct — small LLM that decides whether to plan (TodoWrite/NotebookRoad) or go direct.
 4. llm_with_tools — parent model bound to:
 • kernel tools: Read/Grep/Glob/Edit/Write/Bash/WebFetch
 • subagent tools: agent.* from @cortex/agents
 • orchestration tools: agent.autodelegate, agent.create, etc.
Tool calls are routed through tool_dispatch.
 5. tool_dispatch — wrapper that runs PreToolUse/PostToolUse hooks, enforces allow-lists, and sends jobs to the spool.
 6. compact_if_needed — memory compaction (CLAUDE.md analogue). Fires PreCompact hook.
 7. stream_and_log — StreamGen-like: progressively emit answer; append to Logs / Message History; fire Stop hook.

Edges: parse_or_command → pre_prompt_hooks → plan_or_direct → llm_with_tools → compact_if_needed → stream_and_log.

⸻

Wiring n0 (LangGraph.js skeleton)

import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CortexHooks } from "@cortex/hooks";
import { bindKernelTools } from "@cortex/kernel";
import { loadSubagents, subagentTools } from "@cortex/agents";
import { parseSlash, runSlash } from "@cortex/commands";

export async function buildN0() {
  const hooks = new CortexHooks(); await hooks.init();

  // 1) discover subagents & make tools
  const subMap  = await loadSubagents();
  const agentTs = await subagentTools(subMap); // returns array of DynamicTools `agent.<name>`

  // 2) base tools (kernel surfaces)
  const kernelTs = bindKernelTools(/*cwd, guards, allowlists*/);

  // 3) parent model (can be swapped via /model)
  const parentModelName = "sonnet";
  const parentModel = new ChatAnthropic({ model: parentModelName })
                        .bindTools([...kernelTs, ...agentTs /*+ orchestration tools*/]);

  type S = N0State;
  const g = new StateGraph<S>({ channels: { input: null, session: null, ctx: null, messages: null, output: null } });

  g.addNode("parse_or_command", async (s) => {
    const parsed = parseSlash(s.input);
    if (!parsed) return {};
    const result = await runSlash(parsed, { session: s.session });
    return { output: result.text, messages: [...(s.messages||[]), new HumanMessage(s.input)] };
  });

  g.addNode("pre_prompt_hooks", async (s) => {
    const rs = await hooks.run('UserPromptSubmit', { event: 'UserPromptSubmit', cwd: s.session.cwd, user: s.session.user });
    for (const r of rs) if (r.action === 'deny') return { output: `Denied: ${r.reason}` };
    return {};
  });

  g.addNode("llm_with_tools", async (s) => {
    const res = await parentModel.invoke([
      new SystemMessage("You are n0. Use tools and subagents when useful. Respect policies."),
      new HumanMessage(s.input),
    ]);
    return { messages: [...(s.messages||[]), res], output: typeof res.content === "string" ? res.content : JSON.stringify(res.content) };
  });

  // … add compact_if_needed and stream_and_log similarly …

  // entry & conditional routing
  g.setEntryPoint("parse_or_command");
  g.addConditionalEdges("parse_or_command", (s)=> s.output ? "stream_and_log" : "pre_prompt_hooks");
  g.addEdge("pre_prompt_hooks", "llm_with_tools");
  g.addEdge("llm_with_tools", "compact_if_needed");
  g.addEdge("compact_if_needed", "stream_and_log");

  return g.compile({ checkpointer: new MemorySaver() });
}

In tool_dispatch, wrap every tool call with hooks.run('PreToolUse') / hooks.run('PostToolUse'); enforce per-tool allow-lists and budgets; route longer jobs to the spool.

⸻

Spool (parallel execution & budgets)
 • Lives in @cortex/orchestration.
 • API: spool.run(tasks, {ms, tokens, concurrency}) → Promise<Settled[]>.
 • Used by:
 • agent.autodelegate (fan-out K subagents).
 • prp-runner (parallel format/lint/test).
 • batch operations (your “BatchTool”).

Budget rule of thumb: split parent token/time budget across K subtasks; enforce timeouts.

⸻

Where each diagram box lands
 • User Interaction Layer → REPL/VSCode/CLI calls into buildN0() runner.
 • n0 (Master Agent Loop) → the compiled graph above.
 • ToolEngine & Scheduler → LangChain tools bound to the parent model + the spool.
 • dispatch_agent (sub-agent) → agent.* tools from @cortex/agents.
 • View/LS/Glob/Edit/Write/Grep/Bash/WebFetch → @cortex/kernel tools (with guards).
 • BatchTool → Orchestration tool that fans out via spool.
 • TodoWrite / NotebookRoad → planning nodes (optional; add as LangGraph subgraphs).
 • Storage & Memory → MemorySaver + your CLAUDE.md analogue (project memory) + message logs.
 • StreamGen → stream_and_log node (progressive write to UI/CLI).

⸻

Definition of Done (n0 v1)
 • Slash: /help, /agents, /model, /compact working.
 • Hooks: PreToolUse blocks disallowed writes; PostToolUse triggers prp-runner formatters.
 • Subagents: dropping .cortex/agents/<name>.md yields a tool agent.<name>; agent.create exists.
 • Budgets: per-call token/time enforced; subagent depth ≤ 2; recursion guard.
 • Kernel guards: path allow-lists; network allow-list; shell env scrubbed.
 • Spool: agent.autodelegate can fan-out 2–3 subagents in parallel and merge.
 • Logs: Logs/MessageHistory for n0; Logs/Subagents/<name>/<ts>.jsonl for subagents.
 • Compact: compaction node respects a size target and fires PreCompact.

⸻

Practical starter set (files you can drop in)
 • .cortex/agents/code-reviewer.md — code review subagent (tools: Read/Grep/Glob/Bash).
 • .cortex/commands/review.md — template that calls the reviewer with !git context.
 • .cortex/hooks/protect.yml — deny Edit|Write to /infra/prod/**.
 • .cortex/hooks/format.yml — PostToolUse → run @cortex/prp-runner format on touched files.

⸻

Why this scales
 • Deterministic: hooks & commands take non-determinism out of the hot path.
 • Composable: subagents are just tools; tools are just surfaces; n0 only orchestrates.
 • Portable: file-defined agents/commands live in the repo or ~/.cortex, versioned with the codebase.

If you wire the skeleton above, your apps/packages will share the same n0 spine while letting each domain add subagents, commands, and hooks locally. That’s the Master Agent Loop as an operating system, not a script.
