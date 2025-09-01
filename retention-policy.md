# Retention Policy

Memories default to a 30-day TTL unless specified. Expiry is enforced by `SQLiteStore.purgeExpired` and covered in `packages/memories/tests/ttl.expiration.spec.ts`.

Encryption keys are rotated by updating `MEMORIES_ENCRYPTION_KEY` and re-encrypting stored payloads through a migration script. Old keys must be destroyed after successful rotation.
