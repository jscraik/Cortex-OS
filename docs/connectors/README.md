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
  "id": "prod-connectors",
  "ttlSeconds": 300,
  "connectors": [
    {
      "id": "docs",
      "name": "Docs Connector",
      "version": "1.0.0",
      "scopes": ["docs:read"],
      "quotas": {"requestsPerMinute": 60},
      "timeouts": {"request": 3000},
      "status": "enabled",
      "ttlSeconds": 180,
      "metadata": {"brand": "brAInwav"}
    }
  ]
}
```

Each connector entry must declare at least one scope, a semantic version, and a positive TTL (`ttlSeconds`). Optional fields such as `quotas`, `timeouts`, `metadata`, `endpoint`, and `auth` are passed through to consumers when present.

## Runtime Behaviour

The loader in `packages/asbr/src/connectors/manifest-loader.ts` performs the following steps when a client requests the service map:

1. Resolve the manifest path (`CONNECTORS_MANIFEST_PATH` or default `config/connectors.manifest.json`).
2. Validate the manifest against `ConnectorsManifestSchema`.
3. Derive per-connector TTL expirations (`now + ttlSeconds`), compute a shared response TTL, and attach the `brand: "brAInwav"` metadata.
4. Canonicalize the payload and sign it with `CONNECTORS_SIGNATURE_KEY` using HMAC-SHA256.
5. Re-validate the signed response using `ConnectorServiceMapSchema` before returning it to clients.

Missing files or secrets trigger a `503 Service Unavailable` response with structured logs (`brand:"brAInwav"`, `component:"connectors"`).

## Local Testing

Vitest integration and security suites create temporary manifests via `packages/asbr/tests/utils/connectors-manifest.ts`. To run the same helpers locally:

```bash
pnpm --filter asbr test -- --run tests/integration/api-endpoints.test.ts
```

Set `CONNECTORS_SIGNATURE_KEY` in your shell or via `op run` before invoking the server to exercise the signed payload path.
