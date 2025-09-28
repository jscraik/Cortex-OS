# Configuration

Configuration relies on environment variables and `.env` files.

- `.env.example` – base template.
- `.env.development.example` – development overrides.
- Set `CORTEX_OS_HOME` to control workspace directory.

Package-specific configs live in `config/` using JSON or TOML. Adjust via `pnpm run config:<name>` scripts.

## File-based Cortex governance

Cortex-OS now loads first-class configuration from the `.cortex/` directory. Settings can be provided in the repository
or in `~/.cortex/` (user scope). Project files override user scope when names collide.

### `.cortex/agents`

- Markdown (`.md/.markdown`) or structured (`.yaml/.yml/.json`) files describe subagents.
- Front matter or YAML keys map to `SubagentConfig` fields (see `.cortex/schemas`).
- Body content becomes the `systemPrompt` when front matter omits `systemPrompt`.
- Example project agents ship in:
  - `.cortex/agents/code-reviewer.md` – policy-focused reviewer
  - `.cortex/agents/test-engineer.yaml` – validation specialist
  - `.cortex/agents/release-notes.md` – release documentation author

### `.cortex/commands`

- Markdown files contain slash command templates with front matter metadata.
- Supported keys: `name`, `description`, `argument-hint`, `model`, `allowed-tools`.
- Template bodies may embed shell substitutions (``!`command` ``) that execute through the command runner.
- Default project commands:
  - `.cortex/commands/daily-summary.md`
  - `.cortex/commands/incident-review.md`
  - `.cortex/commands/sprint-goals.md`

### `.cortex/hooks`

- YAML/JSON/JS modules define lifecycle hooks executed around tool usage.
- Settings merge by event with user scope first, project scope second.
- `core.yaml` enforces protected path guards and kicks off lint/test smart wrappers after edits or bash executions.

Run `pnpm check:agents-hash` to ensure agent files remain in sync with governance digests after edits.
