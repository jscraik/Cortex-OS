# Cortex Connectors

Manifest-driven Python package that registers Cortex-OS connectors with the official OpenAI Agents SDK for Python, proxies external tools via MCP, and serves the ChatGPT Apps React dashboard widget powered by the OpenAI Apps SDK. This package owns the runtime that reads `config/connectors.manifest.json`, enforces API-key authentication, streams connector state over SSE, and exports telemetry aligned with brAInwav governance.

---

## TL;DR (Operators)

```bash
# 1. Sync dependencies
uv sync --package packages/connectors

# 2. Export required secrets (use 1Password CLI)
export CONNECTORS_SIGNATURE_KEY="$(op read op://vault/CONNECTORS_SIGNATURE_KEY)"
export CONNECTORS_API_KEY="$(op read op://vault/CONNECTORS_API_KEY)"
export MCP_API_KEY="$(op read op://vault/MCP_API_KEY)"

# 3. Launch server with bundled Apps widget (exposes HTTP, SSE, and metrics)
uv run --package packages/connectors cortex-connectors-server

# 4. Hit health + service map + SSE
curl -H "Authorization: Bearer $CONNECTORS_API_KEY" http://localhost:3026/health
curl -H "Authorization: Bearer $CONNECTORS_API_KEY" http://localhost:3026/v1/connectors/service-map
curl -H "Authorization: Bearer $CONNECTORS_API_KEY" http://localhost:3026/v1/connectors/stream
```

---

## Architecture Overview

- **Manifest Source**: `config/connectors.manifest.json` defines connector ids, versions, auth headers, scopes, quotas, and TTL. The file is validated via Pydantic (Python) and Zod (TypeScript) to guarantee parity.
- **Service Map Export**: The connectors server exposes `/v1/connectors/service-map` for parity checks and reuses the ASBR signature secret (`CONNECTORS_SIGNATURE_KEY`). The payload is canonicalised and signed with HMAC-SHA256 to maintain parity with the ASBR implementation.
- **MCP Registry**: `cortex_connectors.registry` hydrates each manifest entry into OpenAI Agents SDK MCP tools (official `openai-agents` package), wiring HTTP clients, SSE streams, and availability callbacks.
- **Apps Widget**: Built under `apps/chatgpt-dashboard` and served from the Python process (default path `dist/apps/chatgpt-dashboard`). Operators can load the widget inside ChatGPT Apps to inspect connector status and trigger sample requests.
- **Telemetry**: OpenTelemetry traces/logs and Prometheus gauge `brainwav_mcp_connector_proxy_up{connector}` are emitted for every connector. `/metrics` is gated behind the same API key auth and is enabled with `ENABLE_PROMETHEUS=true`.
- **SSE**: `/v1/connectors/stream` emits server-sent events that mirror the signed service-map payload to power live dashboards.

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `CONNECTORS_SIGNATURE_KEY` | ✅ | HMAC key shared with ASBR for signing service-map payloads. |
| `CONNECTORS_MANIFEST_PATH` | ✅ | Path to manifest JSON (defaults to `config/connectors.manifest.json`). |
| `CONNECTORS_API_KEY` | ✅ | API key required for all HTTP/SSE requests (set `NO_AUTH=true` for local dev only). |
| `MCP_API_KEY` | ✅ | Key used by MCP bridge/server to authenticate with connectors runtime. |
| `APPS_BUNDLE_DIR` | ⚙️ | Directory containing built ChatGPT Apps widget assets. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ⚙️ | Target for OpenTelemetry exports. |
| `ENABLE_PROMETHEUS` | ⚙️ | Set to `true` to expose `/metrics` endpoint. |

Secrets must be loaded through 1Password or the approved secret manager. Never commit `.env` files.

---

## Development Workflow

1. **Sync dependencies** via `uv sync --package packages/connectors`.
2. **Run tests first** (TDD): `uv run --package packages/connectors pytest -q`.
3. **Implement features** ensuring ≤40 lines per function, async/await only, and brAInwav branding in errors.
4. **Run linting** (`ruff`, `mypy`) and security scans (`pnpm security:scan --scope=connectors`).
5. **Serve Apps widget**: `pnpm --filter apps/chatgpt-dashboard build` (Webpack 5) then export bundle to `dist/`.
6. **Launch server** using `scripts/connectors/run-connectors-server.sh` which wires env vars, builds if missing, and tails logs.

---

## Testing Matrix

| Suite | Command | Purpose |
|-------|---------|---------|
| Unit & Integration (Py) | `uv run --package packages/connectors pytest --cov=cortex_connectors` | Validate manifest parsing, registry, auth, SSE/HTTP surfaces. |
| CLI smoke | `uv run --package packages/connectors cortex-connectors service-map --plain` | Dumps signed payload for quick verification. |
| Apps Widget | `pnpm --filter apps/chatgpt-dashboard test` | Validate React hooks, accessibility, and performance budgets. |
| Security | `pnpm security:scan --scope=connectors` + `semgrep` | Must be clean before PR. |

Coverage thresholds follow `packages/connectors/AGENTS.md` (≥92% global, ≥95% changed lines).

---

## Observability & Telemetry

- OpenTelemetry spans include `brand:"brAInwav"`, `component:"connectors"`, `connectorId`, and `runId` attributes.
- Prometheus gauge `brainwav_mcp_connector_proxy_up{connector="<id>"}` reflects last-known availability; 0 = offline, 1 = healthy.
- Structured logs (JSON) must carry `brand`, `component`, `trace_id`, and `request_id` for downstream correlation.
- `/v1/connectors/stream` carries the same payload as `/v1/connectors/service-map` in SSE format for live Apps widgets.

---

## ChatGPT Apps & Connectors Setup

1. Publish Cortex-OS MCP endpoints via Cloudflare Tunnel or approved ingress.
2. Create a ChatGPT App (or Connector) and configure tool endpoint pointing to the connectors server SSE route.
3. Provide API key headers that match the manifest entry (`auth.headerName`).
4. Use the Apps widget to verify status, TTL countdown, and run sample actions. Capture request IDs for support.

Refer to `docs/connectors/openai-agents-integration.md` for detailed operator playbooks.

---

## Governance References

- Root: `/AGENTS.md`, `/.cortex/rules/agentic-coding-workflow.md`, `/CODESTYLE.md`.
- Package-specific: `packages/connectors/AGENTS.md` (coverage, mutation, observability, security gates).
- TDD evidence: `tasks/connectors-manifest-runtime-tdd-plan.md`.

All changes must cite these documents in PR descriptions and attach the filled CI checklist before merge.

---

## Support & Escalation

- Ownership: @brAInwav-devs (`#cortex-ops` Slack channel).
- Incident Runbooks: see `docs/operators/chatgpt-connector-bridge.md`.
- 403 / auth failures: follow `PLAYBOOK.403-mcp.md` with connectors-specific appendix.
