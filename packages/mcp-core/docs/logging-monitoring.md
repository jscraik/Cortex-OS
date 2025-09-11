# Logging & Monitoring

`mcp-core` is transport agnostic and leaves logging to the host application.

- Wrap `callTool` to record request/response metadata.
- Integrate with tools like pino or Winston.
- For HTTP transports, inspect status codes and timings.
