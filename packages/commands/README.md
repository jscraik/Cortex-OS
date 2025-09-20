# @cortex-os/commands

Slash command loader/parser/runner for Cortex-OS.

- Loads markdown commands from `./.cortex/commands/**/*.md` (project) and `~/.cortex/commands/**/*.md` (user)
- Parses frontmatter: `description`, `argument-hint`, `model`, `allowed-tools`
- Template features:
  - `$ARGUMENTS`, `$1`, `$2`, ... substitution
  - ``!`bash snippet` `` executes via provided `runBashSafe` if allowed by `allowed-tools`
  - `@path/to/file` includes file content via provided `readFileCapped` with size caps and allowlist

Exports:

- `loadCommands()`
- `parseSlash()`
- `runCommand()`
- Built-ins: `/help`, `/agents`, `/model`, `/compact`, `/status`, `/test`, `/format`, `/lint`

Security: The runner relies on injected safe functions from the kernel for shell/file access.

Quick integration (sketch):

```ts
import { parseSlash, loadCommands, runCommand, createBuiltinCommands, createDefaultAdapters } from '@cortex-os/commands';

const commands = await loadCommands({ projectDir: process.cwd() });
// add built-ins (wire real adapters)
// You can inject your own ModelStore for session-scoped model selection
const myModelStore = {
  getModel: (sid: string) => (sid === 'session-1' ? 'gpt-4o' : 'inherit'),
  setModel: async (sid: string, model: string) => {
    // persist model for session id
  },
};
const adapters = createDefaultAdapters('session-1', myModelStore);
for (const c of createBuiltinCommands(adapters)) {
  commands.set(c.name, c);
}

async function handleInput(input: string) {
  const parsed = parseSlash(input);
  if (!parsed) return null; // pass to LLM
  const cmd = commands.get(parsed.cmd);
  if (!cmd) return { text: `Unknown command: /${parsed.cmd}` };
  return runCommand(cmd, parsed.args, {
    cwd: process.cwd(),
    runBashSafe: async (cmd, allow) => ({ stdout: '', stderr: '', code: 0 }),
    readFileCapped: async (p, max) => (await fs.promises.readFile(p, 'utf8')).slice(0, max),
    fileAllowlist: ['**/*'],
  });
}
```

New built-ins:

- `/status` shows `cwd`, `model`, and repo `branch` (if git available)
- `/test [pattern]` runs the workspace test smart script, returning pass/fail summary
- `/format [changed]` runs `biome` formatter (changed-only if specified)
- `/lint [changed]` runs eslint/security linters (changed-only if specified)

Markdown command example:

```md
---
description: Create a single git commit with message
argument-hint: [message]
model: inherit
allowed-tools: ["Bash(git status:*)", "Bash(git add:*)", "Bash(git commit:*)"]
---
## Context
- Status: !`git status`
- Diff:   !`git diff --staged`

## Your task
Create a commit with message: $ARGUMENTS
```
