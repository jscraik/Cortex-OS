# Providers & Setup

When integrating with third‑party HTTP/SSE providers, export environment variables so credentials are not embedded in scripts:

```bash
export MCP_BRIDGE_OUTBOUND_URL="https://example.com/ingest"
export MCP_BRIDGE_SSE_URL="https://example.com/events"
export AUTH_TOKEN="secret" # consumed by your HTTP endpoint
```

Pass tokens through headers on the server side; the bridge does not manage authentication directly.
