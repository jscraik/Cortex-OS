# Vibe Check Oversight Gate — Cortex-OS Governance

**Status:** Authoritative  
**Scope:** All human and AI agent executions (planning → action)  
**Inheritance:** Governance Pack (`/.cortex/rules/*`), `/.cortex/rules/agentic-coding-workflow.md`, `CODESTYLE.md`

---

## 1. Purpose

The Vibe Check MCP gate provides mandatory human-in-the-loop oversight before any agent runs side-effecting actions. Every task **must** capture a successful oversight exchange after planning and **before** file writes, network calls, or long-running executions. Missing or stale evidence blocks review and CI merge.

---

## 2. When to Run

- Trigger immediately after the plan (`implementation-plan.md`) is drafted and before touching the working tree, calling external services, or launching long jobs.
- Re-run if the plan changes materially, a new session starts, or more than one build/reset cadence passes without execution.
- Tier escalation: Tier 2 (feature) tasks require a new vibe check per arc; Tier 1 and Tier 3 may reuse the most recent response if still within the active session window (≤ 50 minutes) and no plan deltas exist.

---

## 3. Invocation Requirements

### 3.1 CLI Shortcut

```bash
pnpm oversight:vibe-check --goal "<task summary>" --plan "<ordered steps>" --session <session-id> \
  --save logs/vibe-check/<slug>.json
```

- `--goal` — concise task objective (≤ 140 chars).
- `--plan` — ordered steps (≤ 7, numbered). Use `--plan-file` to stream from disk.
- `--session` — stable identifier (task slug + timestamp is recommended).
- `--save` — required; stores canonical JSON under `logs/vibe-check/`.
- The script automatically sets `Accept: application/json, text/event-stream` and emits the `brAInwav-vibe-check` log marker.

### 3.2 JSON-RPC Fallback

POST to `${VIBE_CHECK_HTTP_URL:-http://127.0.0.1:2091}/mcp` with:

```json
{
  "jsonrpc": "2.0",
  "id": "<uuid>",
  "method": "tools/call",
  "params": {
    "name": "vibe_check",
    "arguments": {
      "goal": "<task summary>",
      "plan": "1. Step one. 2. Step two.",
      "sessionId": "<session-id>"
    }
  }
}
```

- Include headers: `Content-Type: application/json` and `Accept: application/json, text/event-stream`.
- Save the raw response to `logs/vibe-check/<slug>.json` (pretty or compact JSON allowed).

---

## 4. Evidence Package (merge gate)

To satisfy CI and review:

1. Commit the JSON response at `logs/vibe-check/<slug>.json` inside the task folder.
2. Record the command (or HTTP POST) with timestamp and session ID in `~/tasks/<slug>/notes.md` or `decisions.md`.
3. Reference the artifact in the PR description and attach the same path in review evidence (Code Review Checklist).
4. Ensure all oversight-related logs contain `[brAInwav]` and `brand:"brAInwav"` for audit search.

Failure to meet any item keeps the PR in a blocked state (`agents-guard` job).

---

## 5. Error Handling and Escalation

- **Server unreachable / health check fails:** stop work, mark the task blocked, and escalate per the Constitution. Do **not** bypass the gate without a formally recorded waiver under `/.cortex/waivers/`.
- **HTTP 406 or schema errors:** verify headers and ensure the plan contains numbered steps ≤ 7. Correct and retry.
- **Timeouts:** retry once after confirming server health; repeated timeouts require escalation.
- **Session resets:** if a `pnpm session:reset` run occurs, perform a new vibe check before resuming implementation.

---

## 6. Related Resources

- Runbook with troubleshooting scripts: `docs/runbooks/vibe-check.md`
- Governance reference: `/.cortex/rules/agentic-coding-workflow.md` §0.1 and §G5
- CLI helper source: `scripts/oversight/vibe-check-call.mjs`
- Oversight evidence index: `.cortex/audit/`

---
