# MCP 403 Triage Playbook

## Symptoms
- ChatGPT App/Connector returns **403** when calling your MCP endpoint via Cloudflare.

## Fast Checks (10/10 common)
1) **Auth expectation mismatch**
   - Server enforces API-key but App set to “None” → 403.
   - Fix: set App auth to Bearer (or header your server expects) and supply the key.
2) **Header name mismatch**
   - Server expects `Authorization: Bearer ...` but client sends `x-api-key` (or vice-versa).
3) **Host/CORS check**
   - Server restricts `Host`/`Origin`; Cloudflare host not in allowlist.
4) **Path**
   - App calling `/` instead of `/mcp` or wrong method.
5) **Cloudflare policy**
   - Zero-trust policy blocks path or header; check Access/Firewall rules.
6) **HTTPS only**
   - Mixed content or HTTP scheme; ensure Tunnel → HTTPS.
7) **Dev no-auth flag**
   - `NO_AUTH=true` not actually set in running process; container env mismatch.

## Reproduce Locally
```bash
# Expect 401/403 when missing/invalid key
curl -i https://YOUR_DOMAIN/mcp

# Expect 200 with correct key (choose one naming convention)
curl -i -H "Authorization: Bearer $MCP_API_KEY" https://YOUR_DOMAIN/health
# or
curl -i -H "x-api-key: $MCP_API_KEY" https://YOUR_DOMAIN/health
```

## Server Logs to Add
- Log request path, method, `host`, `origin` (if present), auth scheme (not the secret), and decision (allow/deny) with reason code.

## Cloudflare Checklist
- Tunnel healthy; public hostname maps to local port.
- Access/Firewall: allow path `/mcp`, `/sse`, `/health`, `/metrics`.
- No transform rules stripping `Authorization` header.
