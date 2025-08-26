---
description: "Guidelines for AI-assisted code reviews in Cortex OS projects, ensuring accessibility, security, and maintainability."
applyTo: "*_/*.{md,mdx,txt,json,yml,yaml,js,ts,tsx,py,java,go,rs,cs,php,rb,swift,kt,scala,ex,clj,hs}"
---

<!--
file_path: ".github/instructions/copilot-codeReview.instructions.md"
last_updated: "2025-08-09"
maintainer: "@jamiescottcraik"
version: "1.8"
status: "active"
-->

# Code Review Instructions

⚠️ Canonical Specification. All code must comply. These rules are the single source of truth for both human and AI developers and are enforced by CI and mandatory peer review.

> Canonical References:
>
> - [Commit Message Standards](./copilot-commitMessage.instructions.md)
> - [Test Generation Standards](./copilot-testGeneration.instructions.md)
> - [Markdown Documentation Standards](./copilot-markdown.instructions.md)
> - [Pull Request Description Standards](./copilot-pullRequest.instructions.md)
> - [Canonical References](../../docs/architecture/canonical-references.md)

## Overview

### Purpose

Guarantee that every line of code in this repository is accessible, secure, low in cognitive load, and highly maintainable.

### Core Principles

- Review Mandate: "Review like a Staff Engineer in a regulated industry—production-ready, airtight accessibility, provable security, zero waste."
- Structural Mandate: Prefer early returns to limit nesting. Keep files under a 500-line hard cap.

---

## Part 1: Review & Development Process

### §1. Review Philosophy & Tone

- Praise Good Work first.
- Focus on the code, not the coder; use impersonal language.
- Explain the "Why" tied to a specific rule in this document.
- Trust the linters (Prettier, Ruff); focus on substance and architecture.
- Classify feedback:
  - [Critical]: blocking issues (security, bugs, major violations) — must fix.
  - [Suggestion]: improvements/refactors — recommended.
  - [Question]: clarification needed.
  - [Praise]: highlight strong code.

### §2. Risk Assessment & Triage

- Human Oversight Flag: append `FLAG: human_oversight_required` for complex/architectural changes.
- Escalation Flag: append `FLAG: escalation_triggered` for critical security vulnerabilities (e.g., RCE, XSS, data leak).
- PR Size: if >400 changed lines (non-generated), add a [Suggestion] to split it.

### §3. Test-Driven Workflow (Red → Green → Refactor → Review)

| Phase    | Agent Task                                  | Gate                                             |
| :------- | :------------------------------------------ | :----------------------------------------------- |
| Red      | Write a failing test for the new behaviour. | Tests must fail initially.                       |
| Green    | Implement minimal code to pass.             | Tests pass.                                      |
| Refactor | Refactor to meet standards.                 | Lint, type-check, coverage ≥80%, complexity <10. |
| Review   | Request review using §16 checklist.         | At least one approval required.                  |

Note: This repo primarily uses Vitest and Playwright; `jest-axe` is acceptable for a11y checks where applicable.

---

## Part 2: Technical Standards & Conventions

### §4. Component Design (React)

- Guard clauses for loading, error, and empty states.
- Delegate: containers fetch data; children present it.
- Granularity: separate list containers from stateless item components.

### §5. Code Style & Structure

- Prefer functional style; avoid custom classes unless required by a library.
- Functions ≤ 40 lines.
- Named exports only.
- DRY: extract shared logic to `src/lib/`.

### §6. Naming Conventions

Follow kebab-case for directories/files, camelCase for variables/functions, PascalCase for types/components, UPPER_SNAKE_CASE for constants. Python uses snake_case for identifiers.

### §7. File Header Metadata

New/modified files should include standard file metadata headers (see repository examples). Missing or malformed headers may be flagged as [Critical].

### §8. TypeScript Best Practices

- Strong typing; avoid `any`.
- Runtime validation with Zod at API boundaries.
- Prefer `type`; use `interface` only for merging needs.
- Use async/await with proper error handling.

### §9. Python Standards

- PEP 8; lint/format with Ruff.
- Type hints required.
- Use Pydantic where structured validation is needed.
- Docstrings in Google style.

### §10. Security & Accessibility

- Security: mitigate OWASP Top 10; sanitize inputs, encode outputs.
- Accessibility: WCAG 2.2 AA; semantic HTML/ARIA; keyboard navigation; include automated a11y tests (`jest-axe`/Playwright a11y).

---

## Part 3: Project Governance & Structure

### §11. Project Structure

Keep feature code within its app/package; share via `src/lib/` and `packages/*`. Mirror structure in `tests/`. Cross-feature imports should go through shared modules.

### §12. Commits & Versioning

- Conventional Commits.
- Branch naming: `type/ISSUE-ID-description`.
- Update `CHANGELOG.md` for `feat` or `fix`.

### §13. Performance & Quality Gates

| Check         | Tool                | Threshold             |
| :------------ | :------------------ | :-------------------- |
| Test Coverage | Vitest              | ≥ 80%                 |
| Accessibility | jest-axe/Playwright | 0 critical violations |
| Complexity    | ESLint `complexity` | ≤ 10 per function     |
| Secrets       | gitleaks            | 0 found               |

---

## Part 4: Examples & Checklists

### §14–15. Golden Paths

See repository examples and tests for end-to-end patterns using guard clauses, schemas, and a11y testing.

### §16. Mandatory Review Checklist

Approve only if all boxes are checked:

- [ ] Follows TDD: Red/Green/Refactor/Review visible in commits.
- [ ] Clarity & Simplicity: intent obvious; minimal cleverness.
- [ ] No Duplication: shared concerns in `src/lib` or `packages/*`.
- [ ] Correct Location: files placed per structure conventions.
- [ ] Accessibility Addressed: keyboard + screen reader considered; a11y tests included where applicable.
- [ ] Error States Handled: network/invalid data handled gracefully.
- [ ] `// Reason:` comments for any justified deviations.

✅ End of specification.

© 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
