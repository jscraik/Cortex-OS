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
    }
  ]
}
```

Connector entries must provide a stable identifier, human-readable `name`, HTTPS `endpoint`, explicit authentication headers, at least one scope, and a positive `ttl_seconds`. Optional `headers`, `metadata`, `tags`, and quota limits are surfaced to clients when present. `metadata.brand` is injected automatically when the service map is generated.

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
