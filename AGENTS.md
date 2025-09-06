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

Run the following checks before submitting a commit:

```bash
# Run pre-commit on specific changed files (replace with actual filenames)
pre-commit run --files path/to/changed_file1.py path/to/changed_file2.js
# Or run on all files
pre-commit run --all-files
# For code changes
pnpm lint
pnpm test
# For documentation-only changes
pnpm docs:lint
```

