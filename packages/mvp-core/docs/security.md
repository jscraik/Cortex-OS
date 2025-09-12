# Security

- Store tokens in a secrets manager, not in source control.
- All transport should use HTTPS.
- Disable command execution in production with `MVP_CORE_DISABLE_EXEC=true`.
