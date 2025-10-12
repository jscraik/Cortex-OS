# Cortex Code + Cortex MCP: Integration Guide

Learn how to connect Cortex Code to your tools using the Model Context Protocol (MCP). This guide mirrors the clean, task‑oriented style you’re used to, with Cortex Code as the primary workflow.

Last updated: 2025-09-01

> Note
> Cortex Code (formerly “Cortex TUI”) is the primary brand in this guide. Commands use the cortex CLI binary.

## Public interface (Cloudflare built‑in)

- Cortex MCP exposes a public URL via a built‑in Cloudflare Tunnel.
- On success, `CORTEX_MCP_PUBLIC_URL` is set (e.g., `https://<name>.trycloudflare.com`).
- If tunnel startup fails, the server falls back to local‑only (`http://127.0.0.1:<port>`) and emits `mcp.tunnel.failed` with `{ port, reason }` on the A2A bus.
- Set `CORTEX_MCP_TUNNEL_STRICT=1` to hard‑fail when the tunnel can’t start.
- For named tunnels, set `CLOUDFLARE_TUNNEL_TOKEN` and `CLOUDFLARE_TUNNEL_HOSTNAME` (or `TUNNEL_HOSTNAME`).

## What you can do with MCP

With MCP servers connected, you can:

- Implement features from trackers: “Ship what’s in JIRA ENG‑4521 and open a PR.”
- Analyze monitoring: “Check Sentry errors for ENG‑4521 and correlate with deploys.”
- Query data: “From Postgres, pick 10 users who used ENG‑4521 last week.”
- Integrate designs: “Update email template to match the latest Figma.”
- Automate workflows: “Draft 10 customer emails in Gmail about the new feature.”

## Popular MCP servers

Use these quick commands to connect well-known servers with Cortex Code. Adjust names and headers as needed.

> Warning
> Use third‑party MCP servers at your own risk — brAInwav has not verified the correctness or security of these servers. Avoid connecting servers that can fetch untrusted content unless you understand the prompt‑injection risks.

- Linear (SSE)

  ```bash
  cortex mcp add --transport sse linear https://mcp.linear.app/sse
  ```

- Notion (HTTP)

  ```bash
  cortex mcp add --transport http notion https://mcp.notion.com/mcp
  ```

- Sentry (HTTP)

  ```bash
  cortex mcp add --transport http sentry https://mcp.sentry.dev/mcp
  ```

- Cloudinary (HTTP)

  ```bash
  cortex mcp add --transport http cloudinary https://mcp.cloudinary.com/mcp
  ```

- Hugging Face (HTTP)

  ```bash
  cortex mcp add --transport http huggingface https://huggingface.co/mcp
  ```

- Vercel (HTTP)

  ```bash
  cortex mcp add --transport http vercel https://mcp.vercel.com/
  ```

- Airtable (stdio)

  ```bash
  cortex mcp add airtable -- npx -y airtable-mcp-server
  ```

- ClickUp (stdio)

  ```bash
  cortex mcp add clickup -- npx -y @hauptsache.net/clickup-mcp
  ```

- Figma Dev Mode (HTTP; local desktop)

  ```bash
  cortex mcp add --transport http figma-dev http://127.0.0.1:3845/mcp
  ```

Find more servers: <https://github.com/modelcontextprotocol/servers>

## Install MCP servers (Cortex‑first)

You can add servers via stdio, SSE, or HTTP.

### Option 1: Local stdio server

```bash
# Basic syntax
cortex mcp add <name> -- <command> [args...]

# Example: Airtable (stdio)
cortex mcp add airtable -- npx -y airtable-mcp-server
```

> Tip
> “--” separates Cortex Code flags from the server command. Everything after “--” runs the server.

### Option 2: Remote SSE server

```bash
# Basic syntax
cortex mcp add --transport sse <name> <url>

# Example: Linear (SSE)
cortex mcp add --transport sse linear https://mcp.linear.app/sse

# With auth header
cortex mcp add --transport sse private-api https://api.company.com/mcp \
  --header "X-API-Key: your-key-here"
```

### Option 3: Remote HTTP server

```bash
# Basic syntax
cortex mcp add --transport http <name> <url>

# Example: Notion (HTTP)
cortex mcp add --transport http notion https://mcp.notion.com/mcp

# With Bearer token
cortex mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

> Also using other MCP clients?
> The same transports (stdio, SSE, HTTP) apply. Command syntax may differ; consult the client’s documentation. Inside Cortex Code, use its MCP auth flow when prompted.

## Manage servers

```bash
# List configured servers
cortex mcp list

# Show details
cortex mcp get <name>

# Remove a server
cortex mcp remove <name>
```

## Scopes and config

Many clients support local, project, and user scopes for where server config is stored.

- Local: private to you in the current project
- Project: shared via a checked‑in `.mcp.json`
- User: available across projects for your user

> Note
> Some clients support `--scope local|project|user`. Cortex Code follows the repository’s default behavior; use project configuration where you need team‑shared servers.

Example project config (.mcp.json):

```json
{
  "mcpServers": {
    "shared-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

## Authentication

- OAuth 2.0 (remote services): Use your client’s sign‑in flow (e.g., `/mcp` in Cortex Code).
- API keys/tokens: Prefer headers over query params. Rotate and scope least privilege.
- Env vars: Provide with `--env KEY=value` (stdio) or headers (SSE/HTTP).

## Security and reliability

- Treat third‑party servers as untrusted by default; watch for prompt injection.
- Prefer HTTPS, avoid secrets in URLs, and use minimal scopes/permissions (MCP OAuth requires `search.read`, `docs.write`, `memory.read`, `memory.write`, `memory.delete`).
- Cloudflare tunnel health: if no public URL appears, check `cloudflared` and `CLOUDFLARE_*` envs.
- Evidence: archive the Cloudflare tunnel output, ChatGPT transcript, and Cortex MCP logs for every validation run.
- Strict mode: set `CORTEX_MCP_TUNNEL_STRICT=1` to fail fast on tunnel errors.

## Using MCP in Cortex Code (optional)

- Resources: type `@` to attach `@server:protocol://resource/path`.
- Prompts as slash commands: type `/` to discover `/mcp__server__prompt` entries.
- Output limits: Cortex Code warns when tool output >10k tokens; set `MAX_MCP_OUTPUT_TOKENS` to raise.

## Troubleshooting

- No public URL
  - Ensure `cloudflared` is installed and reachable
  - Verify `CLOUDFLARE_TUNNEL_TOKEN`/`CLOUDFLARE_TUNNEL_HOSTNAME` if using named tunnels
  - Check logs for `mcp.tunnel.failed` with reason
- Auth errors
  - Re‑authenticate in client (`/mcp` in Cortex Code)
  - Confirm headers/tokens and scopes
- Large outputs
  - Use pagination/filters on the server
  - Increase client limits where supported

## References

- Model Context Protocol: <https://modelcontextprotocol.io/>
