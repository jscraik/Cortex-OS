# Best Practices

## Core TDD Practices

- Commit tests and implementation together to maintain TDD flow.
- Keep configurations minimal and explicit.
- Run in `--watch` mode during active development.
- Use `LOCAL_MEMORY_BASE_URL` to persist coaching across sessions.
- Review coaching feedback before overriding any warnings.

## Production Readiness

For comprehensive production-ready TDD planning that achieves 95/95 coverage with real-time execution, see the [TDD Planning Guide](./tdd-planning-guide.md).

### Quality Gates Integration

- Always enforce quality gates at each TDD state transition
- Use mutation testing to prevent vacuous tests
- Implement operational readiness criteria before production deployment
- Maintain ≥95% operational readiness score across all brAInwav standards

### Real-Time Behavior

- Inject monotonic clocks for deterministic time control
- Implement bounded queues with intentional load shedding
- Ensure idempotency keys for all external effects
- Prove backpressure behavior under fault injection testing

See the [TDD Planning Guide](./tdd-planning-guide.md) for detailed implementation steps and CI/CD integration patterns.
