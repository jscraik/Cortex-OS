# A2A and A2A-Services Technical Review

## Technical Review

- **A2A package** – Provides JSON‑RPC 2.0 handlers, task management, and an in‑memory outbox repository for agent‑to‑agent messaging.
- **Common service module** – Ships an in-memory rate limiter explicitly marked as unsuitable for production due to loss of state, inefficient cleanup, and shared global state.
- **Schema Registry service** – Express app uses the same rate limiter and stores schemas only in memory, so all definitions vanish on restart.
- **Existing tests** – Vitest suite verifies current rate‑limiting behavior, showing a foundation for TDD expansion.

## Software Engineering Principle

> Stateful components must expose storage‑agnostic interfaces and use durable, shareable persistence layers; every change begins with a failing unit or integration test that proves the requirement before implementation.

## TDD Implementation Plan

1. **Durable Rate Limiter**

   - Write a failing integration test proving request counts survive process restarts.
   - Implement a pluggable store interface; add Redis adapter.
   - Commit with `feat(common): add persistent rate limiter`.

2. **Persistent Schema Registry**

   - Write failing test ensuring schemas remain after restart.
   - Introduce storage interface and database adapter (e.g., Postgres).
   - Commit with `feat(schema-registry): persist schemas in database`.

3. **Replace In-Memory Outbox**

   - Add failing test verifying outbox messages persist and replay on restart.
   - Implement `OutboxRepository` interface with durable backend.
   - Commit with `feat(a2a): add persistent outbox repository`.

4. **JSON-RPC Compliance Tests**

   - Write failing tests for error codes and unsupported method handling.
   - Refine handlers to satisfy the spec.
   - Commit with `test(a2a): cover json-rpc edge cases`.

5. **Test Structure Hygiene**
   - Add lint rule/failing test enforcing tests reside under `tests/` only.
   - Relocate existing test files, adjust imports.
   - Commit with `chore(a2a): standardize test layout`.

## Testing

- ⚠️ No automated tests were executed; review only.

## Notes

- Assumes availability of Redis/Postgres (or equivalent) for persistent adapters.
