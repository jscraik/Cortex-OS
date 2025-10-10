# connectors
Adapters for ChatGPT Apps/Connectors and Perplexity SSE to operate Cortex-OS safely.

## ChatGPT Apps / Connectors (OpenAI)
- **Goal:** Allow ChatGPT to call MCP tools via your public MCP endpoint (through Cloudflare).
- **Steps (high-level):**
  1. Expose MCP server over HTTPS (Cloudflare Tunnel).
  2. In ChatGPT **Apps** (or **Connectors**), define a tool that calls your MCP endpoint.
  3. **Auth mode:** match your server. If server requires API-key, configure “Bearer”/header in the app; if local dev w/ `NO_AUTH=true`, set to “None”.
  4. Provide tool schema (name/args) that maps to MCP tool signatures.
  5. Test from ChatGPT by invoking a known tool (evidence: request ID).

## Perplexity SSE
- Provide SSE endpoint proxy for tool calls or status streams.
- Ensure `text/event-stream` and heartbeat pings; document retry behavior.

## Rate Limits & Guards
- Backoff policy; 429 handling; invocation budget per session.

## 403 Quick Checks
- Matching auth mode, header name, allowed origins/host, Cloudflare policy.

## Definition of Done
- [ ] Adapters for ChatGPT Apps/Connectors and Perplexity SSE.
- [ ] Sample app config; rate-limit + auth guards; 403 triage doc linked.

## Test Plan
- [ ] ChatGPT app calls MCP tool; Perplexity SSE roundtrip.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.
