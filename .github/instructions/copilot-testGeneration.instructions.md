---
description: "Guidelines for AI-assisted test generation in Cortex OS projects, ensuring accessibility, security, and maintainability."
applyTo: "*_/*.{ts,tsx,js,jsx,py,pyx,pyi,yml,yaml,toml,json,md,mdx,css,scss,sass,html,htm,vue,svelte,rs,go,java,c,cpp,h,hpp,sh,bash,zsh,fish,ps1,bat,cmd,mdc,sql,graphql,gql,proto,dockerfile,Dockerfile,makefile,Makefile}"
---

<!--
file_path: ".github/instructions/copilot-testGeneration.instructions.md"
last_updated: "2025-08-09"
maintainer: "@jamiescottcraik"
version: "1.1"
status: "active"
-->

# Test Generation Standards

> Canonical References:
>
> - [Code Review Standards](./copilot-codeReview.instructions.md)
> - [Commit Message Standards](./copilot-commitMessage.instructions.md)
> - [Markdown Documentation Standards](./copilot-markdown.instructions.md)
> - [Canonical References](../../docs/architecture/canonical-references.md)

## 1. Core Principles

1. Accessibility-First (WCAG 2.2 AA): UI tests must pass `jest-axe` or Playwright a11y audits with zero critical violations. Validate keyboard interactivity and labels.
2. Behavior-Driven: Model user intent and business logic, not implementation details.
3. Resilience & Security: Test async states, edge cases, auth flows, and schema validation.
4. Isolation & Repeatability: Keep tests atomic and self-contained; no state leakage.

## 2. Frontend Component Tests (React / Next.js)

### 2.1. Test File Header

```ts
/**
 * @file_path tests/components/ui/status-badge.test.tsx
 * @description Ensures the StatusBadge component is accessible, interactive, and resilient.
 * @maintainer @jamiescottcraik
 * @last_updated 2025-07-13
 * @version 1.0.0
 * @status active
 */
```

### 2.2. Mandatory Scenarios

- Initial Render & Accessibility: include a `jest-axe` audit.
- Keyboard Interactivity: test Tab/Enter/Space.
- State Changes: verify props/state updates.
- Async States: `role="status"` while loading; `role="alert"` on failure.
- Focus Management: modals/menus trap and restore focus.

## 3. Backend API Tests (Python / FastAPI)

### 3.1. Test File Header

```py
"""
file_path: tests/api/v1/test_auth_routes.py
description: Integration tests for the /api/v1/auth endpoints.
maintainer: @jamiescottcraik
last_updated: 2025-07-13
version: 1.0.0
status: active
"""
```

### 3.2. Mandatory Scenarios

- Happy Path (2xx)
- Invalid Input (400/422)
- Authentication & Authorization (401/403)
- Rate Limiting (429)
- Forced Server Error (500)
- Data Integrity using fixtures

## 4. Mocking & Test Data

- Frontend: use MSW; reset handlers after each test.
- Backend: use pytest fixtures; FactoryBoy/Faker for data.
- Isolation: ensure clean state between runs.

## 5. Quality Gates & Coverage

| Metric         | Threshold       | Notes                           |
| :------------- | :-------------- | :------------------------------ |
| Line Coverage  | ≥ 80% overall   | Critical paths may require 100% |
| Mutation Score | ≥ 60% (nightly) | Stryker/JS, mutmut/Python       |
| Flaky Tests    | 0 tolerated     | Intermittent failures rejected  |

## 6. End-to-End (E2E) Tests

- Framework: Playwright (optionally `axe-playwright`).
- Scope: critical journeys; include performance budgets.
- CI Matrix: Desktop Chromium + Mobile WebKit on PRs.

## 7. Developer Cheatsheet

- Queries: prefer `getByRole`, then `getByLabelText`; avoid `getByTestId`.
- Events: use `userEvent` over `fireEvent`.
- Async: prefer `findBy…` over fixed waits.
- Snapshots: avoid DOM snapshots; use Storybook/Chromatic for visuals.

## 8. AI-Powered Test Generation Prompt

ROLE: You are an expert Staff Engineer. Generate a complete test file for the provided source code, following these standards.

INSTRUCTIONS:

1. Detect frontend vs. backend; 2) emit a full test file including header; 3) cover all mandatory scenarios; 4) prioritize a11y, keyboard interaction, and resilience; 5) use MSW/fixtures; 6) output only the formatted code for the test file.

CONTEXT placeholders (replace with actual tooling if used):

````md
Source File Path: !read_file path/to/source/component.tsx

Source Code:

```ts
!read_file_content path/to/source/component.tsx
```
````

```

## 9–10. Golden Path Examples

See repository examples under `tests/` for full patterns of UI and API tests using accessibility audits and guard clauses.

## 11. Enforcement Pipeline

| Stage | Tool(s) | Action |
| :-- | :-- | :-- |
| Pre-Commit | Husky + pre-commit hooks | Run linters/tests on staged changes |
| CI: PR Gate | GitHub Actions | Run Vitest/Playwright and Python tests; block on failure |
| Nightly | GitHub Actions | E2E, budgets, mutation testing |

✅ End of specification.

© 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.

```
