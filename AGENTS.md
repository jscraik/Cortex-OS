# AGENTS

These instructions apply to all developers and AI agents working in this repository.

## Workflow

- Practice strict Test-Driven Development (TDD).
  - Start with a failing test that defines each requirement.
  - Implement the minimal code to make the test pass.
  - Refactor while keeping tests green.
- Break work into micro-tasks.
  - Limit each commit to a single focused change.
  - Include tests and implementation in the same commit.

## Commit Policy

- Use Conventional Commits with clear scopes (e.g., `feat(auth): add login validation`).
- Reference related issue or task identifiers when available.
- Keep history linear; avoid amend or force-push operations.

## Validation

Run the following checks before submitting a commit (Husky hooks run automatically on commit):

```bash
# Quick local checks
pnpm biome:staged   # format + lint staged files
pnpm lint
pnpm test
# For documentation-only changes
pnpm docs:lint

# Emergency bypass (use sparingly)
# HUSKY=0 git commit -m "..."
```

## Persistent Agent Memory (Local Memory)

Enable persistent context across runs using Local Memory.

Setup:

- Start the Local Memory daemon (default base URL `http://localhost:3002/api/v1`).
- Export envs:
  - `LOCAL_MEMORY_BASE_URL` (e.g., `http://localhost:3002/api/v1`)
  - `LOCAL_MEMORY_API_KEY` (if configured)
  - `LOCAL_MEMORY_NAMESPACE` (optional)
  - `MEMORIES_ADAPTER` or `MEMORY_STORE` = `local | sqlite | prisma | memory`

Quick verify:

```bash
curl -sS http://localhost:3002/api/v1/health | jq .
```

Code path:

- Use `createStoreFromEnv()` from `@cortex-os/memories` to auto-select Local Memory when `LOCAL_MEMORY_BASE_URL` is present.
- Falls back to SQLite or in-memory based on envs.

Privacy note: follow `.cortex/rules/RULES_OF_AI.md` — avoid storing secrets or personal data without consent; prefer encryption where applicable.

## Agent Toolkit

Agents should leverage scripts in `agent-toolkit/tools` for code search, structural rewrites, diff review and validation. Use `just` recipes (`just scout`, `just codemod`, `just verify`) or call the wrappers directly. Run standard checks (`pnpm biome:staged`, `pnpm lint`, `pnpm test`, `pnpm docs:lint`) alongside these tools.

