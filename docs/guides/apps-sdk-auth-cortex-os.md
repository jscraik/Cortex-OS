# Cortex-OS MCP Auth0 Integration Guide

This document explains how to enable OAuth 2.1 protection for the Cortex-OS MCP server using the new `@cortex-os/mcp-auth` package. It complements the ChatGPT Developer Mode walkthrough and focuses on server-side configuration, validation, and automation.

## 1. Environment Variables

Add the following to `.env`, deployment secrets, or your process manager:

```
AUTH_MODE=oauth2                  # oauth2 | optional | api-key | anonymous
AUTH0_DOMAIN=TENANT.auth0.com     # without protocol
AUTH0_AUDIENCE=https://your-mcp-host/mcp
MCP_RESOURCE_URL=https://your-mcp-host/mcp
REQUIRED_SCOPES=search.read docs.write
REQUIRED_SCOPES_ENFORCE=true
```

- `AUTH_MODE=oauth2` enforces bearer tokens for every HTTP request.
- `AUTH_MODE=optional` allows anonymous discovery but still advertises scope requirements per tool.
- `REQUIRED_SCOPES` are validated during token verification; combine with per-tool scopes for least privilege.

## 2. Package Layout

```
packages/
 ├─ mcp-auth/                # Shared JWKS verifier + metadata helpers
 └─ mcp-server/
     ├─ src/config/auth.ts   # Loads AUTH0_* env vars
     ├─ src/security/http-auth.ts
     └─ src/tools/create-doc.ts
```

Key exports:

- `verifyAuth0Jwt` (packages/mcp-auth) – caches JWKS, validates issuer/audience, and enforces scopes.
- `buildWwwAuthenticateHeader` – emits RFC 6750 compliant responses:

  ```http
  WWW-Authenticate: Bearer realm="MCP", authorization_uri="https://TENANT.auth0.com/.well-known/openid-configuration", resource_metadata="https://your-mcp-host/.well-known/oauth-protected-resource"
  ```

## 3. Protected Resource Metadata

`FastMCP` now serves `/.well-known/oauth-protected-resource` using data provided by `@cortex-os/mcp-auth`:

```json
{
  "authorization_servers": ["https://TENANT.auth0.com"],
  "resource": "https://your-mcp-host/mcp",
  "scopes": {
    "codebase.search": ["search.read"],
    "docs.create": ["docs.write"]
  }
}
```

Scopes are collected automatically whenever a tool registers with `securitySchemes`. Tools that combine `noauth` and `oauth2` schemes remain publicly callable while still documenting optional scopes.

## 4. Tool Security

- `codebase.search` → `[noauth, oauth2(search.read)]`
- `docs.create` → `[oauth2(docs.write)]`

When a tool *only* lists `oauth2`, the runtime checks that the incoming session contains the required scopes before executing the handler. Missing scopes raise an error that surfaces to the client.

## 5. Validation Checklist

1. **Unit tests**:

   ```bash
   pnpm --filter @cortex-os/mcp-auth test
   ```

2. **Integration tests** (HTTP auth flow):

   ```bash
   pnpm --filter @cortex-os/mcp-server run test:int
   ```

3. **Metadata smoke test**:

   ```bash
   curl -s https://your-mcp-host/.well-known/oauth-protected-resource | jq
   ```

4. **WWW-Authenticate inspection** (no token):

   ```bash
   curl -i -X POST https://your-mcp-host/mcp -H 'Content-Type: application/json' -d '{}'
   ```

   Expect `401` with the `WWW-Authenticate` header pointing back to Auth0 and the metadata endpoint.

## 6. Troubleshooting

| Issue                                   | Action                                                                 |
|-----------------------------------------|------------------------------------------------------------------------|
| 401 `invalid_token`                     | Confirm issuer (`AUTH0_DOMAIN`) and audience (`AUTH0_AUDIENCE`).       |
| 401 `insufficient_scope`                | Grant the missing permission in Auth0 and re-consent in ChatGPT.       |
| Metadata lacks tool scopes              | Rebuild the server or ensure tools call `securitySchemes`.            |
| Need mixed auth (API key + OAuth)       | Set `AUTH_MODE=optional` and keep `MCP_API_KEY` configured.            |

With these steps the MCP server presents a standards-compliant OAuth surface, advertises scope requirements, and returns actionable errors that guide clients back to the Auth0 tenant when re-authentication is needed.
