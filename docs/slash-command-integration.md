# Slash Command Integration Notes

## Kernel Surface Expectations

- The brAInwav orchestrator now injects kernel-backed `runBashSafe` and `readFileCapped` helpers into slash command render contexts.
- Kernel allow-lists remain the source of truth; `fileAllowlist` is populated directly from `kernelOptions.filesystem.allow`.
- Shell invocations rely on the kernel tool registry (`shell.exec` or `kernel.bash`), preserving allow-list enforcement and timeout semantics configured in the kernel bindings.

## Command Metadata Propagation

- `runCommand` attaches a `command` metadata block containing `model`, `allowedTools`, and other descriptors to every slash command result.
- The LangGraph N0 node propagates this metadata through `commandResult` so downstream hooks/subagents can enforce policies without rehydrating command definitions.

## Logging and Traceability

- Run identifiers are generated via `crypto.randomUUID` to satisfy brAInwav deterministic logging requirements—no reliance on `Math.random` remains in the slash command pipeline.
- Both start and success log events carry the `runId`, enabling trace correlation across orchestrator, kernel, and hook telemetry streams.

## Policy Alignment Checklist

| Concern | Enforcement Point | brAInwav Expectation |
| --- | --- | --- |
| Bash execution | Kernel tool wrapper + command allow-list | Deny if either layer rejects the command |
| File inclusion | `fileAllowlist` merged from kernel config | Deny unless the allow-list explicitly matches the path |
| Model routing | `command.metadata.model` | Hooks/readers honour per-command overrides |
| Tool governance | `command.metadata.allowedTools` | Subagents restrict downstream tool use accordingly |

Maintain these guardrails when extending slash command behaviour to ensure hook policies and subagent governance remain consistent across the brAInwav stack.
