# Security

- Use HTTPS in production and configure `--ssl-keyfile` and `--ssl-certfile` with `mcp-server`.
- Tokens issued by the auth subsystem must be stored securely and rotated regularly.
- Avoid running plugins from untrusted sources.
- Enable `OPENTELEMETRY_EXPORTER_OTLP_HEADERS` for encrypted telemetry transport.
