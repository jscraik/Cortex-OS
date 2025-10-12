# Vibe Check MCP Local Overrides

This folder stores the curated CLI/runtime overrides required by Cortex-OS to
keep `vibe-check-mcp` aligned with the hybrid model policy. After reinstalling
`@pv-bhat/vibe-check-mcp`, run:

```bash
scripts/vibe-check/apply-local-patch.sh
```

The script copies the patched `cli/index.js` and `utils/llm.js` versions from
`scripts/vibe-check/overrides/` into the global npm installation, creating a
Timestamped backup of the previous files.

## Local Memory enforcement helper

Use `pnpm enforce:agents:local-memory` (wrapper around
`scripts/vibe-check/enforce-local-memory.sh`) before editing any `AGENTS.md`
files. The helper:

- boots the MCP server on `VIBE_CHECK_HTTP_URL` if it is not already running;
- calls `vibe_check` with the current plan to capture the required
  `brAInwav-vibe-check` audit log; and
- rewrites each `AGENTS.md` to the canonical Local Memory section before
  re-validating.

Oversight responses are streamed to stdout, and the raw JSON is saved to
`/tmp/vibe-check-response.log`. If the server launcher fails, inspect
`/tmp/vibe-check-start.log` and verify `VIBE_CHECK_HTTP_URL` points to the
expected address.

### CI / check mode

Set `ENFORCE_AGENTS_LOCAL_MEMORY_MODE=check` to run the helper in verification-only
mode (no rewrites, no MCP startup). CI scripts use:

```bash
ENFORCE_AGENTS_LOCAL_MEMORY_MODE=check pnpm enforce:agents:local-memory
```

Failures indicate at least one `AGENTS.md` diverged from the canonical Local
Memory block—developers should run the script without the `check` mode locally
and commit the regenerated sections along with the logged `brAInwav-vibe-check`
response.
