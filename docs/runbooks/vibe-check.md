# Vibe Check Oversight Runbook

<!--
maintainer: brAInwav Development Team
last_updated: 2025-10-15
scope: oversight gate execution for agents (human + AI)
-->

The Oversight gate defined in `AGENTS.md` §11 requires every agent – human or
LLM – to call the `vibe_check` MCP tool **after planning and before any
side-effecting action**. This runbook captures the canonical way to satisfy the
requirement, share scripts with developers, and surface the payload shape AI
agents must use.

## 1. Start or reach the Vibe Check MCP server

- Default endpoint: `http://127.0.0.1:2091` (override with
  `VIBE_CHECK_HTTP_URL`).
- Quick start (local):
  ```bash
  npx @pv-bhat/vibe-check-mcp start --http --port 2091
  ```
  The helper automatically exposes `/healthz` and `/mcp`.
- Team bots SHOULD reuse an existing deployment; if the health check fails,
  escalate per the Constitution before bypassing the gate.

## 2. Required metadata

| Field          | Description                                                  | Source                                                    |
| -------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| `goal`         | Short problem statement for the current task                 | Agent plan / task description                             |
| `plan`         | Ordered steps the agent intends to follow                    | Planning output (use numbered list)                       |
| `sessionId`    | Stable identifier for the execution session                  | Env var `VIBE_CHECK_SESSION_ID`, task slug, or UUID       |
| `Accept` header| MUST include `application/json, text/event-stream`           | HTTP client configuration                                 |

Logs and errors MUST include the marker `brAInwav-vibe-check` to satisfy audit
checks.

## 3. JSON-RPC payload for agents / LLM hosts

Agents call the MCP endpoint via JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": "<unique-id>",
  "method": "tools/call",
  "params": {
    "name": "vibe_check",
    "arguments": {
      "goal": "Document vibe_check usage",
      "plan": "1. Review docs. 2. Update instructions. 3. Attach evidence.",
      "sessionId": "codex-session-2025-10-15"
    }
  }
}
```

Example `curl` invocation (works for both humans and hosted LLM agents):

```bash
curl -sS \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -X POST "${VIBE_CHECK_HTTP_URL:-http://127.0.0.1:2091}/mcp" \
  --data @payload.json > vibe-check-response.json
```

- The response contains `result.questions`, `result.risk`, and `result.notes`.
- Store the JSON with your task artifacts and reference it in PR descriptions or
  audit logs.

## 4. Developer helper script

A CLI wrapper lives at `scripts/oversight/vibe-check-call.mjs` and can be run via
`pnpm`:

```bash
pnpm oversight:vibe-check --goal "Document vibe_check usage" \
  --plan "1. Review docs. 2. Update instructions. 3. Attach evidence." \
  --session codex-session-2025-10-15 --save logs/vibe-check/latest.json
```

Key options:

- `--goal <text>` (required) – task goal.
- `--plan <text>` or `--plan-file <path>` – execution plan. Use `--plan -` to
  read from STDIN.
- `--session <id>` – overrides session identifier (defaults to
  `VIBE_CHECK_SESSION_ID` or a generated UUID).
- `--id <jsonrpc-id>` – optional custom request ID.
- `--save <path>` – writes the raw response to disk; parent directories are
  created automatically.
- `--json` – emit compact JSON (pretty output is default).

The script automatically sets the required headers, emits a
`brAInwav-vibe-check` log line, and exits non-zero if the oversight call fails.

## 5. Evidence checklist

1. Capture the response JSON (store in `logs/` or attach to the PR).
2. Record the command in your task notes along with timestamp + session ID.
3. Include the `brAInwav-vibe-check` log or response snippet in the PR
   description / review evidence bundle as required by `/.cortex/rules/`.

## 6. Troubleshooting

- **406 Not Acceptable** – ensure the `Accept` header includes
  `application/json, text/event-stream` (comma separated).
- **404 Not Found** – confirm you are POSTing to `/mcp` (JSON-RPC entry point),
  not `/tools/call`.
- **ECONNREFUSED / timeout** – start the MCP server locally or verify the
  remote deployment. Failing to obtain oversight requires Constitution-level
  escalation before proceeding.
- **200 OK but empty result** – verify the server is patched with the Cortex-OS
  overrides (`scripts/vibe-check/apply-local-patch.sh`).

> **Reminder:** Oversight calls are mandatory. If the gate cannot run, request a
> waiver under `/.cortex/waivers/` before continuing.
