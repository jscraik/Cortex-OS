# Connectors Runbook

## Purpose

Operators use this runbook to provision, rotate, and validate Cortex-OS connector manifests. It complements the schema reference in `docs/connectors/README.md` by documenting required secrets and operational toggles for each connector.

## Manifest Expectations

- Source manifest: `config/connectors.manifest.json` (override with `CONNECTORS_MANIFEST_PATH`).
- Required top-level fields: `id`, `ttlSeconds`, `connectors[]`.
- Each connector entry must define `id`, `name`, `version`, `scopes[]`, and `ttlSeconds`.
- Optional fields (`quotas`, `timeouts`, `metadata`, `endpoint`, `auth`) are surfaced downstream when present.
- All manifests must validate against `schemas/connectors-manifest.schema.json` and produce a signed payload using `CONNECTORS_SIGNATURE_KEY`.

## Connector Inventory

| Connector ID | Description | Auth Mode | Secrets Required | TTL (seconds) | Notes |
| --- | --- | --- | --- | --- | --- |
| `perplexity-search` | Aggregated search proxy routed through Perplexity Answers. | `bearer` (`Authorization`) | `CONNECTORS_API_KEY` (Perplexity token) | 3600 | Owned by Integrations. Rotate key quarterly. |
| `github-actions` | Dispatches GitHub workflows. | `apiKey` (`X-GitHub-Token`) | `CONNECTORS_API_KEY` (GitHub PAT) | 900 | Currently disabled. Enable only after SOC2 sign-off. |
| `wikidata` | Wikidata Vector Search hosted by Wikimedia Cloud. | `none` | _None_ | 300 | Snapshot `2024-09-18`. No secret required. Verify endpoint `https://wd-mcp.wmcloud.org/mcp/` is reachable. |

## Operational Steps

1. **Validate manifest changes**
   ```bash
   pnpm --filter asbr test -- tests/unit/connectors/connectors-manifest.test.ts
   uv run --package packages/connectors cortex-connectors service-map --plain
   ```
2. **Rotate secrets**
   - Update `CONNECTORS_API_KEY` in the 1Password vault.
   - Redeploy ASBR and connectors runtimes with refreshed environment variables.
3. **Health checks**
   - `GET /v1/connectors/service-map` returns `200` with `brand: "brAInwav"`.
   - SSE stream (`/v1/connectors/events`) emits `status` events every 15s.
   - Metrics: `brAInwav_mcp_connector_proxy_up{connector="wikidata"}=1`.
4. **Rollback**
   - Restore previous manifest from Git history.
   - Redeploy runtimes with the prior `CONNECTORS_SIGNATURE_KEY` if rotated.

## Troubleshooting

| Symptom | Checks | Resolution |
| --- | --- | --- |
| `CONNECTORS_MANIFEST_UNREADABLE` | File path, permissions, JSON syntax | Regenerate manifest and redeploy. |
| `Connectors manifest signature mismatch` | Ensure signature key matches ASBR + connectors runtime | Restart services with aligned `CONNECTORS_SIGNATURE_KEY`. |
| Wikidata queries fail | Verify endpoint availability, ensure no corporate proxy blocks `wd-mcp.wmcloud.org` | Retry after confirming upstream status on https://wikitech.wikimedia.org/. |

> **Reminder:** The `wikidata` connector intentionally exposes no auth headers. Do not add secrets unless Wikimedia introduces authentication.
