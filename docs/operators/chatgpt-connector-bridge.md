# ChatGPT Connector Bridge Runbook

This runbook explains how to publish the brAInwav Cortex-OS MCP server through Cloudflare Tunnels and register it with ChatGPT Pro (Responses API MCP tool). It reflects the FastMCP v3 implementation in `packages/mcp-server` as of 2025-10-09.

## Prerequisites

- Node.js 20 or later with the Cortex-OS workspace checked out.
- `pnpm install` completed so `@cortex-os/mcp-server` dependencies (FastMCP, prom-client, OpenTelemetry) are available.
- Cloudflare Zero Trust tunnel token or service credentials that match `config/cloudflared/mcp-tunnel.yml`.
- OpenAI API key with access to the Responses API and ChatGPT Pro connectors.
- Secrets available at runtime:
  - `MCP_API_KEY` – random 32+ character string for HTTP/SSE transport.
  - `CLOUDFLARE_TUNNEL_TOKEN` – when using `cloudflared tunnel run`.
  - Optional OpenTelemetry exporter endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`) if traces should be streamed.

## Step 1 – Configure the MCP server

1. Export the required secrets:

   ```bash
   export MCP_API_KEY="<strong-random-key>"
   export MCP_TRANSPORT=all        # enables HTTP/SSE and STDIO
   export MCP_METRICS_ENABLED=true # optional: opt-in Prometheus metrics
   export MCP_METRICS_PORT=9464    # optional, defaults to 9464
   export PIECES_MCP_ENABLED=true  # optional: toggle Pieces proxy
   ```

2. Start the server:

   ```bash
   pnpm --filter @cortex-os/mcp-server start:http
   ```

   The FastMCP runtime exposes:

   - Streamable HTTP endpoint: `http://0.0.0.0:3024/mcp`
   - SSE endpoint: `http://0.0.0.0:3024/sse`
   - Health: `http://0.0.0.0:3024/health`
   - Prometheus metrics (when `MCP_METRICS_ENABLED=true`): `http://127.0.0.1:9464/metrics`

   Logs now include `branding: brAInwav` and trace the accepted auth headers on boot. HTTP authentication failures and successes emit Prometheus counters (`brainwav_mcp_http_auth_attempt_total`) and OpenTelemetry spans (`mcp.http.authenticate`).

## Step 2 – Cloudflare tunnel alignment

1. Review `config/cloudflared/mcp-tunnel.yml` and update the hostname if needed. The default routes public traffic to `http://localhost:3024`.

2. Authenticate Cloudflare:

   ```bash
   cloudflared tunnel login
   ```

3. Start the tunnel:

   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=<token> \
   cloudflared tunnel --config config/cloudflared/mcp-tunnel.yml run cortex-mcp
   ```

4. Validate endpoints (replace `<hostname>` with your Cloudflare hostname):

   ```bash
   curl -H "X-API-Key: $MCP_API_KEY" https://<hostname>/mcp --data '{"jsonrpc":"2.0","id":1,"method":"ping"}'
   curl https://<hostname>/health
   ```

   The `/mcp` call should return a JSON-RPC response with no authentication errors. Cloudflare must respect both `/mcp` (HTTP streaming) and `/sse` (Server-Sent Events) paths.

## Step 3 – Register the connector with ChatGPT Pro

OpenAI connectors require repeating the full URL and auth headers on every Responses API call.

### Responses API example

```bash
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Accept: application/json, text/event-stream" \
  -d "$(jq -n --arg url "https://<hostname>/mcp" --arg key "$MCP_API_KEY" '{
        model: "gpt-5",
        tools: [{
          type: "mcp",
          server_label: "cortex-os",
          server_url: $url,
          require_approval: "always",
          headers: { "X-API-Key": $key },
          allowed_tools: ["memory.hybrid_search", "search", "codebase.search"]
        }],
        input: "List the available Cortex tools."
      }')"
```

- `require_approval: "always"` keeps human-in-the-loop until the server is trusted.
- `allowed_tools` trims latency and token cost by exposing only critical tools.
- A successful call produces `mcp_list_tools` in the response payload; failures return a branded JSON-RPC error.
- Ensure the Auth0 API exposes scopes `search.read`, `docs.write`, `memory.read`, `memory.write`, `memory.delete` so ChatGPT can consent and tokens include the permissions published in protected-resource metadata.

### ChatGPT Pro UI connector

1. Open **Settings → Connectors → Add custom MCP server**.
2. Enter:
   - **Label**: `brAInwav Cortex`
   - **Server URL**: `https://<hostname>/mcp`
   - **API Key Header**: `X-API-Key: <your key>`
   - **Approval policy**: Always require, until audited.
3. Test with `memory.search` or `codebase.search`.

