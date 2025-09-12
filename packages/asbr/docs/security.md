# Security

- Tokens are generated on first launch and stored under the XDG state directory.
- All HTTP endpoints require `Authorization: Bearer <token>`.
- Enable HTTPS by placing ASBR behind a reverse proxy.
- The `OWASPLLMGuard` module filters unsafe prompts before execution.
- Sandbox MCP tools to restrict file and network access.
