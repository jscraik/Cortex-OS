# Connectors Manifest & Service Map

The ASBR connectors endpoint (`/v1/connectors/service-map`) is driven by a local JSON manifest. Operators must provision both the manifest and signing key before starting ASBR or the Python connectors runtime.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `CONNECTORS_MANIFEST_PATH` | ✅ | Absolute or relative path to the connectors manifest JSON file. Defaults to `<repo root>/config/connectors.manifest.json` when unset. |
| `CONNECTORS_SIGNATURE_KEY` | ✅ | HMAC-SHA256 key shared between ASBR and the connectors server. Used to sign the service-map payload exposed over HTTP. |

> **Governance reminder:** load secrets using the shared 1Password loader (`op run --env-file=…`) per the root governance docs.

## Manifest Expectations

The manifest must satisfy the shared `ConnectorsManifestSchema` exported from `@cortex-os/asbr-schemas`. A minimal example:

```json
{
  "$schema": "../schemas/connectors-manifest.schema.json",
  "id": "01J0XKQ4R6V7Z9P3S5T7W9YBCE",
  "schema_version": "1.1.0",
  "generated_at": "2025-01-01T00:00:00Z",
  "connectors": [
    {
      "id": "docs",
      "name": "Docs Connector",
      "version": "1.0.0",
      "status": "enabled",
      "description": "Read-only documentation search surface.",
      "endpoint": "https://connectors.example.invalid/docs",
      "authentication": {
        "headers": [
          {
            "name": "Authorization",
            "value": "Bearer ${DOCS_TOKEN}"
          }
        ]
      },
      "headers": {
        "X-Docs-Connector": "docs"
      },
      "scopes": ["docs:read"],
      "quotas": {
        "per_minute": 60,
        "per_hour": 600,
        "concurrent": 8
      },
      "ttl_seconds": 300,
      "metadata": {
        "owner": "knowledge",
        "category": "documentation"
      },
      "tags": ["docs", "search"]
      "ttlSeconds": 180,
      "metadata": {"brand": "brAInwav"},
      "endpoint": "https://example.invalid/v1/mcp",
      "auth": {"type": "apiKey", "headerName": "X-Api-Key"}
    }
  ]
}
```

Connector entries must provide a stable identifier, human-readable `name`, HTTPS `endpoint`, explicit authentication headers, at least one scope, and a positive `ttl_seconds`. Optional `headers`, `metadata`, `tags`, and quota limits are surfaced to clients when present. `metadata.brand` is injected automatically when the service map is generated.

### Current production connectors

| ID | Name | Scopes | Auth | TTL (seconds) | Notes |
| --- | --- | --- | --- | --- | --- |
| `perplexity-search` | Perplexity Search | `search:query`, `search:insights` | `bearer` (`Authorization` header, sourced from `CONNECTORS_API_KEY`) | 3600 | Aggregated search proxy owned by Integrations. |
| `github-actions` | GitHub Actions Dispatcher | `repos:read`, `actions:trigger` | `apiKey` (`X-GitHub-Token`) | 900 | Disabled until SOC2 control sign-off completes. |
| `wikidata` | Wikidata Vector Search | `facts:query`, `facts:claims` | `none` | 300 | Hosted by Wikimedia; no secrets required. Metadata includes `provider: "Wikidata"` and snapshot date `2024-09-18`. |

> **Secrets reminder:** `wikidata` does **not** require `CONNECTORS_API_KEY`. Leave the key unset or omit the connector when assembling environment-specific manifests that should remain locked down.

## Runtime Behaviour

The loader in `packages/asbr/src/connectors/manifest-loader.ts` performs the following steps when a client requests the service map:

1. Resolve the manifest path (`CONNECTORS_MANIFEST_PATH` or default `config/connectors.manifest.json`).
2. Validate the manifest against `ConnectorsManifestSchema`.
3. Convert manifest records into the canonical service map shape: camelCase field names (`displayName`, `ttlSeconds`, `enabled`), merged authentication/extra headers, camel-cased quota keys, and enforced `metadata.brand`.
4. Derive the response TTL from the lowest per-connector `ttl_seconds` value.
5. Canonicalize the payload and sign it with `CONNECTORS_SIGNATURE_KEY` using base64url-encoded HMAC-SHA256.
6. Re-validate the signed response using `ConnectorServiceMapSchema` before returning it to clients.

Missing files or secrets trigger a `503 Service Unavailable` response with structured logs (`brand:"brAInwav"`, `component:"connectors"`).

## Local Testing

Vitest integration and security suites create temporary manifests via `packages/asbr/tests/utils/connectors-manifest.ts`. To run the same helpers locally:

```bash
pnpm --filter asbr test -- --run tests/integration/api-endpoints.test.ts
```

Set `CONNECTORS_SIGNATURE_KEY` in your shell or via `op run` before invoking the server to exercise the signed payload path.
