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
  "id": "brAInwav-connectors",
  "manifestVersion": "2024.09.18",
  "generatedAt": "2024-09-18T00:00:00Z",
  "ttlSeconds": 3600,
  "connectors": [
    {
      "id": "wikidata",
      "name": "Wikidata Semantic Search",
      "displayName": "Wikidata Semantic Search",
      "version": "2024.09.18",
      "endpoint": "https://wd-mcp.wmcloud.org/mcp/",
      "auth": { "type": "none" },
      "scopes": [
        "wikidata:vector-search",
        "wikidata:claims",
        "wikidata:sparql"
      ],
      "ttlSeconds": 3600,
      "enabled": true,
      "metadata": {
        "brand": "brAInwav",
        "dumpDate": "2024-09-18",
        "vectorModel": "jina-embeddings-v3",
        "embeddingDimensions": 1024,
        "supportsMatryoshka": true,
        "languages": ["en", "fr", "ar"],
        "datasetMd5": "dd7375a69774324dead6d3ea5abc01b7"
      }
    }
  ]
}
```

Each connector entry must declare at least one scope, a semantic version, an endpoint, authentication details, and a positive TTL (`ttlSeconds`). Optional fields such as `quotas`, `timeouts`, `metadata`, `description`, and `tags` are passed through to consumers when present.

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
3. Derive per-connector TTL expirations (`now + ttlSeconds`), compute a shared response TTL, and attach the `brand: "brAInwav"` metadata.
4. Canonicalize the payload and sign it with `CONNECTORS_SIGNATURE_KEY` using HMAC-SHA256.
5. Re-validate the signed response using `ConnectorServiceMapSchema` before returning it to clients.

Missing files or secrets trigger a `503 Service Unavailable` response with structured logs (`brand:"brAInwav"`, `component:"connectors"`).

## Wikidata Semantic Search Connector

The bundled manifest exposes a Wikidata semantic search connector backed by the 2024-09-18 project dump hosted on `wd-mcp.wmcloud.org`. The connector fans out across three capabilities:

- `wikidata:vector-search` – vector similarity over Jina `v3` embeddings of entity abstracts.
- `wikidata:claims` – structured entity claims hydration for fast follow-up lookups.
- `wikidata:sparql` – pass-through SPARQL queries for advanced graph exploration.

The entry is unauthenticated (`auth.type: "none"`) because the upstream SSE gateway is publicly accessible. Metadata embedded in the manifest advertises the underlying snapshot (`dumpDate`), embedding model (`vectorModel` / `embeddingDimensions`), language coverage, and the MD5 checksum of the published dataset (`datasetMd5`).

### Refresh Policy

- `ttlSeconds: 3600` — ASBR and the Python connectors runtime re-fetch and re-sign the manifest at most once per hour. Downstream caches should respect the shared TTL emitted in the service map response.
- Operators replacing the Wikidata snapshot should bump `manifestVersion`, `generatedAt`, and the connector `version`/`metadata` fields, then redeploy both the manifest file and the signing key.

## Local Testing

Vitest integration and security suites create temporary manifests via `packages/asbr/tests/utils/connectors-manifest.ts`. To run the same helpers locally:

```bash
pnpm --filter asbr test -- --run tests/integration/api-endpoints.test.ts
```

Set `CONNECTORS_SIGNATURE_KEY` in your shell or via `op run` before invoking the server to exercise the signed payload path.
