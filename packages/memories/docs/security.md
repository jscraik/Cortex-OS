# Security

- Use `MEMORIES_ENCRYPTION_SECRET` to enable at-rest encryption.
- Limit access via namespace policies and `MEMORIES_ENCRYPTION_NAMESPACES` or regex.
- Set `redactPII: true` in policies to strip sensitive data before storage.
- Prefer HTTPS for external providers and rotate API keys regularly.
- Avoid storing credentials or personal data unless encrypted and consented.
