# Retention Policy

- Memories default to a 30-day TTL unless specified.
- Legal holds override TTL and require explicit removal.
- The purge job deletes expired items based on ISO 8601 durations.
- The forget-me flow removes all memories for a given actor and tenant.

Retention is validated in tests and enforced during purge.
