# Cortex-OS Subagents

> Create and use specialized **Cortex-OS** subagents for task-specific workflows, better context management, and governed tool access.

Subagents in Cortex-OS are specialized assistants invoked by the **Cerebrum** and ASBR runtime. They carry their own system prompt, tool policy, and context window. They run under MCP/A2A rules, route through the Model Gateway (MLX → Ollama → Frontier), and attach proofs.

---

## What are subagents?

Subagents are pre-configured, single-purpose assistants. Each subagent:

- Has a clear purpose and expertise area
- Uses its **own context window** separate from the main thread
- Declares an explicit **tool allowlist** (including MCP tools)
- Includes a **system prompt** and **policy** that guide behavior and routing
- Emits **CloudEvents** and captures **provenance** for audits

Cerebrum delegates to subagents when a task matches their expertise, or you can invoke them explicitly from **cortex-cli** or the Web UI.

---

## Key benefits

- **Context preservation**: Separate context windows avoid polluting the main conversation
- **Specialized expertise**: Domain-tuned prompts and tools raise task success rates
- **Reusability**: Check into VCS and reuse across projects and teams
- **Granular permissions**: Per-subagent tool and egress policy
- **Determinism and proofs**: All calls pass through contracts with evidence pointers

---

## Quick start

### 1) Open the subagents manager

```bash
cortex agents         # TUI manager
# or
cortex agents new     # guided creation
```

### 2) Choose scope

- **Project subagent**: `.cortex/agents/` (highest priority)
- **User subagent**: `~/.cortex/agents/` (lower priority)

### 3) Define the subagent

- Describe purpose and when to use it
- Select tools (or inherit)
- Set **policies** (privacy, cost ceiling, target latency)
- Edit the system prompt (`cortex agents edit <name>`)

### 4) Save and use

- Cerebrum will auto-delegate when appropriate
- Or invoke explicitly:

```bash
cortex use code-reviewer --on HEAD~1..HEAD
```

---

## File locations

| Type        | Location            | Scope                         | Priority |
| :---------- | :------------------ | :---------------------------- | :------- |
| **Project** | `.cortex/agents/`   | Available in current project  | Highest  |
| **User**    | `~/.cortex/agents/` | Available across all projects | Lower    |

Name conflicts resolve to **project** first.

---

## File format

Subagents are Markdown with YAML frontmatter.

```markdown
---
name: code-reviewer
description: Expert code review specialist. Use immediately after writing or modifying code.
tools: git.diff, fs.read, grep, shell.run # Optional; inherit all if omitted
policies:
  privacy: true # true pins to MLX/local only
  cost_ceiling_usd: 0.50 # max allowed cloud spend per invocation
  target_latency_ms: 800
  evidence_required: true
routing:
  capability: chat-completion # used by router/model-gateway
  fallbacks: [ollama, frontier] # after mlx
context:
  window: project # project|session|isolated
  include_paths: ['src/**', 'tests/**']
---

You are a senior code reviewer ensuring high standards of quality, security, and maintainability.

Checklist:

- Simplicity/readability, naming, no duplication
- Error handling, input validation, tests
- Secrets exposure, performance considerations

Behavior:

1. Run git diff on the given range
2. Focus review on modified files
3. Output findings grouped by: Critical, Warnings, Suggestions
4. Provide concrete, minimal code fixes
```

### Field reference

| Field                        | Req | Description                                          |
| :--------------------------- | :-: | :--------------------------------------------------- |
| `name`                       | ✔  | Lowercase kebab-case unique id                       |
| `description`                | ✔  | When and why to invoke                               |
| `tools`                      |  –  | Comma-sep MCP tool ids (omit to inherit all allowed) |
| `policies.privacy`           |  –  | `true` forces **MLX/local** only                     |
| `policies.cost_ceiling_usd`  |  –  | Max cloud spend per call                             |
| `policies.target_latency_ms` |  –  | Hint for router                                      |
| `policies.evidence_required` |  –  | Require proofs and citations                         |
| `routing.capability`         | ✔  | e.g., `chat-completion`, `text-embedding`, `rerank`  |
| `routing.fallbacks`          |  –  | Ordered provider fallbacks                           |
| `context.*`                  |  –  | Context window and include lists                     |

