# Troubleshooting

| Issue | Resolution |
| --- | --- |
| `UNAVAILABLE: no identity` | Ensure SPIRE agent socket is reachable and workload is registered. |
| Certificate expires early | Check system clock and `CERT_TTL` setting. |
| `emit` rejects event | Confirm schema ID exists in registry and policy allows it. |
| MCP `validation_error` | Inspect the returned `details` array for missing fields or schema violations. |
| MCP `security_error` | Verify subject clearance and resource sensitivity; high-risk operations require privileged roles. |
| MCP `internal_error` | Enable debug logging and capture the correlation ID logged alongside the error for support escalation. |
