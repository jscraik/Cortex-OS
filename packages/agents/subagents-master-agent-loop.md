Yes — adding Slash Commands to Cortex-OS is absolutely worth it. They give you a deterministic control surface that complements subagents + hooks:
 • Commands = user intent you can trust (run exactly, every time).
 • Hooks = policy & automation (run at lifecycle events).
 • Subagents = capability (task-specific workers and subgraphs).

Together, they reduce “LLM guesswork” and make your REPL feel tight and composable.

Here’s a lean plan that fits your LangGraph.js stack and the packages you mentioned.

⸻

What to build (Cortex-flavored)

Create a small package @cortex/commands that your REPL / orchestration layer calls before handing input to the LLM. If input starts with /, you execute a command path; otherwise you pass through to n0.

Scopes & locations (portable):
 • Project: ./.cortex/commands/**.md  ← highest precedence
 • User: ~/.cortex/commands/**.md

File format (Markdown + frontmatter):

---

description: Create a single git commit with message
argument-hint: [message]
model: inherit                      # optional; else inherit parent
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*)
---

## Context

- Status: !`git status`
- Diff:   !`git diff --staged`

## Your task

Create a commit with message: $ARGUMENTS

 • ! prefix → run a pre-approved Bash snippet and splice its stdout into the prompt.
 • @path → include file contents (with size cap).
 • $ARGUMENTS or $1, $2, … → argument substitution.
 • allowed-tools → tight allow-list for anything the command can invoke.

⸻

Minimal architecture

~/packages
  ├─ agents           # subagent loader/subgraph factory (you already have)
  ├─ hooks            # “Cortex Hooks” (policy layer)
  ├─ commands         # NEW: command loader + parser + runner
  ├─ orchestration    # n0 (master graph) — integrate parser + dispatch
  ├─ prp-runner       # format/lint/test executors (called by commands & hooks)
  └─ kernel           # fs/shell/web surfaces; enforce allow-lists

@cortex/commands package (MVP)

What it exports
 • loadCommands() → Map of {name, description, model, allowedTools, templateFn}
 • parseSlash(input: string) → {cmd, args[]} or null
 • runCommand(cmd, args, ctx) → returns a structured result (possibly calls a subagent/subgraph)

Loader (supports both project and user scopes, project wins):
 • Parse frontmatter (description, argument-hint, model, allowed-tools).
 • Build a tiny template function that:
 • Substitutes $ARGUMENTS/positional args.
 • Processes ! blocks by calling a sanitized Bash runner from kernel.
 • Resolves @file references with size limits and path allow-list.

Runner
 • If model is set: instantiate/bind that model for this one turn (LangGraph node or direct chat call).
 • Bind only the tools listed in allowed-tools; else inherit parent’s set.
 • Produce a single message to n0 or directly invoke a subagent if the command is essentially a precompiled prompt for one.

⸻

Integration points (where this helps)
 • orchestration (n0)
 • On user input: parseSlash() → if hit, runCommand() and short-circuit the LLM.
 • /agents can list subagents (from @cortex/agents), create via agent.create, or open files in .cortex/agents/.
 • /compact maps to your existing memory compaction node.
 • /model sets the parent model for this session (updates LangGraph config).
 • packages/agents
 • /agents becomes a friendly façade over your subagent creator + hot-reload.
 • You can ship project templated commands that delegate to subagents (/review, /test, /lint).
 • prp-runner
 • /format, /lint, /test = deterministic entry points to your runners.
 • Also callable from hooks (e.g., PostToolUse).
 • kernel
 • Provide runBashSafe(cmd, allowlist) for ! blocks with timeouts, env scrub, and path allow-lists.
 • Provide readFileCapped(path, bytes, allowlist) for @ includes.
 • hooks
 • /permissions and /config can actually write .cortex/settings.* or update your hook configs.
 • Hooks can trigger on commands too (e.g., UserPromptSubmit sees the raw /…).

⸻

Prioritized command set (start tiny, grow later)

Phase 1 (MVP, 1–2 days of work)
 • /help — list built-ins + discovered commands (+ scope tag).
 • /agents — list/create/edit subagents (uses agent.create tool).
 • /model — show/change parent model for session.
 • /compact — compact thread with optional focus.

Phase 2 (productivity)
 • /review — template that calls agent.code-reviewer.
 • /test — call test-runner subagent or prp-runner directly.
 • /format — run your format pipeline; respect changed files.
 • /status — show health checks, model, tools, paths, repo branch.

Phase 3 (power user)
 • /config — view/edit settings (.cortex/settings.json).
 • /permissions — adjust allow-lists (writes to kernel/hook config).
 • /memory — open/edit persistent memory docs (CORTEX.md).
 • /mcp equivalent — if/when you add connector servers.

⸻

Tiny code skeletons

Parser

export function parseSlash(input: string) {
  if (!input.trim().startsWith('/')) return null;
  const [head, ...rest] = input.trim().slice(1).split(/\s+/);
  return { cmd: head.toLowerCase(), args: rest };
}

Command runner (sketch)

export async function runCommand(cmd: LoadedCommand, args: string[], ctx: RunCtx) {
  const prompt = await renderTemplate(cmd.template, args, ctx);  // substitutes $, runs !, resolves @
  const model = pickModel(cmd.model, ctx.parentModel);
  const tools = resolveAllowedTools(cmd.allowedTools, ctx.availableTools);
  const bound = tools ? model.bindTools(tools) : model;
  const res = await bound.invoke([ new SystemMessage(prompt) ]);
  return { text: asText(res.content), metadata: { command: cmd.name } };
}

Render helpers
 • renderTemplate():
 • applyArgs(template, args)
 • await expandBangs(template, runBashSafe)
 • await expandAtRefs(template, readFileCapped)

⸻

Security you should actually enforce
 • Bash !: require allowed-tools to include an exact Bash(…) pattern for each permitted command; deny otherwise.
 • File @: cap bytes (e.g., 100 KB per include, 1 MB total), only allow project workspace globs.
 • Time/CPU: per-command timeout, per-preexec timeout.
 • Logging: record {command, args, cwd, user, tools, duration} to your audit log.

⸻

Why it’s worth it
 • Determinism: common workflows stop depending on prompt luck.
 • Team ergonomics: shareable project commands (.cortex/commands) give a standard UX in the REPL.
 • Composability: commands can call subagents and trigger hooks—clean separation of what vs when.
 • Low surface area: the parser + loader are ~300–400 LOC and reuse your existing subagent/hook/kernel pieces.

If you want, I can draft the @cortex/commands skeleton with loader + parser + a few built-ins (/help, /agents, /model, /compact) so you can wire it into n0 right away.