---

## Available tools

Subagents can use any MCP tools registered in **packages/mcp-registry** plus built-ins exposed by ASBR (e.g., `fs.read`, `git.diff`, `shell.run`) and **Model Gateway** capabilities (`/chat`, `/embeddings`, `/rerank`).

- Omit `tools` to **inherit** all allowed tools for the thread
- Specify tools to **restrict** access

Tip: `cortex agents edit <name>` provides an interactive tool picker from the MCP registry.

---

## Managing subagents

### CLI (recommended)

```bash
cortex agents                 # list, status, precedence
cortex agents new             # create interactive
cortex agents edit <name>     # edit prompt, tools, policies
cortex agents rm <name>       # delete
cortex agents doctor          # validate schemas and tool bindings
```

### Direct file management

```bash
mkdir -p .cortex/agents
$EDITOR .cortex/agents/test-runner.md
```

All subagent files are validated against JSON Schemas in `.cortex/schemas/agents/*.schema.json`.

---

## Invocation

### Automatic delegation

Cerebrum matches task intent to `description` and `routing.capability`, checks `policies`, then routes through **Model Gateway**:
`mlx → ollama → frontier` with circuit breakers and sticky sessions.

### Explicit invocation

```bash
cortex use test-runner --on "packages/**"
cortex use code-reviewer --on HEAD~1..HEAD
cortex use debugger --arg "stack=..."
```

---

## Examples

### Debugger

```markdown
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively on failures.
tools: fs.read, shell.run, grep, git.diff
policies: { privacy: true, target_latency_ms: 800, evidence_required: true }
routing: { capability: chat-completion, fallbacks: [ollama, frontier] }
context: { window: session }
---

Process:

1. Capture error and stack
2. Reproduce locally
3. Isolate failure location
4. Apply minimal fix
5. Verify and document
   Output: root cause, evidence, patch, tests, prevention steps.
```

### Data scientist

```markdown
---
name: data-scientist
description: SQL and analytics expert. Use for data exploration and reporting.
tools: shell.run, fs.read
policies:
  { privacy: false, cost_ceiling_usd: 1.50, target_latency_ms: 3000, evidence_required: true }
routing: { capability: chat-completion, fallbacks: [mlx, frontier] }
context: { window: project, include_paths: ['analytics/**'] }
---

Steps:

1. Define the analysis question
2. Write efficient SQL with comments
3. Run queries via approved runners
4. Summarize findings with assumptions and next steps
```

---

## Best practices

- **Design single-responsibility subagents**
- **Write detailed prompts** with concrete checklists and outputs
- **Limit tools** to the minimum needed
- **Set policies** to control privacy, latency, and cost
- **Version control** project subagents in `.cortex/agents`
- **Golden outputs**: keep exemplar I/O pairs for determinism

---

## Advanced usage

### Chaining

```bash
cortex do "code-analyzer → optimizer" --on src/**
```

### Dynamic selection

Cerebrum selects subagents by `description`, `capability`, tool availability, policy, and router health/quality scores.

---

## Performance notes

- Separate contexts reduce main-thread bloat
- First-use latency may increase while the subagent acquires needed context
- Set `target_latency_ms` and `privacy` to guide provider selection

---

## Wireframe (flow)

```text
User → cortex-cli / Web / API
      │
      ▼
Cerebrum (intent match, policy check)
      │ plan→route→execute→prove
      ▼
ASBR-lite (contracts, A2A, provenance)
      │
      ▼
Subagent (tools, prompt, context)
      │
      ▼
Model Gateway (MLX → Ollama → Frontier) ──► Providers
      │
      ▼
CloudEvents + Evidence → Memories/RAG → Observability
```

---

## Standards

- **Contracts**: JSON Schema 2020-12; CloudEvents 1.0; RFC 9457 Problem+JSON
- **Security**: deny-by-default egress; per-tool RBAC; audit logs
- **Eng**: SemVer for subagent schema; Conventional Commits; ESLint/Prettier
- **A11y**: CLI output labeled; no color-only signals
