---
description: "Instructions for preventing GitHub Copilot from suggesting quality gate bypasses and ensuring proper error resolution."
applyTo: "*_/*.{md,mdx,txt,json,yml,yaml,js,ts,tsx,py,java,go,rs,cs,php,rb,swift,kt,scala,ex,clj,hs}"
---

<!--
file_path: ".github/instructions/copilot-qualityGates.instructions.md"
description: "Instructions for preventing GitHub Copilot from suggesting quality gate bypasses and ensuring proper error resolution."
maintainer: "@jamiescottcraik"
last_updated: "2025-08-09"
version: "1.0.0"
status: "active"
-->

# GitHub Copilot Quality Gate Instructions

⚠️ Canonical Specification. All development must comply. These rules prevent bypassing of security and quality controls and are enforced by CI and mandatory peer review.

> Canonical References:
>
> - [Code Review Standards](./copilot-codeReview.instructions.md)
> - [Commit Message Standards](./copilot-commitMessage.instructions.md)
> - [Test Generation Standards](./copilot-testGeneration.instructions.md)
> - [Pull Request Description Standards](./copilot-pullRequest.instructions.md)
> - [Canonical References](../../docs/architecture/canonical-references.md)

## Core Principle: Never Bypass Quality Gates

CRITICAL RULE: Never suggest using `--no-verify`, `--no-hooks`, `SKIP_HOOKS`, or any other mechanism to bypass quality gates, pre-commit hooks, or CI/CD checks.

## When Quality Gates Fail

### 1. Pre-commit Hook Failures

You must: investigate the error, fix the underlying issue (formatting, linting, tests), run the right tools, and only recommit after fixing.

### 2. Common Fixes for Hook Failures

Formatting:

```bash
pnpm run format
ruff format .
prettier --write .
```

Linting:

```bash
pnpm run lint:fix || pnpm run lint
ruff check . --fix
eslint --fix .
```

Dependencies:

```bash
pnpm install
uv pip install -e .[dev]
```

Tests:

```bash
pnpm test
pytest -xvs
```

### 3. Forbidden Suggestions

Never suggest:

- `git commit --no-verify`
- `git push --no-verify`
- `SKIP_HOOKS=1 git commit`
- `HUSKY_SKIP_HOOKS=1 git commit`
- `git commit --no-hooks`

### 4. Correct Approach

1. Read the error, 2) find root cause, 3) fix, 4) verify locally, 5) commit normally (no bypass flags).

### 5. Emergency Situations

Even in emergencies: create a hotfix branch, fix properly, request review, and document the reason.

## Examples

Wrong:

```bash
git commit --no-verify -m "quick fix"
SKIP_HOOKS=1 git commit -m "emergency fix"
```

Correct:

```bash
pnpm run lint:fix
pnpm run format
pnpm test
git add .
git commit -m "fix: resolve linting and formatting issues"
```

## Why Gates Matter

- Security: prevent secrets/vulnerabilities
- Code Quality: consistent formatting and standards
- Reliability: tests pass before deploy
- Accessibility: verify WCAG in this project
- Documentation: keep docs and code in sync

✅ End of specification.

© 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
