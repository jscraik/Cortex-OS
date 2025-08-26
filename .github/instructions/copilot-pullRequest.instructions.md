<!--
file_path: ".github/instructions/copilot-pullRequest.instructions.md"
description: "Canonical rules for GitHub Copilot PR description autogeneration"
maintainer: "@jamiescottcraik"
last_updated: "2025-08-09"
version: "0.3.0"
status: "active"
-->

# 🤖 brAInwav • Pull‑Request Description Rules

Copilot must generate every PR description in the structure below and obey all lint rules. These instructions inherit conventions from:

- [`./copilot-commitMessage.instructions.md`](./copilot-commitMessage.instructions.md)
- [`./copilot-codeReview.instructions.md`](./copilot-codeReview.instructions.md)
- [`./copilot-markdown.instructions.md`](./copilot-markdown.instructions.md)
- [`./copilot-testGeneration.instructions.md`](./copilot-testGeneration.instructions.md)

---

## 1 · Title (single line)

`<type>(<scope>): <concise summary>` ≤ 72 chars

- type → `feat` | `fix` | `docs` | `refactor` | `test` | `perf` | `chore` | `ci`
- scope → affected package/folder (kebab‑case)
- Present‑tense verb; no trailing period.

---

## 2 · Body Sections (required – in this order)

Copilot must output the markdown headings exactly as written.

1. ### Summary

   ≤ 3 sentences explaining what changed. Avoid “This PR …”.

2. ### Motivation / Context

   Why the change was needed. Link issues using `Fixes #123`. Reference ADRs/RFCs where relevant.

3. ### Changeset

   Bullet list grouped by feature/file area (present tense).

4. ### Accessibility & Security

   Summarise WCAG 2.1/2.2 checks, keyboard paths, SR output. Prefix security items with [SECURITY].

5. ### Tests Added / Updated

   List vitest/pytest/playwright IDs plus manual QA. Axe a11y: 0 violations.

6. ### Screenshots / GIFs (if UI changed)

   Drag‑and‑drop images or use URLs.

7. ### Checklist

   Basic readiness checklist (tests green, lint/format, secrets absent, docs updated, issue status).

8. ### Breaking Changes?
   `yes | no` — if yes, include migration notes.

---

## 3 · Style & Lint Rules

| Rule        | Requirement                       |
| :---------- | :-------------------------------- |
| Line length | ≤ 120 chars                       |
| Voice       | Present tense, active             |
| Language    | Inclusive; no ableist terms       |
| Headings    | Only `##` level (flat)            |
| Lists       | `-` for bullets; `1.` for ordered |
| Code fences | ```lang with explicit language    |

Failure flow: If context is missing, Copilot must prompt for scope, ticket link, and change summary.

---

## 4 · Accessibility & Cognitive‑Load

- Keep prose concise; prefer lists.
- Expand acronyms on first use.
- Ensure markdown renders cleanly in GitHub UI and SR virtual buffers (avoid raw HTML tables).

✅ End of specification.
