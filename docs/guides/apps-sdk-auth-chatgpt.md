# ChatGPT Developer Mode OAuth Setup (Auth0 + Cortex-OS MCP)

This guide walks through connecting ChatGPT Developer Mode (Apps SDK) to a Cortex-OS MCP server secured with Auth0. It follows the OpenAI Apps SDK OAuth 2.1 guidance and validates every step with the new MCP protected-resource metadata surface.

## 1. Prerequisites

- ChatGPT account with **Developer Mode** (Apps) access
- Auth0 tenant with administrator privileges
- Cortex-OS repository cloned locally
- `pnpm` and Node.js 22+
- A public HTTPS endpoint (for production) or a local tunnel (for testing)

## 2. Configure Auth0

1. **Enable Dynamic Client Registration**: In the Auth0 dashboard, navigate to **Settings → Advanced** and toggle **Enable Dynamic Client Registration**. Save the change. You can verify with:

   ```bash
   curl -s https://TENANT.auth0.com/.well-known/openid-configuration | jq '.registration_endpoint'
   ```

2. **Create an API for the MCP server**:

   - Dashboard → **Applications → APIs → Create API**
   - Name: `Cortex-OS MCP`
   - Identifier: `https://your-mcp-host/mcp`
   - Signing Algorithm: `RS256`

3. **Define permissions (RBAC)** on the API:

   | Permission      | Description                      |
   |-----------------|----------------------------------|
   | `search.read`   | Allows search tools to run        |
   | `docs.write`    | Enables document creation tools   |

   Enable **RBAC** and **Add Permissions in the Access Token** under the API settings.

4. **Authorize connections** ChatGPT will use. Promote the desired Auth0 database / social connection to a domain connection so that dynamically registered clients can use it.

5. **Optional: verify registration endpoint** is open:

   ```bash
   curl -X POST https://TENANT.auth0.com/oidc/register \
     -H 'Content-Type: application/json' \
     -d '{"client_name":"ChatGPT Preview","redirect_uris":["https://chat.openai.com/aip/apps/oauth/callback"]}'
   ```

   A successful response confirms Dynamic Client Registration (DCR) is active.

## 3. Configure Cortex-OS MCP

Set the following environment variables (e.g., in `.env` or your deployment platform):

```
AUTH_MODE=oauth2
AUTH0_DOMAIN=TENANT.auth0.com
AUTH0_AUDIENCE=https://your-mcp-host/mcp
MCP_RESOURCE_URL=https://your-mcp-host/mcp
REQUIRED_SCOPES=search.read docs.write memory.read memory.write memory.delete
```

Then rebuild the server:

```bash
pnpm --filter @cortex-os/mcp-server build
```

The server will expose the Protected Resource Metadata endpoint automatically at:

```
https://your-mcp-host/.well-known/oauth-protected-resource
```

A healthy response looks like:

```json
{
  "authorization_servers": [
    "https://TENANT.auth0.com"
  ],
  "resource": "https://your-mcp-host/mcp",
  "scopes": {
    "codebase.search": ["search.read"],
    "docs.create": ["docs.write"],
    "local_memory_search": ["memory.read"],
    "local_memory_store": ["memory.write"],
    "local_memory_delete": ["memory.delete"]
  }
}
```

## 4. Register the connector in ChatGPT Developer Mode

1. Open **ChatGPT → Explore GPTs → Developer Mode → Create Connector**.
2. Choose **Create your own** and select **OAuth 2.1** for authentication.
3. Enter the discovery metadata:

   | Field                       | Value                                                     |
   |----------------------------|-----------------------------------------------------------|
   | Authorization URL          | `https://TENANT.auth0.com/authorize`                      |
   | Token URL                  | `https://TENANT.auth0.com/oauth/token`                    |
   | Client authentication      | `Basic` (Auth0 client secret)                             |
   | Scopes                     | `search.read docs.write memory.read memory.write memory.delete` |
   | Protected Resource Metadata| `https://your-mcp-host/.well-known/oauth-protected-resource` |

4. Save the connector. ChatGPT will dynamically register a client with Auth0 and prompt you through Universal Login.

5. After consenting, open the connector’s **Tools** tab and test:

   - `codebase.search` should succeed without additional prompts.
   - `docs.create` should require the `docs.write` consent (and fail with “Unauthorized: scope docs.write required” if the token is missing it).

## 5. Troubleshooting

| Symptom                              | Resolution                                                                 |
|--------------------------------------|----------------------------------------------------------------------------|
| 401 w/ `invalid_token`               | Inspect `WWW-Authenticate` header—usually issuer/audience mismatch.        |
| 401 w/ `insufficient_scope`          | Ensure the Auth0 API permission is granted and appears in the token.       |
| ChatGPT fails to register connector  | Confirm DCR is enabled and `oidc/register` responds with HTTP 201.        |
| Metadata missing scopes              | Rebuild the server; verify `docs.create` and `codebase.search` registered. |

With these steps complete, ChatGPT Developer Mode will negotiate OAuth 2.1 automatically, refresh tokens via Auth0, and discover scope requirements from the MCP server without manual wiring.
