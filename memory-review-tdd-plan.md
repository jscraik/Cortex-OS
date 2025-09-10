# Memory Review Workflow TDD Plan

This roadmap details micro-tasks to implement a consent-driven memory review workflow for `@cortex-os/memories`. Each step follows strict TDD:

1. **Red test** – write failing test(s) describing the requirement.
2. **Green code** – implement minimal code to pass tests.
3. **Refactor** – improve design while keeping tests green.
4. **Commit strategy** – one focused commit using Conventional Commits.
5. Run `pre-commit run --files <changed files>` and `pnpm lint && pnpm test` (or `pnpm docs:lint` for docs-only).

Coordinate with `packages/memories/docs/plan/REVISED_TDD_PLAN.md` to stay aligned with broader recovery work.

---

## 1. Pending Queue & Consent Flag

- design(memories): define storage for pending items and approval state (status field vs dedicated queue).
- test(memories): storing with `requiresConsent` returns pending status.
- feat(memories): queue pending memories instead of persisting.
- test(memories): `listPending` exposes queued memories.
- feat(memories): implement `listPending`.
- test(memories): `approve` moves item to inner store.
- feat(memories): implement `approve`.
- test(memories): `discard` removes pending item.
- feat(memories): implement `discard`.

## 2. Policy Metadata Integration

- test(memories): namespace policy declares `requiresConsent`.
- feat(memories): extend policy schema and enforcement.
- test(memories): `MemoryPolicy` interface for agents includes `requiresConsent`.
- feat(memories): update shared policy type and docs.
- test(memories): pending/approved/discarded status stored in metadata.
- feat(memories): persist status and propagate to `MemoryStore`.

## 3. Audit Trail

- test(memories): approving records reviewer id and timestamp.
- feat(memories): persist audit metadata for approvals.
- test(memories): discarding records reviewer id and timestamp.
- feat(memories): log discard metadata.
- refactor(memories): expose audit retrieval helpers.

## 4. Review API

- design(memories-api): define `ReviewableMemoryStore` contract.
- test(memories-api): HTTP endpoint lists/approves/discards pending items.
- feat(memories-api): add minimal Express handlers using `ReviewableMemoryStore`.
- test(memories-api): unauthorized requests are rejected.
- feat(memories-api): enforce reviewer authorization.
- refactor(memories-api): validate inputs with Zod schemas.

## 5. Documentation & Examples

- docs(memories): usage guide for consent workflow.
- docs(memories): example showing approval and discard flows.
- docs(memories): mention `requiresConsent` in shared `MemoryPolicy` type.
- chore(ci): ensure docs linting covers new files.

---

## Verification Checklist for Each Commit

1. `pre-commit run --files <changed files>`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm docs:lint` for documentation updates

## Milestones

- **M1 – Consent Workflow**: Pending queue, approval, discard.
- **M2 – Policy & Audit**: Policy integration and audit trail.
- **M3 – Review API**: HTTP endpoints and validation.
- **M4 – Docs & Examples**: Usage documentation and examples.