ChatGPT caches neither the server URL path nor headers, so supply them for each session. Logs in Cortex-OS will show `brAInwav MCP client connected` with a hashed subject ID when authentication succeeds.

## Step 4 – Post-deployment validation (2025-10-11)

1. **Tunnel sanity checks** – Immediately after `cloudflared tunnel run`, record the command output and run `curl` against `https://<hostname>/mcp` and `https://<hostname>/health`. Save the JSON-RPC ping response and health status for the TDD plan.
2. **ChatGPT confirmation** – Launch a ChatGPT session with the custom connector and execute at least `memory.search` and `codebase.search`. Export the transcript or screenshot the tool invocations together with the Cortex MCP logs showing `brAInwav MCP client connected`.
3. **Evidence capture** – Archive the Cloudflare tunnel session logs, the ChatGPT transcript, and the Cortex MCP log excerpts. Link all three artifacts in the feature/TDD checklist under the Cloudflare + ChatGPT validation gate.
4. **Automation passes** – Run `pnpm test:smart`, `pnpm lint:smart`, `pnpm typecheck:smart`, and `pnpm security:scan` from the repo root once the connector succeeds. Note the command timestamps and exit codes in the checklist.
5. **Governance updates** – Update `packages/mcp-server/IMPLEMENTATION_COMPLETE.md` and any related specs the same day you finish the validation, citing the evidence above. Include the oversight ID from the latest `vibe_check` call in the PR description.

## Observability

- **Prometheus**: when `MCP_METRICS_ENABLED=true`, scrape `http://127.0.0.1:9464/metrics` locally or `https://cortex-mcp.brainwav.io/metrics` via the Cloudflare tunnel (include the Cloudflare Access headers). If the port is already in use the server logs a warning (`Prometheus metrics endpoint disabled: port already in use`) and keeps running without metrics. Key series:
  - `brainwav_mcp_http_auth_attempt_total{outcome="success"}`
  - `brainwav_mcp_http_auth_attempt_total{outcome="failure"}`
  - `brainwav_mcp_hybrid_search_duration_ms_bucket`
  - `brainwav_mcp_hybrid_search_results_total{source="cortex-local"|"pieces-ltm"}`
- If you prefer to isolate Prometheus scraping, run `cloudflared tunnel --config config/cloudflared/mcp-tunnel-metrics.yml run cortex-mcp-metrics` and point the scrape target at `https://cortex-mcp-metrics.brainwav.io/metrics`.
- **OpenTelemetry**: set `OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-brainwav.example.com/v1/traces` to stream spans (`mcp.tool.memory.hybrid_search`, `mcp.tool.search`, `mcp.http.authenticate`, etc.). The SDK shuts down cleanly on SIGINT/SIGTERM.
- **Logging**: Pino logs include `branding`, `tool`, and `subjectId` fields. Auth failures log once every `MCP_AUTH_LOG_INTERVAL` attempts by default (50).

## STDIO coexistence strategy

FastMCP currently allows one active transport per server instance. When you set `MCP_TRANSPORT=all`, Cortex-OS prioritizes the HTTP/SSE transport and logs guidance to launch a separate STDIO instance. To run both transports simultaneously:

1. Start the remote bridge (HTTP/SSE + metrics) as shown above.
2. In a separate shell, launch the STDIO variant for local agents:

   ```bash
   pnpm --filter @cortex-os/mcp-server start:stdio
   ```

This keeps authentication, telemetry, and tool registration identical across both processes while avoiding the current FastMCP limitation. Monitor the FastMCP release notes for future native multi-transport support.

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| 401 Unauthorized on `/mcp` | Missing or mismatched `MCP_API_KEY` | Confirm the header `X-API-Key` or bearer token matches the configured key. Check auth metrics for failure spikes. |
| Cloudflare tunnel returns 502 | Tunnel still pointing at old port | Update `config/cloudflared/mcp-tunnel.yml` to match the server port (default 3024) and restart the tunnel. |
| ChatGPT connector timeouts | Allowed tools list too large or SSE blocked | Restrict `allowed_tools`; ensure Cloudflare allows `/sse` path and supports streaming. |
| Pieces results absent | `PIECES_MCP_ENABLED=false` or proxy disconnected | Inspect logs for `Pieces MCP proxy disabled` or `pieces.lookup` span events; enable and restart when ready. |

## Appendix – Compliance checklist

- FastMCP v3 streamable HTTP transport with SSE parity.
- Timing-safe API key guard referencing MCP spec headers (`X-API-Key`, bearer, basic password).
- Deterministic hybrid search normalization with telemetry and metrics.
- Cloudflare tunnel config stored at `config/cloudflared/mcp-tunnel.yml`.
- Prometheus metrics and OTLP tracing switches documented for operators.

_Last updated: 2025-10-11_
