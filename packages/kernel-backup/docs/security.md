# Security

- Use HTTPS endpoints for all provider calls.
- Never commit secrets; load them from environment variables.
- Tokens are read at runtime by MCP tools and discarded after use.
- Enable transport encryption for remote memory backends.
- Follow [SECURITY.md](../../../SECURITY.md) for reporting issues.
