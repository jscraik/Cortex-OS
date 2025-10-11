# Providers & Setup

This package currently uses the local filesystem for persistence and can import
remote server definitions from the MCP Marketplace.
Configure the storage location via environment variables as described in [Configuration](./configuration.md).

## MCP Marketplace Integration

The `registry.marketplaceImport` tool performs an HTTPS request to
`https://mcpmarket.com/api/servers/{slug}` and normalizes the response into a
standard registry entry.

- **Headers:** Requests include `Accept: application/json` and the branded
  `User-Agent: brAInwav-CortexOS/1.0` header to satisfy the marketplace WAF.
- **Timeouts:** Clients may specify `timeoutMs` (1–60 seconds) which is passed
  to an `AbortController` and surfaced as a structured `internal_error` if the
  remote endpoint is slow.
- **Fallbacks:** Known slugs such as `arxiv-1` ship with default command/env
  scaffolding so imports continue to work offline or when the marketplace
  returns 404.
- **Observability:** Marketplace interactions emit structured logs with
  `brand:"brAInwav"`, `component:"mcp-registry"`, and `action:"marketplace_import"`.

Ensure outbound HTTPS access is allowed for your runtime. If a corporate proxy
is required, configure it before invoking the marketplace import tool.
