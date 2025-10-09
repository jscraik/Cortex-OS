---
title: Api
sidebar_label: Api
---

# Cortex-OS Runtime HTTP API

This document describes the HTTP API exposed by the ASBR-lite runtime in `apps/cortex-os`.

## Authentication

- All routes under `/v1/*` require a Bearer token and loopback access.
- Include the header:

```text
Authorization: Bearer &lt;token&gt;
```

- Tokens are managed in `~/.config/cortex-os/tokens.json` (or `$CORTEX_OS_TMP/config` in tests) and validated server-side.

## Health

- `GET /health`
- Public endpoint. Returns `{ status: 'ok', timestamp }`.

## Server-Sent Events (SSE)

- `GET /v1/events?stream=sse`
- Public endpoint for event streaming. Content-Type: `text/event-stream`.

## Error Format

All error responses use the structure:

```json
{
  "error": "AuthError",
  "code": "AUTHENTICATION_ERROR",
  "message": "Authentication required",
  "extraField": "optional context"
}
```

## Tasks

- `GET /v1/tasks` → `{ tasks: `Array&lt;{ record, digest }&gt;` }`
- `POST /v1/tasks` body:

```json
{
  "task": { "id": "optional", "status": "pending", "details": { "note": "..." } }
}
```

- `GET /v1/tasks/{id}` → `{ task, digest }`
- `PUT /v1/tasks/{id}` with optimistic locking. Two modes:

  - Replace:

    ```json
    {
      "record": { "id": "..", "status": "completed" },
      "expectedDigest": "...",
      "mode": "replace"
    }
    ```

  - Merge:

  ```json
  { "patch": { "status": "completed" }, "expectedDigest": "..." }
  ```

- `DELETE /v1/tasks/{id}` → 204

## Profiles

- `GET /v1/profiles` → `{ profiles: `Array&lt;{ record, digest }&gt;` }`
- `POST /v1/profiles` body:

```json
{ "profile": { "id": "optional", "label": "Primary", "scopes": ["tasks:read"] } }
```

- `GET /v1/profiles/{id}` → `{ profile, digest }`
- `PUT /v1/profiles/{id}` replace/merge with `expectedDigest` like Tasks
- `DELETE /v1/profiles/{id}` → 204

## Artifacts

- `GET /v1/artifacts?taskId=&tag=&filename=` → `{ artifacts: ArtifactMetadata[] }`
- `POST /v1/artifacts` body:

```json
{ "artifact": { "filename": "x.txt", "contentType": "text/plain", "base64Payload": "..." } }
```

- `GET /v1/artifacts/{id}` → `{ metadata, base64Payload }`
- `PUT /v1/artifacts/{id}` same body as POST plus `expectedDigest` at top level
- `DELETE /v1/artifacts/{id}` → 204

## Evidence

- `GET /v1/evidence?taskId=&type=&tag=` → `{ evidence: EvidenceEntry[] }`
- `POST /v1/evidence` body:

```json
{ "evidence": { "taskId": "t-1", "type": "audit", "timestamp": "2025-01-01T00:00:00Z", "payload": {"k":"v"} } }
```

- `GET /v1/evidence/{id}` → `{ evidence, digest }`
- `PUT /v1/evidence/{id}` body:

```json
{ "evidence": { "taskId": "t-1", "type": "audit", "timestamp": "...", "payload": {"k":"v"} }, "expectedDigest": "..." }
```

- `DELETE /v1/evidence/{id}` → 204

## Runs

- `GET /v1/runs/{id}/bundle`
  - Returns a `.pbrun` (ZIP) archive containing `run.json`, `messages.jsonl`, `citations.json`,
    `policy_decisions.json`, `energy.jsonl`, and `prompts.json` for the requested run.
  - Requires Bearer authentication; responds with `409 RUN_NOT_FINALIZED` while the run is still active.
  - Response headers expose metadata including `X-Run-Status`, `X-Run-Started-At`, `X-Run-Finished-At`,
    and `X-Run-Bundle-Entries`.
  - Clients should treat the archive as immutable evidence; verify `run.json.id` matches the requested run ID.

## Notes

- Optimistic locking is enforced for mutable resources using `expectedDigest`.
  On mismatch, the server returns `409` with code `OPTIMISTIC_LOCK` and
  a payload including `{ expected, actual }`.
- SSE endpoints are unauthenticated for ease of consumption within the local machine.
