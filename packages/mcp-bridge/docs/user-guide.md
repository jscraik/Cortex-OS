# User Guide

## Forwarding Messages
1. Start the bridge:
   ```bash
   mcp-bridge --outbound-url https://example.com/ingest
   ```
2. Write JSON lines to stdin; each line is POSTed to the outbound URL.

## Receiving Events
1. Provide `--sse-subscribe-url` to mirror events to stdout.
2. Parse emitted lines in your MCP client.

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl+C` | Terminate the bridge gracefully. |
