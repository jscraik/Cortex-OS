# Best Practices

- Validate all message payloads with Zod schemas.
- Use structured URNs for the `source` field.
- Keep handlers idempotent and side-effect free.
- Propagate `traceparent` for end-to-end observability.
- Set reasonable TTLs to avoid processing stale messages.

