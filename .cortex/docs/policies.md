# Policy Configuration

The ASBR-lite runtime enforces governance via a policy router. Policies are configured via YAML files under your Cortex-OS config directory.

## Locations

- Default config home: `~/.config/cortex-os/`
- Test/ephemeral override: `$CORTEX_OS_TMP/config`

## Files

- `policies.yaml` — high-level enable/disable and parameters
- `mcp-allowlist.yaml` — list of allowed MCP tools/endpoints

## Example: `policies.yaml`

```yaml
version: 1
policies:
  mcp-sandbox:
    enabled: true
    deny:
      - exec:* # deny process execution by default
  artifact-guard:
    enabled: true
    maxSizeBytes: 10485760 # 10MB
```

## Example: `mcp-allowlist.yaml`

```yaml
- provider: github
  tools:
    - search
    - get_file
- provider: web
  tools:
    - fetch
```

## Operational Notes

- Changes can be hot-reloaded by the runtime (subject to implementation).
- Invalid YAML should fail fast and surface a structured error (code, message).
- When a policy blocks an action, the API responds with `403` and an audit event is emitted.

## Next Steps

- Integrate policy checks in task creation and MCP tool execution paths.
- Extend docs with per-policy schemas as the router evolves.
