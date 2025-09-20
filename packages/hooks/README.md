# @cortex-os/hooks

Deterministic lifecycle hooks shared across agents, orchestration, prp-runner, and kernel.

- Events: `SessionStart|SessionEnd|UserPromptSubmit|PreToolUse|PostToolUse|SubagentStart|SubagentStop|PreCompact|Stop|Notify`
- Backends: `command | js | graph | http`
- Locations: `~/.cortex/hooks/*` (user) and `./.cortex/hooks/*` (project)

Quick use:

```ts
import { CortexHooks } from '@cortex-os/hooks';
const hooks = new CortexHooks();
await hooks.init();

export async function runTool(tool, input, meta) {
  const pre = await hooks.run('PreToolUse', { event: 'PreToolUse', tool: { name: tool.name, input }, cwd: meta.cwd, user: meta.user });
  for (const r of pre) {
    if (r.action === 'deny') return { error: r.reason };
    if (r.action === 'allow' && r.input !== undefined) input = r.input;
  }
  const out = await tool.invoke(input);
  await hooks.run('PostToolUse', { event: 'PostToolUse', tool: { name: tool.name, input }, cwd: meta.cwd, user: meta.user });
  return out;
}
```

See `.cortex/hooks` examples in repo root for sample configs.

## Configuration

You can place hook definitions under either `~/.cortex/hooks/*` (user) or `./.cortex/hooks/*` (project). Files may be `yaml|yml|json|js`.

Global settings may be defined at the root of the file or under the `hooks` key:

```yaml
hooks:
  settings:
    command:
      # Allowlist of binaries permitted by the command runner backend
      allowlist: [node, pnpm, npm, bash, sh, osascript, jq, echo, prettier]
  PreToolUse:
    - matcher: "Write|Edit|MultiEdit"
      hooks:
        - matcher: "*"
          type: js
          code: |
            const p = (ctx.tool && ctx.tool.input && (ctx.tool.input.file_path || ctx.tool.input.path)) || "";
            if (p.includes('/infra/prod/')) return { action: 'deny', reason: 'Protected path' };
            return { action: 'allow' };
```

Notes:

- The command runner strictly enforces an allowlist. If a command’s binary is not on the list, the action becomes `deny`.
- Defaults include: `node, pnpm, npm, bash, sh, osascript, jq, echo, prettier`.

## Telemetry & Rate Limiting

When `@cortex-os/observability` is present, hooks will emit structured logs and OTEL metrics/traces for `hook:result` events.

Environment variables:

- `CORTEX_HOOKS_LOG_LEVEL`: `debug | info | warn | error` (default `info`)
- `CORTEX_HOOKS_TELEMETRY_WINDOW_MS`: window for rate-limiting duplicate events (default `10000`)
- `CORTEX_HOOKS_TELEMETRY_MAX`: maximum events in a window per `{event:matcher:hookType:action}` key (default `100`)

Metrics emitted (when available):

- `cortex_latency_ms` via `recordLatency('hooks.hook_result', ...)`
- `cortex_operations_total` via `recordOperation('hooks.hook_result', success, runId, { event, action, decision })`
  - `decision` label is `allow` or `deny` (for other actions it carries the action string)

Traces:

- Each `hook:result` emission is wrapped in a span `hooks.hook_result` with attributes `{ event, action }` when tracing is available.
