# Cortex-OS Documentation Audit

## Overview

Audit of `/docs` for architecture decision records (ADRs), guides, API references, and accessibility coverage.

## Findings

- **ADRs:** Only a single `adr-template.md`; no recorded decisions.
- **Guides:** Missing user guides, runbook, and "How we test" pages.
- **API References:** No API docs or OpenAPI specification found.
- **Runnable Examples:** None present.
- **Accessibility:** No a11y guidance; no images requiring alt text.

## Score

Documentation completeness: **2/10**

## Fix Plan

1. Capture key architectural decisions using ADRs.
2. Add API reference synced with an OpenAPI spec (`pnpm docs:api`).
3. Provide runnable code examples with tests.
4. Create "How we test" and "Runbook" guides.
5. Document accessibility guidelines and ensure images include alt text.

## TDD Plan

- Doc linting via Prettier in CI.
- Link checking using `pnpm docs:links`.
- Execute example code in CI tests.
